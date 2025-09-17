const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Enable CORS (allow frontend to connect)
app.use(cors());

// Serve music folder (all subfolders inside /music)
app.use("/music", express.static("music"));

// --- Helper function to pick a random MP3 from a folder ---
function getRandomFile(folderPath) {
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith(".mp3"));
  if (files.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * files.length);
  return files[randomIndex];
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

// List ALL songs (all mp3 files directly under /music)
app.get("/api/songs", (req, res) => {
  const musicDir = path.join(__dirname, "music");

  fs.readdir(musicDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Unable to scan music directory" });
    }
    const songs = files.filter(file => file.endsWith(".mp3"));
    res.json(songs);
  });
});

// Generate a round: 1 Waltz, 1 Tango, 1 Viennese Waltz, 1 Foxtrot, 1 Quickstep
app.get("/api/round", (req, res) => {
  const baseDir = path.join(__dirname, "music/Ballroom");

  const dances = ["Waltz", "Tango", "VienneseWaltz", "Foxtrot", "Quickstep"];

  const round = dances.map(dance => {
    const folderPath = path.join(baseDir, dance);

    let file = null;
    if (fs.existsSync(folderPath)) {
      // Grab only .mp3 files
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".mp3"));

      if (files.length > 0) {
        const randomIndex = Math.floor(Math.random() * files.length);
        file = files[randomIndex];
      }
    }

    return file
      ? { dance, file: `/music/Ballroom/${dance}/${file}` }
      : { dance, file: null };
  });

  res.json(round);
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
