import { useState, useEffect, useRef } from "react";

const BREAK_MIN_SECONDS = 5;
const BREAK_MAX_SECONDS = 30;
const DEFAULT_BREAK_SECONDS = BREAK_MIN_SECONDS;
const ROUND_FADE_OUT_SECONDS = 5;
const ROUND_FADE_INTERVAL_MS = 50;

const SILENCE_WAV =
  "data:audio/wav;base64,UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

const STYLE_OPTIONS = [
  { id: "ballroom", label: "Ballroom" },
  { id: "latin", label: "Latin" },
  { id: "rhythm", label: "Rhythm" },
  { id: "smooth", label: "Smooth" },
];

const MODE_OPTIONS = [
  { id: "round", label: "Round" },
  { id: "practice", label: "Practice" },
];

const ENABLED_STYLE_IDS = new Set(["latin", "ballroom"]);

const SONG_MIN_SECONDS = 60;
const SONG_MAX_SECONDS = 180;
const SONG_STEP_SECONDS = 5;
const DEFAULT_SONG_SECONDS = 90;
const ACTIVE_FONT_SIZE = "1.5rem";
const UPCOMING_FONT_SIZE = "1.25rem";
const BACKGROUND_COLOR = "#30333a";
const TEXT_COLOR = "#f2f4f7";
const HIGHLIGHT_COLOR = "#25ed75";

function App() {
  const [round, setRound] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
  const [upcomingIndex, setUpcomingIndex] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedMode, setSelectedMode] = useState("round");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [breakDurationSeconds, setBreakDurationSeconds] = useState(
    DEFAULT_BREAK_SECONDS
  );
  const [songDurationSeconds, setSongDurationSeconds] = useState(
    DEFAULT_SONG_SECONDS
  );
  const [practiceDances, setPracticeDances] = useState([]);
  const [practicePlaylist, setPracticePlaylist] = useState(null);
  const [practiceTrackIndex, setPracticeTrackIndex] = useState(0);
  const [practiceLoadingDance, setPracticeLoadingDance] = useState(null);
  const [practiceError, setPracticeError] = useState(null);
  const [practiceDancesLoading, setPracticeDancesLoading] = useState(false);
  const [practiceIsPlaying, setPracticeIsPlaying] = useState(false);
  const [practiceCurrentTime, setPracticeCurrentTime] = useState(0);
  const [practiceDuration, setPracticeDuration] = useState(0);
  const audioRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const breakIntervalRef = useRef(null);
  const activationAudioRef = useRef(null);
  const hasPrimedAudioRef = useRef(false);
  const practiceAudioRef = useRef(null);

  // Prevent duplicate advancing
  const advancingRef = useRef(false);

  const primeAudioActivation = async () => {
    if (hasPrimedAudioRef.current) return;

    if (!activationAudioRef.current) {
      const audio = new Audio(SILENCE_WAV);
      audio.preload = "auto";
      audio.loop = false;
      audio.volume = 0;
      activationAudioRef.current = audio;
    }

    try {
      await activationAudioRef.current.play();
      activationAudioRef.current.pause();
      activationAudioRef.current.currentTime = 0;
      hasPrimedAudioRef.current = true;
    } catch (err) {
      console.warn("[autoplay-debug] Silent activation play failed", err);
    }
  };

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

  const clearFadeTimers = ({ resetVolume = false } = {}) => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (resetVolume && audioRef.current) {
      audioRef.current.volume = 1;
    }
  };

  const startFadeOut = (fadeDurationMs) => {
    const audio = audioRef.current;
    if (!audio) return;

    const totalMs = Math.max(fadeDurationMs, 0);

    if (totalMs === 0) {
      audio.volume = 0;
      return;
    }

    const startVolume = audio.volume ?? 1;
    if (startVolume <= 0) return;

    fadeTimeoutRef.current = null;

    const startedAt = Date.now();

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    fadeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / totalMs, 1);
      const nextVolume = Math.max(startVolume * (1 - progress), 0);
      audio.volume = nextVolume;

      if (progress >= 1) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, ROUND_FADE_INTERVAL_MS);
  };

  const stopRoundPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    clearBreakInterval();
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });
    setIsPlaying(false);
    setCurrentIndex(null);
    setBreakTimeLeft(null);
    setUpcomingIndex(null);
    setCurrentTime(0);
    setDuration(0);
  };

  const resetPracticeState = () => {
    if (practiceAudioRef.current) {
      practiceAudioRef.current.pause();
      practiceAudioRef.current.currentTime = 0;
    }

    setPracticePlaylist(null);
    setPracticeTrackIndex(0);
    setPracticeIsPlaying(false);
    setPracticeCurrentTime(0);
    setPracticeDuration(0);
    setPracticeLoadingDance(null);
  };

  const schedulePlayTimeout = (durationOverrideSeconds = songDurationSeconds) => {
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });

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

    const fadeDurationMs = Math.min(
      ROUND_FADE_OUT_SECONDS * 1000,
      remainingMilliseconds
    );

    if (fadeDurationMs > 0) {
      const fadeDelay = Math.max(remainingMilliseconds - fadeDurationMs, 0);

      if (fadeDelay === 0) {
        startFadeOut(fadeDurationMs);
      } else {
        fadeTimeoutRef.current = setTimeout(() => {
          startFadeOut(fadeDurationMs);
        }, fadeDelay);
      }
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
    clearFadeTimers();

    const nextIndex = getNextIndex();

    if (nextIndex === null) {
      clearBreakInterval();
      setCurrentIndex(null);
      setBreakTimeLeft(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setUpcomingIndex(null);
      advancingRef.current = false;
      return;
    }

    advancingRef.current = true;
    clearBreakInterval();

    let countdown = breakDurationSeconds;
    setBreakTimeLeft(countdown);
    setUpcomingIndex(nextIndex);

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
        setUpcomingIndex(null);
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
      setUpcomingIndex(null);
      advancingRef.current = false;
    } catch (e) {
      console.error("Error fetching round:", e);
    }
  };

  const handleEnded = () => {
    clearPlayTimeout();
    clearFadeTimers();
    startBreakThenNext();
  };

  const handlePlay = () => {
    clearFadeTimers({ resetVolume: true });
    if (audioRef.current) audioRef.current.volume = 1.0;
    setBreakTimeLeft(null);
    setIsPlaying(true);
    schedulePlayTimeout();
  };

  const handlePause = () => {
    setIsPlaying(false);
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });
  };

  const handleTimeUpdate = (event) => {
    setCurrentTime(event.target.currentTime || 0);
  };

  const handleLoadedMetadata = (event) => {
    setDuration(event.target.duration || 0);
    setCurrentTime(event.target.currentTime || 0);
  };

  const handleSelectStyle = (styleId) => {
    if (styleId === selectedStyle) {
      return;
    }

    stopRoundPlayback();
    resetPracticeState();
    setRound([]);
    setPracticeDances([]);
    setPracticeError(null);
    setPracticeDancesLoading(false);
    setSelectedStyle(styleId);

    if (!ENABLED_STYLE_IDS.has(styleId)) {
      return;
    }

    if (selectedMode === "round") {
      generateRound(styleId);
    }
  };

  const handleModeChange = (modeId) => {
    if (modeId === selectedMode) return;

    if (modeId === "practice") {
      stopRoundPlayback();
      setRound([]);
    } else {
      resetPracticeState();
      setPracticeDancesLoading(false);
      setPracticeError(null);
      setPracticeDances([]);
    }

    setSelectedMode(modeId);

    if (
      modeId === "round" &&
      selectedStyle &&
      ENABLED_STYLE_IDS.has(selectedStyle) &&
      round.length === 0
    ) {
      generateRound(selectedStyle);
    }
  };

  const handlePracticeRequest = async (danceId, { forceReload = false } = {}) => {
    if (!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)) return;

    if (
      !forceReload &&
      practicePlaylist?.danceId &&
      practicePlaylist.danceId.toLowerCase() === danceId.toLowerCase()
    ) {
      return;
    }

    setPracticeLoadingDance(danceId);
    setPracticeError(null);
    setPracticeIsPlaying(false);

    try {
      const res = await fetch(
        `/api/practice?style=${encodeURIComponent(
          selectedStyle
        )}&dance=${encodeURIComponent(danceId)}`
      );
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to load practice track");
      }

      try {
        await primeAudioActivation();
      } catch (activationError) {
        console.warn("Practice autoplay prime failed", activationError);
      }

      if (!Array.isArray(payload.tracks) || payload.tracks.length === 0) {
        throw new Error("No tracks available");
      }

      setPracticePlaylist({ ...payload, style: selectedStyle });
      setPracticeTrackIndex(0);
      setPracticeIsPlaying(false);
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
    } catch (err) {
      console.error("Error loading practice track:", err);
      setPracticePlaylist(null);
      setPracticeTrackIndex(0);
      setPracticeIsPlaying(false);
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
      setPracticeError(err?.message ?? "Failed to load practice track");
    } finally {
      setPracticeLoadingDance(null);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!Number.isFinite(timeInSeconds)) return "0:00";
    const totalSeconds = Math.max(0, Math.floor(timeInSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const getDisplayName = (fileUrl) => {
    if (!fileUrl) return "No song available";

    try {
      const { pathname } = new URL(fileUrl);
      const filename = pathname.split("/").pop();
      if (!filename) return "Unknown file";
      return decodeURIComponent(filename);
    } catch {
      const fallback = fileUrl.split("/").pop();
      return fallback ? decodeURIComponent(fallback) : "Unknown file";
    }
  };

  const handleSkip = () => {
    if (currentIndex === null) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = audioRef.current.duration || 0;
    }

    setIsPlaying(false);
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });

    startBreakThenNext();
  };

  const handleTogglePlayback = () => {
    if (round.length === 0) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (currentIndex === null) {
      primeAudioActivation()
        .catch(() => {})
        .finally(() => {
          startBreakThenNext();
        });
      return;
    }

    if (!audioRef.current) return;

    const targetAudio = audioRef.current;
    primeAudioActivation()
      .catch(() => {})
      .finally(() => {
        targetAudio
          .play()
          .catch((err) => {
            console.error("Audio play error:", err);
          });
      });
  };

  useEffect(() => {
    const styleEnabled =
      !!selectedStyle && ENABLED_STYLE_IDS.has(selectedStyle);

    if (!styleEnabled || selectedMode !== "practice") {
      resetPracticeState();
      setPracticeError(null);
      setPracticeDances((prev) => (prev.length === 0 ? prev : []));
      setPracticeDancesLoading(false);
      return;
    }

    let cancelled = false;

    resetPracticeState();
    setPracticeError(null);
    setPracticeDances((prev) => (prev.length === 0 ? prev : []));
    setPracticeDancesLoading(true);

    const loadPracticeDances = async () => {
      try {
        const res = await fetch(
          `/api/dances?style=${encodeURIComponent(selectedStyle)}`
        );
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Failed to load practice dances");
        }

        if (!cancelled) {
          setPracticeDances(payload);
          setPracticeDancesLoading(false);
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Error loading practice dances:", err);
        setPracticeError(
          err?.message ?? "Failed to load practice dances"
        );
        setPracticeDances([]);
        setPracticeDancesLoading(false);
      }
    };

    loadPracticeDances();

    return () => {
      cancelled = true;
    };
  }, [selectedMode, selectedStyle]);

  useEffect(() => {
    if (!practiceAudioRef.current) return;

    if (!practicePlaylist || !practicePlaylist.tracks?.length) {
      practiceAudioRef.current.pause();
      practiceAudioRef.current.currentTime = 0;
      setPracticeIsPlaying(false);
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
      return;
    }

    const currentTrack = practicePlaylist.tracks[practiceTrackIndex];
    if (!currentTrack) {
      practiceAudioRef.current.pause();
      practiceAudioRef.current.currentTime = 0;
      setPracticeIsPlaying(false);
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
      return;
    }

    practiceAudioRef.current.load();
    practiceAudioRef.current.currentTime = 0;
    practiceAudioRef.current
      .play()
      .catch((err) => {
        console.error("Practice play error:", err);
        setPracticeIsPlaying(false);
      });
    setPracticeCurrentTime(0);
    setPracticeDuration(0);
  }, [practicePlaylist, practiceTrackIndex]);

  const handlePracticeTimeUpdate = (event) => {
    setPracticeCurrentTime(event.target.currentTime || 0);
  };

  const handlePracticeLoadedMetadata = (event) => {
    setPracticeDuration(event.target.duration || 0);
    setPracticeCurrentTime(event.target.currentTime || 0);
  };

  const handlePracticeToggle = () => {
    const audio = practiceAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio
        .play()
        .catch((err) => console.error("Practice play error:", err));
    } else {
      audio.pause();
    }
  };

  useEffect(() => {
    // Reset playback indicators whenever we load a new track
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });
  }, [currentIndex, round]);

  useEffect(() => {
    const previousBackground = document.body.style.backgroundColor;
    const previousColor = document.body.style.color;
    document.body.style.backgroundColor = BACKGROUND_COLOR;
    document.body.style.color = TEXT_COLOR;

    return () => {
      document.body.style.backgroundColor = previousBackground;
      document.body.style.color = previousColor;
    };
  }, []);

  useEffect(
    () => () => {
      clearPlayTimeout();
      clearBreakInterval();
      clearFadeTimers({ resetVolume: true });
    },
    []
  );

  const effectiveDuration = duration
    ? Math.min(duration, songDurationSeconds)
    : songDurationSeconds;
  const effectiveCurrentTime = Math.min(currentTime, effectiveDuration);
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      effectiveDuration > 0 ? (effectiveCurrentTime / effectiveDuration) * 100 : 0,
    ),
  );

  const currentPracticeTrack =
    practicePlaylist?.tracks?.[practiceTrackIndex] ?? null;
  const currentPracticeDanceId = practicePlaylist?.danceId ?? null;
  const showPracticeControls = Boolean(currentPracticeTrack);
  const practiceEffectiveDuration =
    practiceDuration && Number.isFinite(practiceDuration) && practiceDuration > 0
      ? practiceDuration
      : 0;
  const practiceEffectiveCurrentTime = Math.min(
    practiceCurrentTime,
    practiceEffectiveDuration || 0,
  );
  const practiceProgressPercent = Math.min(
    100,
    Math.max(
      0,
      practiceEffectiveDuration > 0
        ? (practiceEffectiveCurrentTime / practiceEffectiveDuration) * 100
        : 0,
    ),
  );

  const durationControls =
    selectedStyle !== null ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignSelf: "center",
        }}
      >
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
            className="neomorphus-slider"
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
            className="neomorphus-slider"
            onChange={(e) => {
              const nextValue = Number(e.target.value);
              setSongDurationSeconds(nextValue);
              if (isPlaying) {
                schedulePlayTimeout(nextValue);
              }
            }}
          />
        </div>
      </div>
    ) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: BACKGROUND_COLOR,
        color: TEXT_COLOR,
        paddingBottom: "2rem",
      }}
    >
      <h1>Ballroom DJ</h1>

      <div>
        {STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            onClick={() => handleSelectStyle(style.id)}
            disabled={!ENABLED_STYLE_IDS.has(style.id)}
            className={`neomorphus-button${selectedStyle === style.id ? " active" : ""}`}
            style={{
              marginRight: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            {style.label}
          </button>
        ))}
      </div>

      {selectedStyle && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            marginTop: "0.5rem",
          }}
        >
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`neomorphus-button${
                selectedMode === mode.id ? " active" : ""
              }`}
              onClick={() => handleModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}

      {selectedMode === "round" &&
        (round.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <div style={{ alignSelf: "flex-start" }}>
              <button
                onClick={() => {
                  if (selectedStyle) {
                    generateRound(selectedStyle);
                  }
                }}
                disabled={!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)}
                className="neomorphus-button"
                style={{ marginBottom: "0.75rem" }}
              >
                🔄
              </button>
              <ul>
                {round.map((s, i) => (
                  <li
                    key={i}
                  style={{
                    fontSize:
                      currentIndex === i && breakTimeLeft === null
                        ? ACTIVE_FONT_SIZE
                        : breakTimeLeft !== null && upcomingIndex === i
                        ? UPCOMING_FONT_SIZE
                        : undefined,
                    color:
                      currentIndex === i && breakTimeLeft === null
                        ? HIGHLIGHT_COLOR
                        : breakTimeLeft !== null && upcomingIndex === i
                        ? HIGHLIGHT_COLOR
                        : undefined,
                  }}
                >
                  {s.dance}: {getDisplayName(s.file)}
                </li>
              ))}
            </ul>

            {currentIndex === null && breakTimeLeft === null && (
              <button
                onClick={handleTogglePlayback}
                className="neomorphus-button"
              >
                Start Round
              </button>
            )}
            </div>
            {durationControls}
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>{durationControls}</div>
        ))}

      {selectedMode === "practice" && selectedStyle && (
        ENABLED_STYLE_IDS.has(selectedStyle) ? (
          <div style={{ marginTop: "1rem" }}>
            {practiceError && (
              <p style={{ color: "#ff8080" }}>{practiceError}</p>
            )}
            {practiceDancesLoading && !practiceError && <p>Loading dances...</p>}
            {practiceDances.length > 0 && (
              <div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  {practiceDances.map((dance) => (
                    <button
                      key={dance.id}
                      type="button"
                      className={`neomorphus-button${
                        practicePlaylist?.danceId === dance.id ? " active" : ""
                      }`}
                      disabled={
                        practiceLoadingDance === dance.id || practiceDancesLoading
                      }
                    onClick={() => handlePracticeRequest(dance.id)}
                    >
                      {practiceLoadingDance === dance.id
                        ? "Loading..."
                        : dance.label}
                    </button>
                  ))}
                </div>
                {practicePlaylist?.danceId?.toLowerCase() === "chacha" && null}
              </div>
            )}

            {currentPracticeTrack && currentPracticeTrack.file && (
              <div style={{ marginTop: "1rem" }}>
                <p>
                  Now Practicing: {practicePlaylist?.dance} - {getDisplayName(
                    currentPracticeTrack.file
                  )}
                </p>
                <audio
                  ref={practiceAudioRef}
                  src={currentPracticeTrack.file}
                  preload="auto"
                  style={{ display: "none" }}
                  onPlay={() => setPracticeIsPlaying(true)}
                  onPause={() => setPracticeIsPlaying(false)}
                  onLoadedMetadata={handlePracticeLoadedMetadata}
                  onTimeUpdate={handlePracticeTimeUpdate}
                  onEnded={() => {
                    setPracticeIsPlaying(false);
                    setPracticeTrackIndex((prev) => {
                      if (!practicePlaylist?.tracks) return prev;
                      const next = prev + 1;
                      if (next < practicePlaylist.tracks.length) {
                        return next;
                      }
                      return prev;
                    });
                    const tracksLength = practicePlaylist?.tracks?.length ?? 0;
                    if (
                      currentPracticeDanceId &&
                      tracksLength > 0 &&
                      practiceTrackIndex >= tracksLength - 1
                    ) {
                      handlePracticeRequest(currentPracticeDanceId, {
                        forceReload: true,
                      });
                    } else {
                      setPracticeCurrentTime(0);
                      setPracticeDuration(0);
                    }
                  }}
                  onError={(e) =>
                    console.error(
                      "Practice audio error:",
                      e,
                      "URL:",
                      currentPracticeTrack.file
                    )
                  }
                />
                {showPracticeControls && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      className="neomorphus-button"
                      onClick={handlePracticeToggle}
                      style={{ marginBottom: "0.75rem", marginRight: "0.75rem" }}
                    >
                      {practiceIsPlaying ? "Pause" : "Play"}
                    </button>
                    <div
                      style={{
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div className="round-progress-wrapper">
                        <progress
                          value={practiceEffectiveCurrentTime}
                          max={practiceEffectiveDuration || 1}
                          className="round-progress"
                        />
                        <div
                          className="round-progress-thumb"
                          style={{ left: `${practiceProgressPercent}%` }}
                        />
                      </div>
                      <span>
                        {formatTime(practiceEffectiveCurrentTime)} / {formatTime(
                          practiceEffectiveDuration
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="neomorphus-button"
                      onClick={() => {
                        const tracksLength = practicePlaylist?.tracks?.length ?? 0;

                        if (
                          tracksLength > 0 &&
                          practiceTrackIndex >= tracksLength - 1
                        ) {
                          if (currentPracticeDanceId) {
                            handlePracticeRequest(currentPracticeDanceId, {
                              forceReload: true,
                            });
                          }
                          return;
                        }

                        setPracticeIsPlaying(false);
                        setPracticeTrackIndex((prev) => {
                          if (!practicePlaylist?.tracks) return prev;
                          const next = prev + 1;
                          if (next < practicePlaylist.tracks.length) {
                            return next;
                          }
                          return prev;
                        });
                        setPracticeCurrentTime(0);
                        setPracticeDuration(0);
                      }}
                      style={{ marginBottom: "0.75rem" }}
                    >
                      Next Song
                    </button>
                    {practicePlaylist?.tracks?.length ? (
                      <ol
                        style={{
                          marginTop: "0.75rem",
                          paddingLeft: "1.5rem",
                        }}
                      >
                        {practicePlaylist.tracks.map((track, idx) => (
                          <li
                            key={`${track.filename ?? track.file}-${idx}`}
                            style={{
                              color:
                                idx === practiceTrackIndex ? HIGHLIGHT_COLOR : undefined,
                              fontWeight:
                                idx === practiceTrackIndex ? 600 : undefined,
                            }}
                          >
                            {getDisplayName(track.file)}
                            {idx === practiceTrackIndex ? " (current)" : ""}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            {practicePlaylist && (!practicePlaylist.tracks?.length || !currentPracticeTrack) && (
              <p style={{ marginTop: "1rem" }}>
                No tracks available right now for {practicePlaylist.dance}.
              </p>
            )}
          </div>
        ) : (
          <p style={{ marginTop: "1rem" }}>
            Practice mode for {
              STYLE_OPTIONS.find((opt) => opt.id === selectedStyle)?.label ||
              selectedStyle
            } is not available yet.
          </p>
        )
      )}

      {selectedMode === "round" && currentIndex !== null && round[currentIndex]?.file && (
        <div>
          <p
            style={{
              color: breakTimeLeft === null ? HIGHLIGHT_COLOR : TEXT_COLOR,
            }}
          >
            Now Playing ({currentIndex + 1}/{round.length}):{" "}
            {round[currentIndex].dance}
          </p>
          {breakTimeLeft === null && (
            <button
              onClick={handleSkip}
              className="neomorphus-button"
              style={{
                fontSize: "1.1rem",
              }}
            >
              Next Song
            </button>
          )}
          <button
            onClick={handleTogglePlayback}
            disabled={breakTimeLeft !== null}
            className="neomorphus-button"
            style={{
              fontSize: "1.1rem",
            }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>
          <div>
            <div className="round-progress-wrapper">
              <progress
                value={effectiveCurrentTime}
                max={effectiveDuration}
                className="round-progress"
              />
              <div
                className="round-progress-thumb"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
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

      {selectedMode === "round" && breakTimeLeft !== null && (
        <div>
          <h3>Next song starts in: {breakTimeLeft} seconds</h3>
        </div>
      )}
    </div>
  );
}

export default App;
