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

// --- ROUTES ---

// Test route for root
app.get("/", (req, res) => {
  res.send("Ballroom DJ backend is running 🎶");
});

// Test JSON route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend 👋" });
});

// Generate a Standard round (Waltz, Tango, Viennese Waltz, Foxtrot, Quickstep)
app.get("/api/round", async (req, res) => {
  try {
    const dances = ["Waltz", "Tango", "VienneseWaltz", "Foxtrot", "Quickstep"];

    const round = await Promise.all(
      dances.map(async (dance) => {
        const url = await getRandomFile(`Ballroom/${dance}`);
        return { dance, file: url };
      })
    );

    res.json(round);
  } catch (err) {
    console.error("❌ Error generating round:", err);
    res.status(500).json({ error: "Failed to generate round" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
