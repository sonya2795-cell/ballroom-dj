require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const admin = require("firebase-admin");
const multer = require("multer");

const {
  parseTimeValueToMilliseconds,
  extractCrashMetadata,
  buildCrashUpdateFromPayload,
} = require("./crashUtils");
const { sendFeedbackEmail } = require("./email/sendFeedbackEmail");
const { sendVerificationEmail } = require("./email/sendVerificationEmail");

const app = express();
const PORT = process.env.PORT || 3000;
const rawClientOrigins = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = rawClientOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = "ballroom_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 10; // 10 minutes
const VERIFICATION_SESSION_TTL_MS = 1000 * 60 * 10; // 10 minutes
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 1000 * 60; // 60 seconds
const PASSWORD_MIN_LENGTH = 6;
const DEFAULT_FEEDBACK_MAX_FILES = 3;
const DEFAULT_FEEDBACK_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const FEEDBACK_DESCRIPTION_MAX_LENGTH = 2000;
const FEEDBACK_ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_VERIFICATION_COLLECTION = "emailVerificationTokens";
const EMAIL_VERIFICATION_REQUESTS_COLLECTION = "emailVerificationRequests";
const EMAIL_VERIFICATION_SESSIONS_COLLECTION = "emailVerificationSessions";

const resolvedFeedbackMaxFiles = Number(process.env.FEEDBACK_MAX_ATTACHMENTS);
const FEEDBACK_MAX_ATTACHMENTS =
  Number.isFinite(resolvedFeedbackMaxFiles) && resolvedFeedbackMaxFiles > 0
    ? resolvedFeedbackMaxFiles
    : DEFAULT_FEEDBACK_MAX_FILES;

const resolvedFeedbackMaxBytes = Number(process.env.FEEDBACK_MAX_FILE_BYTES);
const FEEDBACK_MAX_FILE_BYTES =
  Number.isFinite(resolvedFeedbackMaxBytes) && resolvedFeedbackMaxBytes > 0
    ? resolvedFeedbackMaxBytes
    : DEFAULT_FEEDBACK_MAX_FILE_SIZE_BYTES;

const FEEDBACK_MAX_FILE_SIZE_LABEL =
  FEEDBACK_MAX_FILE_BYTES >= 1024 * 1024
    ? `${Math.round(FEEDBACK_MAX_FILE_BYTES / (1024 * 1024))}MB`
    : `${Math.round(FEEDBACK_MAX_FILE_BYTES / 1024)}KB`;

const feedbackUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FEEDBACK_MAX_FILE_BYTES,
    files: FEEDBACK_MAX_ATTACHMENTS,
  },
});

function feedbackUploadMiddleware(req, res, next) {
  feedbackUpload.array("screenshots", FEEDBACK_MAX_ATTACHMENTS)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ error: `Each screenshot must be smaller than ${FEEDBACK_MAX_FILE_SIZE_LABEL}.` });
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        res
          .status(400)
          .json({ error: `You can upload up to ${FEEDBACK_MAX_ATTACHMENTS} screenshots.` });
        return;
      }
      res
        .status(400)
        .json({ error: "We couldn’t process those files. Try uploading fewer screenshots." });
      return;
    }
    next();
  });
}

// Enable CORS (allow frontend to connect)
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : rawClientOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// --- Firebase Admin Setup ---
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "ballroom-dj.firebasestorage.app",
});

const bucket = admin.storage().bucket();
const firestore = admin.firestore();
const SONGS_COLLECTION = "songs";

async function listSongDocuments() {
  const snapshot = await firestore.collection(SONGS_COLLECTION).get();
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() ?? {};
    const storagePathRaw = typeof data.storagePath === "string" ? data.storagePath : "";
    const storagePath = storagePathRaw.replace(/^\/+/, "");
    const pathSegments = storagePath.split("/");
    const baseFolder = pathSegments[0] ?? null;
    const danceFolder = pathSegments[1] ?? null;

    let styleId = null;
    let danceId = null;

    if (baseFolder && danceFolder) {
      for (const [candidateStyleId, config] of Object.entries(STYLE_CONFIG)) {
        if (config.baseFolder === baseFolder) {
          const match = config.dances.find((dance) => dance.folder === danceFolder);
          if (match) {
            styleId = candidateStyleId;
            danceId = match.folder;
          }
          break;
        }
      }
    }

    const crashMetadata = extractCrashMetadata(
      data,
      data.metadata,
      data.customMetadata,
      data.crashes
    );

    return {
      id: docSnapshot.id,
      storagePath,
      title: typeof data.title === "string" ? data.title : "",
      artist: typeof data.artist === "string" ? data.artist : "",
      bpm: typeof data.bpm === "number" ? data.bpm : null,
      startMs: typeof data.startMs === "number" ? data.startMs : null,
      endMs: typeof data.endMs === "number" ? data.endMs : null,
      durationMs: typeof data.durationMs === "number" ? data.durationMs : null,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
      styleId,
      danceId,
      crash1Ms: crashMetadata.crash1Ms,
      crash2Ms: crashMetadata.crash2Ms,
      crash3Ms: crashMetadata.crash3Ms,
    };
  });
}

async function generateSignedUrl(storagePath) {
  if (!storagePath) return null;
  const normalized = storagePath.replace(/^\/+/, "");
  const file = bucket.file(normalized);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "03-01-2030",
  });
  return url;
}

async function buildSongResponse(song) {
  if (!song?.storagePath) return null;
  try {
    const url = await generateSignedUrl(song.storagePath);
    if (!url) return null;
    const crashMetadata = extractCrashMetadata(
      song,
      song.metadata,
      song.customMetadata,
      song.crashes
    );
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      bpm: song.bpm,
      startMs: song.startMs,
      endMs: song.endMs,
      durationMs: song.durationMs,
      storagePath: song.storagePath,
      filename: song.storagePath.split("/").pop() || song.storagePath,
      url,
      styleId: song.styleId,
      danceId: song.danceId,
      crash1Ms: crashMetadata.crash1Ms,
      crash2Ms: crashMetadata.crash2Ms,
      crash3Ms: crashMetadata.crash3Ms,
    };
  } catch (err) {
    console.error("Failed to sign song URL", song?.storagePath, err);
    return null;
  }
}

function selectRandomItem(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

function toNumberOrNull(value) {
  if (value === null || typeof value === "undefined") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function listAllUsersForStats() {
  let totalUsers = 0;
  let adminUsers = 0;
  let usersWithEmail = 0;
  let pageToken;

  do {
    const batch = await admin.auth().listUsers(1000, pageToken);
    batch.users.forEach((userRecord) => {
      totalUsers += 1;
      if (userRecord.email) {
        usersWithEmail += 1;
      }
      if (userRecord.customClaims?.role === "admin") {
        adminUsers += 1;
      }
    });
    pageToken = batch.pageToken;
  } while (pageToken);

  return { totalUsers, adminUsers, usersWithEmail };
}

async function buildLibraryStats() {
  const [files] = await bucket.getFiles();
  const mp3Files = files.filter((file) => file.name.toLowerCase().endsWith(".mp3"));
  const styleCounts = {};
  const styleDanceCounts = {};

  mp3Files.forEach((file) => {
    const pathSegments = file.name.split("/");
    const baseFolder = pathSegments[0] ?? "";
    const danceFolder = pathSegments[1] ?? "";
    let styleId = null;
    let danceLabel = null;

    for (const [candidateStyleId, config] of Object.entries(STYLE_CONFIG)) {
      if (config.baseFolder.toLowerCase() === baseFolder.toLowerCase()) {
        styleId = candidateStyleId;
        const danceMatch = config.dances.find(
          (dance) => dance.folder.toLowerCase() === danceFolder.toLowerCase()
        );
        danceLabel = danceMatch?.label ?? null;
        break;
      }
    }

    const styleLabel = STYLE_LABELS[styleId] || "Unknown";
    styleCounts[styleLabel] = (styleCounts[styleLabel] || 0) + 1;
    if (!styleDanceCounts[styleLabel]) {
      styleDanceCounts[styleLabel] = {};
    }

    const resolvedDanceLabel =
      danceLabel ||
      (danceFolder
        ? danceFolder.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")
        : "Unknown");
    styleDanceCounts[styleLabel][resolvedDanceLabel] =
      (styleDanceCounts[styleLabel][resolvedDanceLabel] || 0) + 1;
  });

  return {
    totalSongs: mp3Files.length,
    styles: styleCounts,
    styleDances: styleDanceCounts,
  };
}

function sanitizeString(value, maxLength = 300) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function mapSongSnapshot(doc) {
  if (!doc.exists) return null;
  const data = doc.data() ?? {};
  const crashMetadata = extractCrashMetadata(
    data,
    data.metadata,
    data.customMetadata,
    data.crashes
  );
  return {
    id: doc.id,
    storagePath: data.storagePath ?? null,
    title: data.title ?? "",
    artist: data.artist ?? "",
    bpm: typeof data.bpm === "number" ? data.bpm : null,
    startMs: typeof data.startMs === "number" ? data.startMs : null,
    endMs: typeof data.endMs === "number" ? data.endMs : null,
    durationMs: typeof data.durationMs === "number" ? data.durationMs : null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    crash1Ms: crashMetadata.crash1Ms,
    crash2Ms: crashMetadata.crash2Ms,
    crash3Ms: crashMetadata.crash3Ms,
  };
}

async function fallbackSongFromStorage(baseFolder, danceFolder) {
  const prefix = `${baseFolder}/${danceFolder}`.replace(/\/+$/, "");
  const [files] = await bucket.getFiles({ prefix: `${prefix}/` });
  const mp3Files = files.filter((file) => file.name.toLowerCase().endsWith(".mp3"));
  if (mp3Files.length === 0) return null;
  const candidate = selectRandomItem(mp3Files);
  if (!candidate) return null;

  let fileMetadata = candidate.metadata;
  if (!fileMetadata || Object.keys(fileMetadata).length === 0) {
    try {
      const [fetched] = await candidate.getMetadata();
      fileMetadata = fetched ?? {};
    } catch (err) {
      console.warn("Unable to load storage metadata for crash parsing", candidate.name, err);
      fileMetadata = {};
    }
  }

  const customMetadata =
    fileMetadata?.metadata ??
    fileMetadata?.customMetadata ??
    candidate.metadata?.metadata ??
    candidate.metadata?.customMetadata ??
    {};

  const crashMetadata = extractCrashMetadata(customMetadata, fileMetadata, candidate.metadata);

  const [url] = await candidate.getSignedUrl({
    action: "read",
    expires: "03-01-2030",
  });

  const filename = candidate.name.split("/").pop() || candidate.name;

  return {
    id: null,
    title: filename,
    artist: "",
    bpm: null,
    startMs: null,
    endMs: null,
    durationMs: null,
    storagePath: candidate.name,
    filename,
    url,
    styleId: null,
    danceId: null,
    crash1Ms: crashMetadata.crash1Ms,
    crash2Ms: crashMetadata.crash2Ms,
    crash3Ms: crashMetadata.crash3Ms,
  };
}

const STYLE_CONFIG = {
  ballroom: {
    baseFolder: "Ballroom",
    dances: [
      { folder: "Waltz", label: "Waltz" },
      { folder: "Tango", label: "Tango" },
      { folder: "VienneseWaltz", label: "Viennese Waltz" },
      { folder: "Foxtrot", label: "Foxtrot" },
      { folder: "Quickstep", label: "Quickstep" },
    ],
  },
  latin: {
    baseFolder: "Latin",
    dances: [
      { folder: "ChaCha", label: "Cha Cha" },
      { folder: "Samba", label: "Samba" },
      { folder: "Rumba", label: "Rumba" },
      { folder: "Paso", label: "Paso Doble" },
      { folder: "Jive", label: "Jive" },
    ],
  },
  rhythm: {
    baseFolder: "Rhythm",
    dances: [
      { folder: "ChaCha", label: "Cha Cha" },
      { folder: "Rumba", label: "Rumba" },
      { folder: "EastCoastSwing", label: "Swing" },
      { folder: "Bolero", label: "Bolero" },
      { folder: "Mambo", label: "Mambo" },
    ],
  },
  smooth: {
    baseFolder: "Smooth",
    dances: [
      { folder: "Waltz", label: "Waltz" },
      { folder: "Tango", label: "Tango" },
      { folder: "Foxtrot", label: "Foxtrot" },
      { folder: "VienneseWaltz", label: "Viennese Waltz" },
    ],
  },
};

const STYLE_LABELS = {
  ballroom: "Standard",
  latin: "Latin",
  rhythm: "Rhythm",
  smooth: "Smooth",
};

function resolveStyleAndDance(styleKeyRaw, danceKeyRaw) {
  if (typeof styleKeyRaw !== "string" || typeof danceKeyRaw !== "string") {
    return null;
  }

  const styleKey = styleKeyRaw.toLowerCase();
  const danceKey = danceKeyRaw.toLowerCase();
  const styleConfig = STYLE_CONFIG[styleKey];

  if (!styleConfig) {
    return null;
  }

  const danceConfig = styleConfig.dances.find((dance) => dance.folder.toLowerCase() === danceKey);

  if (!danceConfig) {
    return null;
  }

  return { styleKey, styleConfig, danceConfig };
}

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

const defaultAppOrigin = allowedOrigins[0] || "http://localhost:5173";
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL?.trim() || defaultAppOrigin;
const PUBLIC_API_URL =
  process.env.PUBLIC_API_URL?.trim() || `http://localhost:${PORT}`;

const cookieOptionsWithAge = {
  ...baseCookieOptions,
  maxAge: SESSION_MAX_AGE_MS,
};

function formatUserRecord(userRecord) {
  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName,
    photoURL: userRecord.photoURL,
    emailVerified: userRecord.emailVerified,
    creationTime: userRecord.metadata?.creationTime ?? null,
    lastSignInTime: userRecord.metadata?.lastSignInTime ?? null,
    customClaims: userRecord.customClaims || {},
    providers: userRecord.providerData.map((provider) => provider.providerId),
  };
}

function sanitizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function timingSafeEquals(a, b) {
  const aBuf = Buffer.from(a || "");
  const bBuf = Buffer.from(b || "");
  if (aBuf.length !== bBuf.length) {
    const max = Math.max(aBuf.length, bBuf.length);
    const paddedA = Buffer.alloc(max);
    const paddedB = Buffer.alloc(max);
    aBuf.copy(paddedA);
    bBuf.copy(paddedB);
    crypto.timingSafeEqual(paddedA, paddedB);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "";
}

function buildVerificationRedirect(pathname, queryParams) {
  const base = PUBLIC_APP_URL.replace(/\/+$/, "");
  const url = new URL(`${base}/${pathname.replace(/^\/+/, "")}`);
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && typeof value !== "undefined") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function getOptionalSessionUser(req) {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie);
    const userRecord = await admin.auth().getUser(decoded.uid);
    return formatUserRecord(userRecord);
  } catch (err) {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    console.error("Failed to verify session cookie", err);
    res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions);
    res.status(401).json({ error: "Unauthorized" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.firebaseUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.firebaseUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}

app.post("/auth/session", async (req, res) => {
  const { idToken } = req.body || {};

  if (!idToken) {
    res.status(400).json({ error: "Missing idToken" });
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    const userRecord = await admin.auth().getUser(decodedIdToken.uid);

    res.cookie(SESSION_COOKIE_NAME, sessionCookie, cookieOptionsWithAge);
    res.json({ authenticated: true, user: formatUserRecord(userRecord) });
  } catch (err) {
    console.error("Error creating session cookie", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.post("/auth/email/start", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const emailHash = hashToken(email);
  const requestRef = firestore
    .collection(EMAIL_VERIFICATION_REQUESTS_COLLECTION)
    .doc(emailHash);
  const ipAddress = getRequestIp(req);
  const userAgent = sanitizeString(req.headers["user-agent"], 300);

  let canSend = true;

  try {
    await firestore.runTransaction(async (tx) => {
      const snapshot = await tx.get(requestRef);
      const nowMs = Date.now();
      const lastSentAt = snapshot.exists
        ? snapshot.data()?.lastSentAt?.toMillis?.() ?? null
        : null;

      if (lastSentAt && nowMs - lastSentAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
        canSend = false;
      }

      const updatePayload = {
        email,
        emailHash,
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        lastIp: ipAddress || null,
        lastUserAgent: userAgent || null,
        attemptCount: admin.firestore.FieldValue.increment(1),
      };

      if (canSend) {
        updatePayload.lastSentAt = admin.firestore.FieldValue.serverTimestamp();
        updatePayload.sentCount = admin.firestore.FieldValue.increment(1);
      }

      tx.set(requestRef, updatePayload, { merge: true });
    });
  } catch (err) {
    console.error("Failed to track email verification request", err);
  }

  if (!canSend) {
    res.json({ ok: true });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
  );
  const verificationRef = firestore
    .collection(EMAIL_VERIFICATION_COLLECTION)
    .doc(tokenHash);

  await verificationRef.set({
    tokenHash,
    email,
    emailHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    consumedAt: null,
    lastAttemptAt: null,
    failCount: 0,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  const apiBase = PUBLIC_API_URL.replace(/\/+$/, "");
  const verifyLink = `${apiBase}/auth/email/verify?token=${encodeURIComponent(rawToken)}`;

  try {
    await sendVerificationEmail({
      to: email,
      verifyLink,
      token: rawToken,
    });
  } catch (err) {
    console.error("Failed to send verification email", err);
    await verificationRef.delete();
    res.status(500).json({ error: "Unable to send verification email." });
    return;
  }

  res.json({ ok: true });
});

async function createVerificationSession({ email, emailHash, tokenHash, req }) {
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const sessionHash = hashToken(sessionToken);
  const sessionRef = firestore
    .collection(EMAIL_VERIFICATION_SESSIONS_COLLECTION)
    .doc(sessionHash);
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + VERIFICATION_SESSION_TTL_MS)
  );

  await sessionRef.set({
    sessionHash,
    email,
    emailHash,
    verificationTokenHash: tokenHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    consumedAt: null,
    ipAddress: getRequestIp(req) || null,
    userAgent: sanitizeString(req.headers["user-agent"], 300),
  });

  return sessionToken;
}

async function consumeVerificationToken({ rawToken, req }) {
  if (!rawToken) {
    return { ok: false, error: "invalid" };
  }

  const tokenHash = hashToken(rawToken);
  const tokenRef = firestore.collection(EMAIL_VERIFICATION_COLLECTION).doc(tokenHash);
  const snapshot = await tokenRef.get();

  if (!snapshot.exists) {
    return { ok: false, error: "invalid" };
  }

  const data = snapshot.data() || {};
  const storedHash = data.tokenHash || "";
  if (!timingSafeEquals(tokenHash, storedHash)) {
    return { ok: false, error: "invalid" };
  }

  const nowMs = Date.now();
  const expiresAtMs = data.expiresAt?.toMillis?.() ?? null;
  const consumedAtMs = data.consumedAt?.toMillis?.() ?? null;

  if (consumedAtMs) {
    await tokenRef.set(
      {
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        failCount: admin.firestore.FieldValue.increment(1),
      },
      { merge: true }
    );
    return { ok: false, error: "used" };
  }

  if (expiresAtMs && nowMs > expiresAtMs) {
    await tokenRef.set(
      {
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        failCount: admin.firestore.FieldValue.increment(1),
      },
      { merge: true }
    );
    return { ok: false, error: "expired" };
  }

  const email = data.email || "";
  const emailHash = data.emailHash || "";

  await tokenRef.set(
    {
      consumedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    await admin.auth().getUserByEmail(email);
    return { ok: false, error: "exists" };
  } catch (err) {
    if (err?.code !== "auth/user-not-found") {
      console.error("Failed to check existing user", err);
      return { ok: false, error: "server" };
    }
  }

  const sessionToken = await createVerificationSession({
    email,
    emailHash,
    tokenHash,
    req,
  });

  return { ok: true, sessionToken };
}

app.get("/auth/email/verify", async (req, res) => {
  const rawToken = typeof req.query.token === "string" ? req.query.token : "";

  try {
    const result = await consumeVerificationToken({ rawToken, req });
    if (!result.ok) {
      const error = result.error === "server" ? "error" : result.error;
      const redirectUrl = buildVerificationRedirect("verify", { error });
      res.redirect(302, redirectUrl);
      return;
    }

    const redirectUrl = buildVerificationRedirect("set-password", {
      vs: result.sessionToken,
    });
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error("Failed to verify email token", err);
    const redirectUrl = buildVerificationRedirect("verify", { error: "error" });
    res.redirect(302, redirectUrl);
  }
});

app.post("/auth/email/verify", async (req, res) => {
  const rawToken = sanitizeText(req.body?.token);
  try {
    const result = await consumeVerificationToken({ rawToken, req });
    if (!result.ok) {
      const status = result.error === "expired" ? 410 : 400;
      res.status(status).json({ error: result.error });
      return;
    }

    res.json({ verificationSessionToken: result.sessionToken });
  } catch (err) {
    console.error("Failed to verify email token", err);
    res.status(500).json({ error: "server" });
  }
});

app.post("/auth/email/complete", async (req, res) => {
  const sessionToken = sanitizeText(req.body?.verificationSessionToken);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const firstName = sanitizeText(req.body?.firstName);
  const lastName = sanitizeText(req.body?.lastName);

  if (!sessionToken) {
    res.status(400).json({ error: "Missing verification session token." });
    return;
  }

  if (!firstName || !lastName) {
    res.status(400).json({ error: "First and last name are required." });
    return;
  }

  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    res.status(400).json({
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
    return;
  }

  const sessionHash = hashToken(sessionToken);
  const sessionRef = firestore
    .collection(EMAIL_VERIFICATION_SESSIONS_COLLECTION)
    .doc(sessionHash);

  const snapshot = await sessionRef.get();
  if (!snapshot.exists) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  const data = snapshot.data() || {};
  if (!timingSafeEquals(sessionHash, data.sessionHash || "")) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  const nowMs = Date.now();
  const expiresAtMs = data.expiresAt?.toMillis?.() ?? null;
  const consumedAtMs = data.consumedAt?.toMillis?.() ?? null;

  if (consumedAtMs) {
    res.status(400).json({ error: "used" });
    return;
  }

  if (expiresAtMs && nowMs > expiresAtMs) {
    res.status(410).json({ error: "expired" });
    return;
  }

  const email = data.email || "";
  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "invalid" });
    return;
  }

  try {
    await admin.auth().getUserByEmail(email);
    res.status(409).json({ error: "exists" });
    return;
  } catch (err) {
    if (err?.code !== "auth/user-not-found") {
      console.error("Failed to check existing user during signup", err);
      res.status(500).json({ error: "server" });
      return;
    }
  }

  try {
    const displayName = `${firstName} ${lastName}`.trim();
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true,
      displayName,
    });
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    await sessionRef.set(
      {
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const requestRef = firestore
      .collection(EMAIL_VERIFICATION_REQUESTS_COLLECTION)
      .doc(hashToken(email));
    await requestRef.set(
      { lastSuccessAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    res.json({ customToken });
  } catch (err) {
    console.error("Failed to create user from verification", err);
    if (err?.code === "auth/email-already-exists") {
      res.status(409).json({ error: "exists" });
      return;
    }
    res.status(500).json({ error: "server" });
  }
});

app.get("/auth/session", async (req, res) => {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    res.status(401).json({ authenticated: false });
    return;
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie);
    const userRecord = await admin.auth().getUser(decoded.uid);

    res.json({ authenticated: true, user: formatUserRecord(userRecord) });
  } catch (err) {
    console.error("Error verifying session cookie", err);
    res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions);
    res.status(401).json({ authenticated: false });
  }
});

app.delete("/auth/session", async (req, res) => {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];

  if (sessionCookie) {
    try {
      const decoded = await admin.auth().verifySessionCookie(sessionCookie);
      await admin.auth().revokeRefreshTokens(decoded.uid);
    } catch (err) {
      console.error("Error revoking session", err);
    }
  }

  res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions);
  res.status(204).end();
});

app.post("/api/auth/error", (req, res) => {
  const payload = req.body || {};
  const entry = {
    timestamp: new Date().toISOString(),
    provider: sanitizeString(payload.provider, 40),
    errorCode: sanitizeString(payload.errorCode, 120),
    errorName: sanitizeString(payload.errorName, 120),
    errorMessage: sanitizeString(payload.errorMessage, 500),
    location: sanitizeString(payload.location, 200),
    path: sanitizeString(payload.path, 200),
    userAgent: sanitizeString(payload.userAgent, 400),
    cookieEnabled: typeof payload.cookieEnabled === "boolean" ? payload.cookieEnabled : null,
    sessionStorageAvailable:
      typeof payload.sessionStorageAvailable === "boolean"
        ? payload.sessionStorageAvailable
        : null,
  };
  console.warn("[auth-error]", entry);
  res.status(204).end();
});

// --- ROUTES ---

// Test route for root
app.get("/", (req, res) => {
  res.send("Ballroom DJ backend is running 🎶");
});

// Test JSON route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend 👋" });
});

app.get("/api/round", async (req, res) => {
  try {
    const requestedStyle = (req.query.style || "ballroom").toLowerCase();
    const config = STYLE_CONFIG[requestedStyle];

    if (!config) {
      res
        .status(400)
        .json({ error: `Unsupported style '${req.query.style ?? ""}'` });
      return;
    }
    let songs = [];
    try {
      songs = await listSongDocuments();
    } catch (firestoreError) {
      console.error("Failed to list songs from Firestore", firestoreError);
      songs = [];
    }

    const round = await Promise.all(
      config.dances.map(async ({ folder, label }) => {
        const matchingSongs = songs.filter(
          (song) => song.styleId === requestedStyle && song.danceId === folder
        );

        let track = null;

        if (matchingSongs.length > 0) {
          const selected = selectRandomItem(matchingSongs);
          track = await buildSongResponse(selected);
        }

        if (!track) {
          track = await fallbackSongFromStorage(config.baseFolder, folder);
        }

        return {
          dance: label,
          danceId: folder,
          file: track?.url ?? null,
          songId: track?.id ?? null,
          title: track?.title ?? null,
          artist: track?.artist ?? null,
          bpm: track?.bpm ?? null,
          startMs: track?.startMs ?? null,
          endMs: track?.endMs ?? null,
          durationMs: track?.durationMs ?? null,
          storagePath: track?.storagePath ?? null,
          filename: track?.filename ?? null,
          crash1Ms: track?.crash1Ms ?? null,
          crash2Ms: track?.crash2Ms ?? null,
          crash3Ms: track?.crash3Ms ?? null,
        };
      })
    );

    res.json(round);
  } catch (err) {
    console.error("❌ Error generating round:", err);
    res.status(500).json({ error: "Failed to generate round" });
  }
});

app.get("/api/round/replacement", async (req, res) => {
  try {
    const requestedStyle = (req.query.style || "ballroom").toLowerCase();
    const danceId = typeof req.query.dance === "string" ? req.query.dance : "";
    const minDurationMs = Number(req.query.minDurationMs);
    const excludeId = typeof req.query.excludeId === "string" ? req.query.excludeId : null;
    const excludeStoragePath =
      typeof req.query.excludeStoragePath === "string" ? req.query.excludeStoragePath : null;
    const excludeIds = typeof req.query.excludeIds === "string"
      ? req.query.excludeIds.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const excludeStoragePaths = typeof req.query.excludeStoragePaths === "string"
      ? req.query.excludeStoragePaths.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const config = STYLE_CONFIG[requestedStyle];

    if (!config) {
      res
        .status(400)
        .json({ error: `Unsupported style '${req.query.style ?? ""}'` });
      return;
    }

    const danceConfig = config.dances.find((dance) => dance.folder === danceId);
    if (!danceConfig) {
      res.status(400).json({ error: `Unsupported dance '${danceId}'` });
      return;
    }

    let songs = [];
    try {
      songs = await listSongDocuments();
    } catch (firestoreError) {
      console.error("Failed to list songs from Firestore", firestoreError);
      songs = [];
    }

    const matchingSongs = songs.filter((song) => {
      if (song.styleId !== requestedStyle || song.danceId !== danceId) {
        return false;
      }
      if (excludeId && song.id === excludeId) {
        return false;
      }
      if (excludeStoragePath && song.storagePath === excludeStoragePath) {
        return false;
      }
      if (excludeIds.length && excludeIds.includes(song.id)) {
        return false;
      }
      if (excludeStoragePaths.length && excludeStoragePaths.includes(song.storagePath)) {
        return false;
      }
      return true;
    });

    if (matchingSongs.length === 0) {
      res.status(404).json({ error: "No matching replacement found" });
      return;
    }

    let candidates = matchingSongs;
    if (Number.isFinite(minDurationMs)) {
      const durationMatches = matchingSongs.filter(
        (song) => typeof song.durationMs === "number" && song.durationMs >= minDurationMs
      );
      if (durationMatches.length > 0) {
        candidates = durationMatches;
      }
    }

    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let track = null;
    for (const candidate of shuffled) {
      const candidateTrack = await buildSongResponse(candidate);
      if (candidateTrack) {
        track = candidateTrack;
        break;
      }
    }

    if (!track) {
      res.status(404).json({ error: "No replacement found" });
      return;
    }

    res.json({
      track: {
        dance: danceConfig.label,
        danceId,
        file: track.url ?? null,
        songId: track.id ?? null,
        title: track.title ?? null,
        artist: track.artist ?? null,
        bpm: track.bpm ?? null,
        startMs: track.startMs ?? null,
        endMs: track.endMs ?? null,
        durationMs: track.durationMs ?? null,
        storagePath: track.storagePath ?? null,
        filename: track.filename ?? null,
        crash1Ms: track.crash1Ms ?? null,
        crash2Ms: track.crash2Ms ?? null,
        crash3Ms: track.crash3Ms ?? null,
      },
    });
  } catch (err) {
    console.error("❌ Error generating round replacement:", err);
    res.status(500).json({ error: "Failed to generate replacement" });
  }
});

app.get("/api/dances", (req, res) => {
  const requestedStyle = (req.query.style || "ballroom").toLowerCase();
  const config = STYLE_CONFIG[requestedStyle];

  if (!config) {
    res
      .status(400)
      .json({ error: `Unsupported style '${req.query.style ?? ""}'` });
    return;
  }

  res.json(config.dances.map(({ folder, label }) => ({ id: folder, label })));
});

app.get("/api/practice", async (req, res) => {
  try {
    const requestedStyle = (req.query.style || "ballroom").toLowerCase();
    const requestedDance = req.query.dance;

    if (!requestedDance) {
      res.status(400).json({ error: "Missing 'dance' query parameter" });
      return;
    }

    const config = STYLE_CONFIG[requestedStyle];

    if (!config) {
      res
        .status(400)
        .json({ error: `Unsupported style '${req.query.style ?? ""}'` });
      return;
    }

    const danceConfig = config.dances.find(
      ({ folder }) => folder.toLowerCase() === requestedDance.toLowerCase()
    );

    if (!danceConfig) {
      res
        .status(400)
        .json({
          error: `Unsupported dance '${requestedDance}' for style '${requestedStyle}'`,
        });
      return;
    }

    let songs = [];
    try {
      songs = await listSongDocuments();
    } catch (firestoreError) {
      console.error("Failed to list songs from Firestore", firestoreError);
      songs = [];
    }

    const matchingSongs = songs.filter(
      (song) => song.styleId === requestedStyle && song.danceId === danceConfig.folder
    );

    const storagePrefix = `${config.baseFolder}/${danceConfig.folder}/`;
    const trackByStoragePath = new Map();

    const addTrack = (track) => {
      if (!track?.storagePath) {
        return;
      }

      const existing = trackByStoragePath.get(track.storagePath);
      if (!existing) {
        trackByStoragePath.set(track.storagePath, track);
        return;
      }

      const merged = { ...existing };
      ["crash1Ms", "crash2Ms", "crash3Ms"].forEach((field) => {
        if (
          (merged[field] === null || typeof merged[field] === "undefined") &&
          track[field] != null
        ) {
          merged[field] = track[field];
        }
      });

      const existingHasMetadata = Boolean(existing.id);
      const nextHasMetadata = Boolean(track.id);

      if (nextHasMetadata && !existingHasMetadata) {
        trackByStoragePath.set(track.storagePath, { ...track, ...merged });
        return;
      }

      trackByStoragePath.set(track.storagePath, merged);
    };

    if (matchingSongs.length > 0) {
      const firestoreTracks = await Promise.all(
        matchingSongs.map((song) => buildSongResponse(song))
      );
      firestoreTracks.forEach(addTrack);
    }

    const [files] = await bucket.getFiles({ prefix: storagePrefix });

    await Promise.all(
      files
        .filter((file) => file.name.toLowerCase().endsWith(".mp3"))
        .map(async (file) => {
          if (trackByStoragePath.has(file.name)) {
            return;
          }

          const [url] = await file.getSignedUrl({
            action: "read",
            expires: "03-01-2030",
          });
          const filename = file.name.split("/").pop() || file.name;

          const crashMetadata = extractCrashMetadata(
            file.metadata?.metadata,
            file.metadata,
            file.customMetadata
          );

          addTrack({
            id: null,
            title: filename,
            artist: "",
            bpm: null,
            startMs: null,
            endMs: null,
            durationMs: null,
            storagePath: file.name,
            filename,
            url,
            styleId: requestedStyle,
            danceId: danceConfig.folder,
            crash1Ms: crashMetadata.crash1Ms,
            crash2Ms: crashMetadata.crash2Ms,
            crash3Ms: crashMetadata.crash3Ms,
          });
        })
    );

    const tracks = Array.from(trackByStoragePath.values());

    if (tracks.length === 0) {
      res.status(404).json({ error: "No tracks available" });
      return;
    }

    const shuffledTracks = [...tracks];
    for (let i = shuffledTracks.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }

    res.json({
      dance: danceConfig.label,
      danceId: danceConfig.folder,
      tracks: shuffledTracks.map((track) => ({
        file: track.url,
        filename: track.filename,
        songId: track.id,
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        startMs: track.startMs,
        endMs: track.endMs,
        durationMs: track.durationMs,
        storagePath: track.storagePath,
        crash1Ms: track.crash1Ms ?? null,
        crash2Ms: track.crash2Ms ?? null,
        crash3Ms: track.crash3Ms ?? null,
      })),
    });
  } catch (err) {
    console.error("❌ Error generating practice track:", err);
    res.status(500).json({ error: "Failed to generate practice track" });
  }
});

app.post(
  "/api/feedback/email",
  feedbackUploadMiddleware,
  async (req, res) => {
    try {
      const description = sanitizeText(req.body?.description);

      if (!description) {
        res
          .status(400)
          .json({ error: "Please describe the issue before sending feedback." });
        return;
      }

      if (description.length > FEEDBACK_DESCRIPTION_MAX_LENGTH) {
        res.status(400).json({
          error: `Feedback is too long. Keep it under ${FEEDBACK_DESCRIPTION_MAX_LENGTH} characters.`,
        });
        return;
      }

      const refererHeader =
        typeof req.get === "function" ? req.get("referer") : req.headers?.referer;
      const userAgentHeader =
        typeof req.get === "function" ? req.get("user-agent") : req.headers?.["user-agent"];

      const metadata = {
        pageUrl: sanitizeText(req.body?.pageUrl || refererHeader),
        userAgent: sanitizeText(req.body?.userAgent || userAgentHeader),
        platform: sanitizeText(req.body?.platform),
        timezone: sanitizeText(req.body?.timezone),
        appVersion: sanitizeText(req.body?.appVersion),
        ipAddress: req.ip,
      };

      let contactEmail = sanitizeText(req.body?.contactEmail);
      if (contactEmail.length > 254) {
        contactEmail = contactEmail.slice(0, 254);
      }

      if (contactEmail && !EMAIL_REGEX.test(contactEmail)) {
        res.status(400).json({ error: "Enter a valid email or leave the field blank." });
        return;
      }

      const files = Array.isArray(req.files) ? req.files : [];
      const attachments = [];

      for (const file of files) {
        if (!file?.buffer) {
          continue;
        }

        if (!FEEDBACK_ALLOWED_MIME_TYPES.has(file.mimetype)) {
          res
            .status(400)
            .json({ error: `Unsupported file type: ${file.mimetype || "unknown"}` });
          return;
        }

        attachments.push({
          filename: file.originalname || `${file.fieldname}-${attachments.length + 1}.png`,
          contentType: file.mimetype,
          content: file.buffer,
        });
      }

      const userRecord = await getOptionalSessionUser(req);

      await sendFeedbackEmail({
        description,
        user: userRecord,
        contactEmail,
        metadata,
        attachments,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Failed to send feedback email", {
        message: err?.message,
        name: err?.name,
        code: err?.code,
        response: err?.response,
        responseCode: err?.responseCode,
        stack: err?.stack,
      });
      res.status(500).json({
        error: "We couldn’t send that feedback right now. Please try again in a minute.",
      });
    }
  },
);

app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [userStats, libraryStats] = await Promise.all([
      listAllUsersForStats(),
      buildLibraryStats(),
    ]);
    res.json({
      users: userStats,
      library: libraryStats,
    });
  } catch (err) {
    console.error("Failed to load admin stats", err);
    res.status(500).json({ error: "Failed to load admin stats" });
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query?.limit) || 200, 1), 1000);
  const pageToken = typeof req.query?.pageToken === "string" ? req.query.pageToken : undefined;

  try {
    const batch = await admin.auth().listUsers(limit, pageToken);
    res.json({
      users: batch.users.map(formatUserRecord),
      nextPageToken: batch.pageToken || null,
    });
  } catch (err) {
    console.error("Failed to load admin users", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

app.delete("/api/admin/users/:uid", requireAuth, requireAdmin, async (req, res) => {
  const uid = sanitizeString(req.params.uid, 200);
  if (!uid) {
    res.status(400).json({ error: "Missing user id" });
    return;
  }

  if (req.firebaseUser?.uid === uid) {
    res.status(400).json({ error: "You cannot delete your own account." });
    return;
  }

  try {
    await admin.auth().deleteUser(uid);
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete user", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.post("/api/admin/storage-upload", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      styleId,
      style,
      danceId,
      dance,
      fileName,
      targetFileName,
      fileBase64,
      contentType,
      metadata,
      overwrite,
    } = req.body ?? {};

    const styleKeyRaw = styleId ?? style;
    const danceKeyRaw = danceId ?? dance;

    if (!styleKeyRaw || !danceKeyRaw) {
      res.status(400).json({ error: "styleId and danceId are required" });
      return;
    }

    const styleAndDance = resolveStyleAndDance(styleKeyRaw, danceKeyRaw);

    if (!styleAndDance) {
      res.status(400).json({ error: "Unsupported style or dance" });
      return;
    }

    let base64Payload = typeof fileBase64 === "string" ? fileBase64.trim() : "";

    if (!base64Payload) {
      res.status(400).json({ error: "fileBase64 is required" });
      return;
    }

    const commaIndex = base64Payload.indexOf(",");
    if (commaIndex >= 0) {
      base64Payload = base64Payload.slice(commaIndex + 1);
    }

    let buffer;
    try {
      buffer = Buffer.from(base64Payload, "base64");
    } catch (err) {
      console.error("Failed to decode base64 upload", err);
      res.status(400).json({ error: "Invalid base64 payload" });
      return;
    }

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: "Upload payload is empty" });
      return;
    }

    const originalFileName = [targetFileName, fileName]
      .find((value) => typeof value === "string" && value.trim().length > 0)
      ?.trim();

    const fallbackName = `upload-${Date.now()}.mp3`;
    const sanitizedName = (originalFileName || fallbackName)
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.trim();

    if (!sanitizedName) {
      res.status(400).json({ error: "Unable to determine target file name" });
      return;
    }

    const finalFileName = /\.mp3$/i.test(sanitizedName) ? sanitizedName : `${sanitizedName}.mp3`;

    const { styleConfig, danceConfig } = styleAndDance;

    const storagePath = [styleConfig.baseFolder, danceConfig.folder, finalFileName]
      .filter(Boolean)
      .join("/")
      .replace(/^\/+/, "")
      .replace(/\/+/g, "/");

    const file = bucket.file(storagePath);

    if (!overwrite) {
      const [exists] = await file.exists();
      if (exists) {
        res.status(409).json({ error: "A file with that name already exists" });
        return;
      }
    }

    const resolvedContentType = typeof contentType === "string" && contentType.trim()
      ? contentType.trim()
      : "audio/mpeg";

    const customMetadata = {};
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value === null || typeof value === "undefined") return;
        const trimmedKey = String(key).trim();
        if (!trimmedKey) return;
        customMetadata[trimmedKey] = String(value);
      });
    }

    await file.save(buffer, {
      resumable: false,
      contentType: resolvedContentType,
      metadata: {
        cacheControl: "public, max-age=3600",
        metadata: customMetadata,
      },
    });

    const [storedMetadata] = await file.getMetadata();

    res.status(201).json({
      storagePath,
      filename: finalFileName,
      contentType: storedMetadata?.contentType ?? resolvedContentType,
      size: storedMetadata?.size ? Number(storedMetadata.size) : buffer.length,
      updated: storedMetadata?.updated ?? null,
      bucket: storedMetadata?.bucket ?? bucket.name,
      customMetadata: storedMetadata?.metadata?.metadata ?? customMetadata,
    });
  } catch (err) {
    console.error("Failed to upload song", err);
    res.status(500).json({ error: "Failed to upload song" });
  }
});

app.get("/api/admin/storage-files", requireAuth, requireAdmin, async (req, res) => {
  try {
    const prefix = typeof req.query.prefix === "string" ? req.query.prefix.trim() : "";
    const normalizedPrefix = prefix ? prefix.replace(/^\/+/, "") : "";
    const [files] = await bucket.getFiles({
      prefix: normalizedPrefix,
    });

    const mp3Files = files.filter((file) => file.name.toLowerCase().endsWith(".mp3"));

    const data = mp3Files.map((file) => {
      const { metadata } = file;
      const customMetadata = metadata?.metadata ?? {};
      const durationMsRaw = customMetadata.durationMs ?? customMetadata.durationMS ?? null;
      const parsedDurationMs = Number.isFinite(Number(durationMsRaw))
        ? Number(durationMsRaw)
        : null;

      return {
        path: file.name,
        filename: file.name.split("/").pop() || file.name,
        size: metadata?.size ? Number(metadata.size) : null,
        updated: metadata?.updated ?? null,
        contentType: metadata?.contentType ?? null,
        durationMs: parsedDurationMs,
        customMetadata,
      };
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.status(200).json({ files: data });
  } catch (err) {
    console.error("Failed to list storage files", err);
    res.status(500).json({ error: "Failed to list storage files" });
  }
});

app.get("/api/admin/song-url", requireAuth, requireAdmin, async (req, res) => {
  try {
    const storagePathRaw = typeof req.query.storagePath === "string" ? req.query.storagePath : "";
    const storagePath = storagePathRaw.trim();

    if (!storagePath) {
      res.status(400).json({ error: "storagePath query parameter is required" });
      return;
    }

    const url = await generateSignedUrl(storagePath);
    if (!url) {
      res.status(404).json({ error: "Unable to generate playback URL" });
      return;
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.status(200).json({ url });
  } catch (err) {
    console.error("Failed to generate playback URL", err);
    res.status(500).json({ error: "Failed to generate playback URL" });
  }
});

app.get("/api/admin/songs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const songs = await listSongDocuments();
    res.json({ songs });
  } catch (err) {
    console.error("Failed to list songs", err);
    res.status(500).json({ error: "Failed to list songs" });
  }
});

app.post("/api/admin/songs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      id,
      storagePath,
      title = "",
      artist = "",
      bpm = null,
      startMs = null,
      endMs = null,
      durationMs = null,
    } = req.body ?? {};

    if (typeof storagePath !== "string" || storagePath.trim() === "") {
      res.status(400).json({ error: "storagePath is required" });
      return;
    }

    const docData = {
      storagePath: storagePath.trim(),
      title: typeof title === "string" ? title : String(title ?? ""),
      artist: typeof artist === "string" ? artist : String(artist ?? ""),
      bpm: toNumberOrNull(bpm),
      startMs: toNumberOrNull(startMs),
      endMs: toNumberOrNull(endMs),
      durationMs: toNumberOrNull(durationMs),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const crashUpdate = buildCrashUpdateFromPayload(req.body ?? {});
    if (crashUpdate.error) {
      res.status(400).json({ error: crashUpdate.error });
      return;
    }

    if (crashUpdate.hasUpdate) {
      Object.assign(docData, crashUpdate.crashData);
    }

    let docRef;
    if (id) {
      docRef = firestore.collection(SONGS_COLLECTION).doc(id);
      await docRef.set(docData, { merge: true });
    } else {
      docRef = firestore.collection(SONGS_COLLECTION).doc();
      await docRef.set({
        ...docData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const snapshot = await docRef.get();
    const song = mapSongSnapshot(snapshot);
    res.json({ song });
  } catch (err) {
    console.error("Failed to save song", err);
    res.status(500).json({ error: "Failed to save song" });
  }
});

app.delete("/api/admin/songs/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: "Missing song id" });
      return;
    }

    await firestore.collection(SONGS_COLLECTION).doc(id).delete();
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete song", err);
    res.status(500).json({ error: "Failed to delete song" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
