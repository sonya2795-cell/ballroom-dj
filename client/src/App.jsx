import { useState, useEffect, useRef } from "react";

function App() {
  const [round, setRound] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const BREAK_DURATION_MS = 5000; // 5 seconds

  // Fetch a new round
  const generateRound = async () => {
    try {
      const res = await fetch("/api/round");
      const data = await res.json();
      setRound(data);
      setCurrentIndex(0);
      setBreakTimeLeft(null);
    } catch (e) {
      console.error("Error fetching round:", e);
    }
  };

  // Prevent duplicate advancing
  const advancingRef = useRef(false);

  const startBreakThenNext = () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    if (currentIndex !== null && currentIndex < round.length - 1) {
      let countdown = BREAK_DURATION_MS / 1000;
      setBreakTimeLeft(countdown);

      const interval = setInterval(() => {
        countdown -= 1;
        setBreakTimeLeft(countdown);

        if (countdown <= 0) {
          clearInterval(interval);

          setCurrentIndex((prev) => {
            const nextIndex = prev !== null ? prev + 1 : null;
            advancingRef.current = false;
            return nextIndex;
          });
        }
      }, 1000);
    } else {
      setCurrentIndex(null);
      setBreakTimeLeft(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      advancingRef.current = false;
    }
  };

  const handleEnded = () => {
    startBreakThenNext();
  };

  const handlePlay = () => {
    if (audioRef.current) audioRef.current.volume = 1.0;
    setBreakTimeLeft(null);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleTimeUpdate = (event) => {
    setCurrentTime(event.target.currentTime || 0);
  };

  const handleLoadedMetadata = (event) => {
    setDuration(event.target.duration || 0);
    setCurrentTime(event.target.currentTime || 0);
  };

  const formatTime = (timeInSeconds) => {
    if (!Number.isFinite(timeInSeconds)) return "0:00";
    const totalSeconds = Math.max(0, Math.floor(timeInSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleSkip = () => {
    if (currentIndex === null) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = audioRef.current.duration || 0;
    }

    setIsPlaying(false);

    startBreakThenNext();
  };

  const handleTogglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Audio play error:", err);
      });
    }
  };

  useEffect(() => {
    // Reset playback indicators whenever we load a new track
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [currentIndex, round]);

  return (
    <div>
      <h1>Ballroom DJ</h1>

      <button onClick={generateRound}>Generate New Round</button>

      {round.length > 0 && (
        <div>
          <h2>Current Round</h2>
          <ul>
            {round.map((s, i) => (
              <li key={i}>
                {s.dance}: {s.file ? s.file.split("/").pop() : "No song available"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {currentIndex !== null && round[currentIndex]?.file && (
        <div>
          <p>
            Now Playing ({currentIndex + 1}/{round.length}):{" "}
            {round[currentIndex].dance}
          </p>
          <button
            onClick={handleSkip}
            disabled={breakTimeLeft !== null}
          >
            Next Song
          </button>
          <button
            onClick={handleTogglePlayback}
            disabled={breakTimeLeft !== null}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <div>
            <progress
              value={duration ? currentTime : 0}
              max={duration || 1}
            />
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <audio
            ref={audioRef}
            src={round[currentIndex].file}   // 👈 USES full Firebase URL directly
            preload="auto"
            autoPlay
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={(e) => {
              console.error("Audio error:", e, "URL:", round[currentIndex].file);
            }}
          />

        </div>
      )}

      {breakTimeLeft !== null && (
        <div>
          <h3>Next song starts in: {breakTimeLeft} seconds</h3>
        </div>
      )}
    </div>
  );
}

export default App;
