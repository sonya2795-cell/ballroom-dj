import { useState, useEffect, useRef } from "react";

const BREAK_MIN_SECONDS = 5;
const BREAK_MAX_SECONDS = 30;
const DEFAULT_BREAK_SECONDS = BREAK_MIN_SECONDS;

const STYLE_OPTIONS = [
  { id: "ballroom", label: "Ballroom" },
  { id: "latin", label: "Latin" },
  { id: "rhythm", label: "Rhythm" },
  { id: "smooth", label: "Smooth" },
];

const ENABLED_STYLE_IDS = new Set(["latin", "ballroom"]);

const SONG_MIN_SECONDS = 60;
const SONG_MAX_SECONDS = 180;
const SONG_STEP_SECONDS = 5;
const DEFAULT_SONG_SECONDS = 90;

function App() {
  const [round, setRound] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [breakDurationSeconds, setBreakDurationSeconds] = useState(
    DEFAULT_BREAK_SECONDS
  );
  const [songDurationSeconds, setSongDurationSeconds] = useState(
    DEFAULT_SONG_SECONDS
  );
  const audioRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const breakIntervalRef = useRef(null);

  // Prevent duplicate advancing
  const advancingRef = useRef(false);

  const clearBreakInterval = () => {
    if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = null;
    }
  };

  const clearPlayTimeout = () => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
  };

  const schedulePlayTimeout = (durationOverrideSeconds = songDurationSeconds) => {
    clearPlayTimeout();

    const audio = audioRef.current;
    const targetSeconds = durationOverrideSeconds;
    const elapsedSeconds = audio ? audio.currentTime || 0 : 0;
    const remainingMilliseconds = Math.max(
      targetSeconds * 1000 - elapsedSeconds * 1000,
      0
    );

    if (remainingMilliseconds <= 0) {
      if (audio) audio.pause();
      setIsPlaying(false);
      startBreakThenNext();
      return;
    }

    playTimeoutRef.current = setTimeout(() => {
      if (!audioRef.current) return;

      audioRef.current.pause();
      setIsPlaying(false);
      playTimeoutRef.current = null;
      startBreakThenNext();
    }, remainingMilliseconds);
  };

  const getNextIndex = () => {
    if (round.length === 0) return null;
    if (currentIndex === null) return 0;
    if (currentIndex < round.length - 1) return currentIndex + 1;
    return null;
  };

  const startBreakThenNext = () => {
    if (advancingRef.current) return;

    clearPlayTimeout();

    const nextIndex = getNextIndex();

    if (nextIndex === null) {
      clearBreakInterval();
      setCurrentIndex(null);
      setBreakTimeLeft(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsRoundActive(false);
      advancingRef.current = false;
      return;
    }

    advancingRef.current = true;
    clearBreakInterval();

    let countdown = breakDurationSeconds;
    setBreakTimeLeft(countdown);

    breakIntervalRef.current = setInterval(() => {
      countdown -= 1;
      setBreakTimeLeft(Math.max(countdown, 0));

      if (countdown <= 0) {
        clearBreakInterval();
        setBreakTimeLeft(null);
        setCurrentIndex(nextIndex);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        advancingRef.current = false;
      }
    }, 1000);
  };

  // Fetch a new round for the selected style
  const generateRound = async (style = selectedStyle) => {
    if (!style) {
      console.warn("No style selected yet.");
      return;
    }

    if (!ENABLED_STYLE_IDS.has(style)) {
      console.warn(`Round generation for ${style} not wired up yet.`);
      return;
    }

    try {
      const res = await fetch(`/api/round?style=${encodeURIComponent(style)}`);
      const data = await res.json();
      clearBreakInterval();
      clearPlayTimeout();
      setRound(data);
      setCurrentIndex(null);
      setBreakTimeLeft(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsRoundActive(data.length > 0);
      advancingRef.current = false;
    } catch (e) {
      console.error("Error fetching round:", e);
    }
  };

  const handleEnded = () => {
    clearPlayTimeout();
    startBreakThenNext();
  };

  const handlePlay = () => {
    if (audioRef.current) audioRef.current.volume = 1.0;
    setBreakTimeLeft(null);
    setIsPlaying(true);
    schedulePlayTimeout();
  };

  const handlePause = () => {
    setIsPlaying(false);
    clearPlayTimeout();
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
    clearPlayTimeout();

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
    clearPlayTimeout();
  }, [currentIndex, round]);

  useEffect(() => {
    if (
      isRoundActive &&
      round.length > 0 &&
      currentIndex === null &&
      breakTimeLeft === null &&
      !advancingRef.current
    ) {
      startBreakThenNext();
    }
  }, [isRoundActive, round, currentIndex, breakTimeLeft]);

  useEffect(
    () => () => {
      clearPlayTimeout();
      clearBreakInterval();
    },
    []
  );

  const effectiveDuration = duration
    ? Math.min(duration, songDurationSeconds)
    : songDurationSeconds;
  const effectiveCurrentTime = Math.min(currentTime, effectiveDuration);

  return (
    <div>
      <h1>Ballroom DJ</h1>

      <div>
        {STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            disabled={!ENABLED_STYLE_IDS.has(style.id)}
            className={selectedStyle === style.id ? "active" : ""}
          >
            {style.label}
          </button>
        ))}
      </div>

      {selectedStyle && (
        <button
          onClick={() => generateRound(selectedStyle)}
          disabled={!ENABLED_STYLE_IDS.has(selectedStyle)}
        >
          Generate {
            STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.label || ""
          } Round
        </button>
      )}
      <div>
        <label htmlFor="break-duration-slider">
          Break Duration: {breakDurationSeconds} seconds
        </label>
        <input
          id="break-duration-slider"
          type="range"
          min={BREAK_MIN_SECONDS}
          max={BREAK_MAX_SECONDS}
          step={1}
          value={breakDurationSeconds}
          onChange={(e) => setBreakDurationSeconds(Number(e.target.value))}
        />
      </div>
      <div>
        <label htmlFor="song-duration-slider">
          Song Duration: {formatTime(songDurationSeconds)}
        </label>
        <input
          id="song-duration-slider"
          type="range"
          min={SONG_MIN_SECONDS}
          max={SONG_MAX_SECONDS}
          step={SONG_STEP_SECONDS}
          value={songDurationSeconds}
          onChange={(e) => {
            const nextValue = Number(e.target.value);
            setSongDurationSeconds(nextValue);
            if (isPlaying) {
              schedulePlayTimeout(nextValue);
            }
          }}
        />
      </div>

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
              value={effectiveCurrentTime}
              max={effectiveDuration}
            />
            <span>
              {formatTime(effectiveCurrentTime)} / {formatTime(effectiveDuration)}
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
