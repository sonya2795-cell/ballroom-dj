const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
const PORT = 3000;

// Enable CORS (allow frontend to connect)
app.use(cors());

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
      { folder: "EastCoastSwing", label: "East Coast Swing" },
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
