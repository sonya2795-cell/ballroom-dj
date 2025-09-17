import { useState, useEffect, useRef } from "react";

function App() {
  const [round, setRound] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
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
      advancingRef.current = false;
    }
  };

  const handleEnded = () => {
    startBreakThenNext();
  };

  const handlePlay = () => {
    if (audioRef.current) audioRef.current.volume = 1.0;
    setBreakTimeLeft(null);
  };

  useEffect(() => {
    // Just trigger re-render when currentIndex changes
  }, [currentIndex, round]);

  return (
    <div>
      <h1>Ballroom DJ</h1>

      <button onClick={generateRound}>Generate Round</button>

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
          <audio
            ref={audioRef}
            src={round[currentIndex].file}   // 👈 USES full Firebase URL directly
            preload="auto"
            autoPlay
            controls
            onPlay={handlePlay}
            onEnded={handleEnded}
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
