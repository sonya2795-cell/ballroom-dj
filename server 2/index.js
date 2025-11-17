require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const admin = require("firebase-admin");

const app = express();
const PORT = 3000;
const rawClientOrigins = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = rawClientOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = "ballroom_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

// Enable CORS (allow frontend to connect)
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : rawClientOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Firebase Admin Setup ---
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "ballroom-dj.firebasestorage.app",
});

const bucket = admin.storage().bucket();

// --- Helper: Get random file from Firebase Storage ---
async function getRandomFile(folderPath) {
  const [files] = await bucket.getFiles({ prefix: folderPath + "/" });
  const mp3Files = files.filter((f) => f.name.endsWith(".mp3"));
  if (mp3Files.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * mp3Files.length);
  const file = mp3Files[randomIndex];

  // Generate signed URL so it’s playable anywhere
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "03-01-2030", // Long-lived link
  });

  return url;
}

async function getAllFilesWithUrls(folderPath) {
  const [files] = await bucket.getFiles({ prefix: folderPath + "/" });
  const mp3Files = files.filter((f) => f.name.endsWith(".mp3"));

  const entries = await Promise.all(
    mp3Files.map(async (file) => {
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2030",
      });

      const filename = file.name.split("/").pop() || file.name;

      return {
        file: url,
        filename,
      };
    })
  );

  return entries;
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

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

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
    customClaims: userRecord.customClaims || {},
    providers: userRecord.providerData.map((provider) => provider.providerId),
  };
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

    const round = await Promise.all(
      config.dances.map(async ({ folder, label }) => {
        const url = await getRandomFile(`${config.baseFolder}/${folder}`);
        return { dance: label, file: url };
      })
    );

    res.json(round);
  } catch (err) {
    console.error("❌ Error generating round:", err);
    res.status(500).json({ error: "Failed to generate round" });
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

app.get("/api/practice", requireAuth, async (req, res) => {
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

    const tracks = await getAllFilesWithUrls(
      `${config.baseFolder}/${danceConfig.folder}`
    );

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
      tracks: shuffledTracks,
    });
  } catch (err) {
    console.error("❌ Error generating practice track:", err);
    res.status(500).json({ error: "Failed to generate practice track" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
