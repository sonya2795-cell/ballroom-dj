import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import AuthModal from "./components/AuthModal.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import AdminLibrary from "./pages/AdminLibrary.jsx";
import { fetchWithOrigin } from "./utils/apiClient.js";
import {
  getCrashOptions,
  getCrashRelativeDurationSeconds,
  getCrashSeconds,
  isPasoSong,
  PASO_DANCE_ID,
} from "./utils/pasoCrash.js";

const BREAK_MIN_SECONDS = 5;
const BREAK_MAX_SECONDS = 30;
const DEFAULT_BREAK_SECONDS = BREAK_MIN_SECONDS;
const ROUND_FADE_OUT_SECONDS = 5;
const ROUND_FADE_INTERVAL_MS = 50;

const ROUND_HEAT_OPTIONS = [
  { id: "final", label: "1 Heat", repeatCount: 1 },
  { id: "quarterfinal", label: "2 Heats", repeatCount: 2 },
  { id: "48", label: "3 Heats", repeatCount: 3 },
];

const DEFAULT_HEAT_MODE = ROUND_HEAT_OPTIONS[0].id;

const ROUND_HEAT_REPEAT_MAP = ROUND_HEAT_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option.repeatCount;
  return acc;
}, {});

const SILENCE_WAV =
  "data:audio/wav;base64,UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

const STYLE_OPTIONS = [
  { id: "ballroom", label: "Ballroom" },
  { id: "latin", label: "Latin" },
  { id: "rhythm", label: "Rhythm", comingSoon: true },
  { id: "smooth", label: "Smooth", comingSoon: true },
];

const MODE_OPTIONS = [
  { id: "round", label: "Round" },
  { id: "practice", label: "Practice" },
];

const ENABLED_STYLE_IDS = new Set(["latin", "ballroom"]);
const PASO_CRASH_BUTTON_LABELS = {
  crash1: "1st crash",
  crash2: "2nd crash",
  crash3: "3rd crash",
};

const SONG_MIN_SECONDS = 60;
const SONG_MAX_SECONDS = 180;
const SONG_STEP_SECONDS = 5;
const DEFAULT_SONG_SECONDS = 90;
const SPEED_MIN_PERCENT = 50;
const SPEED_MAX_PERCENT = 120;
const SPEED_STEP_PERCENT = 5;
const DEFAULT_SPEED_PERCENT = 100;
const ACTIVE_FONT_SIZE = "1.5rem";
const UPCOMING_FONT_SIZE = "1.25rem";
const BACKGROUND_COLOR = "#30333a";
const TEXT_COLOR = "#f2f4f7";
const HIGHLIGHT_COLOR = "#25ed75";

function buildExpandedRound(songs, repeatCount) {
  if (!Array.isArray(songs) || repeatCount <= 0) {
    return [];
  }

  return songs.flatMap((song, baseIndex) => {
    const safeRepeatCount = Number.isInteger(repeatCount) ? Math.max(repeatCount, 1) : 1;
    const baseKey = song?.id ?? song?.filename ?? song?.file ?? baseIndex;

    return Array.from({ length: safeRepeatCount }, (_, repeatIndex) => ({
      ...song,
      repeatSlot: repeatIndex + 1,
      repeatTotal: safeRepeatCount,
      repeatBaseIndex: baseIndex,
      repeatQueueKey: `${baseKey}-${repeatIndex + 1}`,
    }));
  });
}

function msToSeconds(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return null;
  return ms / 1000;
}

function getClipStartSeconds(song) {
  const seconds = msToSeconds(song?.startMs ?? null);
  return seconds != null && Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function getClipEndSeconds(song) {
  const seconds = msToSeconds(song?.endMs ?? null);
  return seconds != null && Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function getClipDurationSeconds(song) {
  const endSeconds = getClipEndSeconds(song);
  const startSeconds = getClipStartSeconds(song);
  if (endSeconds != null && endSeconds > startSeconds) {
    return endSeconds - startSeconds;
  }
  return null;
}

function formatTime(timeInSeconds) {
  if (!Number.isFinite(timeInSeconds)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(timeInSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function PlayerApp() {
  const {
    isAuthenticated,
    isUnauthenticated,
    isAdmin,
    login,
    authError,
    clearAuthError,
    isProcessingLogin,
    user,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [roundSource, setRoundSource] = useState([]);
  const [roundHeatMode, setRoundHeatMode] = useState(DEFAULT_HEAT_MODE);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
  const [upcomingIndex, setUpcomingIndex] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showModeModal, setShowModeModal] = useState(false);
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
  const [selectedCrash, setSelectedCrash] = useState(null);
  const [roundAuthBlocked, setRoundAuthBlocked] = useState(false);
  const [roundPlaybackSpeedPercent, setRoundPlaybackSpeedPercent] = useState(
    DEFAULT_SPEED_PERCENT,
  );
  const [practicePlaybackSpeedPercent, setPracticePlaybackSpeedPercent] = useState(
    DEFAULT_SPEED_PERCENT,
  );
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const roundRepeatCount = ROUND_HEAT_REPEAT_MAP[roundHeatMode] ?? 1;
  const round = useMemo(
    () => buildExpandedRound(roundSource, roundRepeatCount),
    [roundSource, roundRepeatCount],
  );
  const roundPlaybackRate = useMemo(() => {
    const clampedPercent = Math.min(
      Math.max(roundPlaybackSpeedPercent, SPEED_MIN_PERCENT),
      SPEED_MAX_PERCENT,
    );
    return clampedPercent / 100;
  }, [roundPlaybackSpeedPercent]);
  const practicePlaybackRate = useMemo(() => {
    const clampedPercent = Math.min(
      Math.max(practicePlaybackSpeedPercent, SPEED_MIN_PERCENT),
      SPEED_MAX_PERCENT,
    );
    return clampedPercent / 100;
  }, [practicePlaybackSpeedPercent]);
  const currentPracticeTrack = useMemo(
    () => practicePlaylist?.tracks?.[practiceTrackIndex] ?? null,
    [practicePlaylist, practiceTrackIndex],
  );
  const currentPracticeDanceId = practicePlaylist?.danceId ?? null;
  const normalizedPracticeDanceId = currentPracticeDanceId
    ? currentPracticeDanceId.toLowerCase()
    : null;
  const normalizedPracticeLoadingDanceId = practiceLoadingDance
    ? practiceLoadingDance.toLowerCase()
    : null;
  const isPasoPracticeContext =
    selectedMode === "practice" &&
    (normalizedPracticeDanceId === PASO_DANCE_ID ||
      normalizedPracticeLoadingDanceId === PASO_DANCE_ID);
  const isLatinRoundMode = selectedMode === "round" && selectedStyle === "latin";
  const pasoPracticeMetadata = useMemo(
    () => (isPasoPracticeContext ? currentPracticeTrack ?? null : null),
    [isPasoPracticeContext, currentPracticeTrack],
  );
  const pasoCrashOptions = useMemo(
    () => (pasoPracticeMetadata ? getCrashOptions(pasoPracticeMetadata) : []),
    [pasoPracticeMetadata],
  );
  const hasPasoCrashMetadata = pasoCrashOptions.length > 0;
  const allowCrashSelection = isPasoPracticeContext || isLatinRoundMode;
  const getActiveCrashSeconds = useCallback(
    (song) => getCrashSeconds(song, selectedCrash),
    [selectedCrash],
  );
  const getActiveCrashDurationFromClip = useCallback(
    (song) => getCrashRelativeDurationSeconds(song, selectedCrash, getClipStartSeconds(song)),
    [selectedCrash],
  );
  const audioRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const breakIntervalRef = useRef(null);
  const activationAudioRef = useRef(null);
  const hasPrimedAudioRef = useRef(false);
  const practiceAudioRef = useRef(null);
  const practiceAdvancingRef = useRef(false);
  const pendingRoundStyleRef = useRef(null);
  const authPromptReasonRef = useRef(null);
  const authPromptTimeoutRef = useRef(null);
  const authMenuContainerRef = useRef(null);
  const userSelectedCrashRef = useRef(false);

  // Prevent duplicate advancing
  const advancingRef = useRef(false);

  const handleToggleAuthMenu = useCallback(() => {
    setIsAuthMenuOpen((prev) => !prev);
  }, []);

  const handleOpenAdminLibrary = useCallback(() => {
    setIsAuthMenuOpen(false);
    navigate("/admin/library");
  }, [navigate]);

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

  const clearBreakInterval = useCallback(() => {
    if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = null;
    }
  }, []);

  const clearPlayTimeout = useCallback(() => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
  }, []);

  const clearAuthPromptTimeout = useCallback(() => {
    if (authPromptTimeoutRef.current) {
      clearTimeout(authPromptTimeoutRef.current);
      authPromptTimeoutRef.current = null;
    }
  }, []);

  const clearFadeTimers = useCallback(({ resetVolume = false } = {}) => {
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
  }, []);

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

  useEffect(() => {
    if (!isAuthMenuOpen) {
      return undefined;
    }

    const handleOutsideInteraction = (event) => {
      if (
        authMenuContainerRef.current &&
        !authMenuContainerRef.current.contains(event.target)
      ) {
        setIsAuthMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction);

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
    };
  }, [isAuthMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAuthMenuOpen(false);
    }
  }, [isAuthenticated]);

  const stopRoundPlayback = useCallback(() => {
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
  }, [clearBreakInterval, clearFadeTimers, clearPlayTimeout]);

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

  const getRoundDurationLimitSeconds = useCallback(
    (track, sliderOverrideSeconds = songDurationSeconds) => {
      const clipDuration = getClipDurationSeconds(track);
      const isPasoRoundTrack = isLatinRoundMode && isPasoSong(track);
      const crashDuration = isPasoRoundTrack ? getActiveCrashDurationFromClip(track) : null;
      const sliderDuration = isPasoRoundTrack ? null : sliderOverrideSeconds;

      const candidates = [];
      if (clipDuration != null) candidates.push(clipDuration);
      if (crashDuration != null) candidates.push(crashDuration);
      if (sliderDuration != null) candidates.push(sliderDuration);

      if (candidates.length === 0) {
        return songDurationSeconds;
      }

      return Math.min(...candidates);
    },
    [getActiveCrashDurationFromClip, isLatinRoundMode, songDurationSeconds],
  );

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

  const getPreviousIndex = () => {
    if (round.length === 0) return null;

    const effectiveIndex =
      currentIndex !== null
        ? currentIndex
        : upcomingIndex !== null
        ? upcomingIndex
        : null;

    if (effectiveIndex === null || effectiveIndex <= 0) {
      return null;
    }

    return effectiveIndex - 1;
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
  const generateRound = useCallback(
    async (styleParam = null) => {
      const style = styleParam ?? selectedStyle;

      if (!style) {
        console.warn("No style selected yet.");
        return;
      }

      if (!ENABLED_STYLE_IDS.has(style)) {
        console.warn(`Round generation for ${style} not wired up yet.`);
        return;
      }

      try {
        console.debug("[round] fetching round", style);
        const res = await fetchWithOrigin(`/api/round?style=${encodeURIComponent(style)}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (res.status === 401) {
          console.debug("[round] fetch 401", {
            style,
            existingRoundLength: roundSource.length,
          });
          pendingRoundStyleRef.current = style;
          authPromptReasonRef.current = "round-generation";
          setRoundAuthBlocked(true);
          return;
        }

        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to load round");
        }

        pendingRoundStyleRef.current = null;
        clearBreakInterval();
        clearPlayTimeout();
        setRoundAuthBlocked(false);
        const normalizedData = Array.isArray(data) ? data : [];
        console.debug("[round] fetch success", {
          style,
          trackCount: normalizedData.length,
        });
        setRoundSource(normalizedData);
        setCurrentIndex(null);
        setBreakTimeLeft(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setUpcomingIndex(null);
        advancingRef.current = false;
      } catch (error) {
        console.error("Error fetching round:", error);
      }
    },
    [clearBreakInterval, clearPlayTimeout, roundSource.length, selectedStyle]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      console.debug("[auth] user not authenticated");
      return;
    }

    console.debug("[auth] user authenticated", user?.uid);
    clearAuthPromptTimeout();
    setShowAuthModal(false);
    setRoundAuthBlocked(false);

    if (pendingRoundStyleRef.current) {
      const styleToGenerate = pendingRoundStyleRef.current;
      pendingRoundStyleRef.current = null;
      console.debug("[auth] replaying pending round", styleToGenerate);
      generateRound(styleToGenerate);
    }
  }, [clearAuthPromptTimeout, generateRound, isAuthenticated, user?.uid]);

  const handleEnded = () => {
    clearPlayTimeout();
    clearFadeTimers();
    startBreakThenNext();
  };

  const handlePlay = () => {
    clearFadeTimers({ resetVolume: true });
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
      audioRef.current.playbackRate = roundPlaybackRate;
    }
    setBreakTimeLeft(null);
    setIsPlaying(true);
    schedulePlayTimeout(getRoundDurationLimitSeconds(currentSong));
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
    event.target.playbackRate = roundPlaybackRate;
    setDuration(event.target.duration || 0);
    setCurrentTime(event.target.currentTime || 0);
  };

  const handleProviderLogin = async (providerKey) => {
    try {
      await login(providerKey);
    } catch {
      // Error is surfaced through auth context; suppress to avoid console noise
    }
  };

  const handleSelectStyle = (styleId) => {
    console.debug("[round] select style", {
      styleId,
      previousStyle: selectedStyle,
    });
    if (styleId === selectedStyle) {
      return;
    }

    stopRoundPlayback();
    clearAuthPromptTimeout();
    setSelectedStyle(styleId);

    if (!ENABLED_STYLE_IDS.has(styleId)) {
      return;
    }

    if (selectedMode === "round") {
      generateRound(styleId);
    } else if (selectedMode === "practice") {
      resetPracticeState();
      setPracticeDances([]);
      setPracticeError(null);
      setPracticeDancesLoading(true);
    }
  };

  const handleModeChange = (modeId) => {
    setShowModeModal(false);
    console.debug("[round] mode change", {
      modeId,
      previousMode: selectedMode,
      selectedStyle,
    });
    if (modeId === selectedMode) return;

    clearAuthPromptTimeout();

    if (modeId === "practice") {
      stopRoundPlayback();
      setRoundSource([]);
      setRoundAuthBlocked(false);
    } else {
      resetPracticeState();
      setPracticeDancesLoading(false);
      setPracticeError(null);
      setPracticeDances([]);
    }

    setSelectedMode(modeId);

    if (modeId === "round") {
      setRoundAuthBlocked(false);

      if (selectedStyle && ENABLED_STYLE_IDS.has(selectedStyle)) {
        generateRound(selectedStyle);
      }
    }
  };

  const handleSelectHeatMode = useCallback(
    (modeId) => {
      if (!Object.prototype.hasOwnProperty.call(ROUND_HEAT_REPEAT_MAP, modeId)) {
        return;
      }

      setRoundHeatMode(modeId);
    },
    [setRoundHeatMode],
  );

  const handleSignOut = async () => {
    console.debug("[auth] sign out requested");
    clearAuthPromptTimeout();
    setIsAuthMenuOpen(false);
    await logout();
    console.debug("[auth] sign out complete, round length", round.length);
    stopRoundPlayback();
    setRoundAuthBlocked(false);
  };

  const handleShowSignIn = () => {
    clearAuthError();
    setShowAuthModal(true);
  };

  const handlePracticeRequest = async (
    danceId,
    { forceReload = false } = {}
  ) => {
    console.debug("[practice] request start", {
      danceId,
      forceReload,
      selectedStyle,
      selectedCrash,
    });
    if (isUnauthenticated) {
      clearAuthError();
      setShowAuthModal(true);
      return;
    }

    if (!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)) return;

    if (
      !forceReload &&
      practicePlaylist?.danceId &&
      practicePlaylist.danceId.toLowerCase() === danceId.toLowerCase()
    ) {
      console.debug("[practice] request skipped (already loaded)", { danceId });
      return;
    }

    setPracticeLoadingDance(danceId);
    setPracticeError(null);
    setPracticeIsPlaying(false);

    try {
      const res = await fetchWithOrigin(
        `/api/practice?style=${encodeURIComponent(
          selectedStyle
        )}&dance=${encodeURIComponent(danceId)}`,
        { credentials: "include" }
      );
      const payload = await res.json();
      console.debug("[practice] request success", {
        danceId,
        trackCount: Array.isArray(payload.tracks) ? payload.tracks.length : null,
        tracks: payload.tracks?.map((track, idx) => ({
          index: idx,
          id: track.id ?? track.songId ?? null,
          filename: track.filename ?? track.title ?? null,
          crash1Ms: track.crash1Ms ?? null,
          crash2Ms: track.crash2Ms ?? null,
          crash3Ms: track.crash3Ms ?? null,
        })),
      });

      if (res.status === 401) {
        clearAuthError();
        setShowAuthModal(true);
        setPracticeLoadingDance(null);
        setPracticeError(null);
        return;
      }

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
      console.debug("[practice] playlist set", {
        danceId,
        trackCount: payload.tracks.length,
        firstTrack: payload.tracks[0] ?? null,
      });
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
    const nextIndex = getNextIndex();
    if (nextIndex === null) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    clearPlayTimeout();
    clearBreakInterval();
    clearFadeTimers({ resetVolume: true });

    advancingRef.current = false;
    setBreakTimeLeft(null);
    setUpcomingIndex(null);
    setIsPlaying(false);
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setDuration(0);
  };

  const handlePrevious = () => {
    const previousIndex = getPreviousIndex();
    if (previousIndex === null) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    clearPlayTimeout();
    clearBreakInterval();
    clearFadeTimers({ resetVolume: true });

    advancingRef.current = false;
    setBreakTimeLeft(null);
    setUpcomingIndex(null);
    setIsPlaying(false);
    setCurrentIndex(previousIndex);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleTogglePlayback = () => {
    if (isUnauthenticated) {
      console.debug("[round] unauthenticated start, showing prompt");
      authPromptReasonRef.current = "round-start";
      clearAuthPromptTimeout();
      clearAuthError();
      setIsPlaying(false);
      setShowAuthModal(true);
      return;
    }

    if (round.length === 0) {
      return;
    }

    if (roundAuthBlocked || pendingRoundStyleRef.current) {
      console.debug("[round] start requested while blocked", {
        roundAuthBlocked,
        hasPending: Boolean(pendingRoundStyleRef.current),
      });
      if (selectedStyle && ENABLED_STYLE_IDS.has(selectedStyle)) {
        generateRound(selectedStyle);
      }
      return;
    }

    clearAuthPromptTimeout();

    if (breakTimeLeft !== null) {
      const targetIndex =
        upcomingIndex !== null ? upcomingIndex : getNextIndex();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      clearPlayTimeout();
      clearBreakInterval();
      clearFadeTimers({ resetVolume: true });
      advancingRef.current = false;

      setBreakTimeLeft(null);
      setUpcomingIndex(null);
      setIsPlaying(false);

      if (targetIndex !== null) {
        setCurrentIndex(targetIndex);
        setCurrentTime(0);
        setDuration(0);
      } else {
        setCurrentIndex(null);
        setCurrentTime(0);
        setDuration(0);
      }

      return;
    }

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
        const res = await fetchWithOrigin(
          `/api/dances?style=${encodeURIComponent(selectedStyle)}`,
          { credentials: "include" }
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
    if (selectedMode !== "practice") return;
    if (!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)) return;
    if (practiceDancesLoading || practiceLoadingDance) return;
    if (!practiceDances.length) return;
    if (practicePlaylist?.danceId) return;

    const firstDanceId = practiceDances[0]?.id;
    if (firstDanceId) {
      handlePracticeRequest(firstDanceId);
    }
  }, [
    selectedMode,
    selectedStyle,
    practiceDances,
    practiceDancesLoading,
    practiceLoadingDance,
    practicePlaylist?.danceId,
    handlePracticeRequest,
  ]);

  useEffect(() => {
    if (round.length === 0) {
      return;
    }
    stopRoundPlayback();
  }, [round.length, roundHeatMode, stopRoundPlayback]);

  useEffect(() => {
    console.debug("[round] state change", {
      length: round.length,
      sample: round[0]?.file ?? null,
    });
  }, [round]);

  useEffect(() => {
    console.debug("[round] auth block flag", roundAuthBlocked);
  }, [roundAuthBlocked]);

  useEffect(() => {
    if (!allowCrashSelection) {
      userSelectedCrashRef.current = false;
      if (selectedCrash !== null) {
        setSelectedCrash(null);
      }
    }
  }, [allowCrashSelection, selectedCrash]);

  useEffect(() => {
    const audio = practiceAudioRef.current;
    if (!audio) return;

    if (!practicePlaylist || !practicePlaylist.tracks?.length || !currentPracticeTrack) {
      audio.pause();
      audio.currentTime = 0;
      setPracticeIsPlaying(false);
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
      return;
    }

    audio.pause();
    audio.load();

    const clipStartSeconds = getClipStartSeconds(currentPracticeTrack);
    if (clipStartSeconds > 0 && audio.duration && clipStartSeconds < audio.duration) {
      try {
        audio.currentTime = clipStartSeconds;
      } catch (err) {
        console.warn("Failed to seek practice audio to clip start", err);
      }
    } else {
      audio.currentTime = clipStartSeconds;
    }

    audio.playbackRate = practicePlaybackRate;
    audio
      .play()
      .catch((err) => {
        console.error("Practice play error:", err);
        setPracticeIsPlaying(false);
      });
    setPracticeCurrentTime(0);
    setPracticeDuration(0);
  }, [practicePlaylist, practiceTrackIndex, currentPracticeTrack, practicePlaybackRate]);

  useEffect(() => {
    if (!practicePlaylist?.tracks) return;
    console.debug("[practice] track index updated", {
      practiceTrackIndex,
      total: practicePlaylist.tracks.length,
      track: practicePlaylist.tracks[practiceTrackIndex] ?? null,
      selectedCrash,
    });
  }, [practiceTrackIndex, practicePlaylist, selectedCrash]);

  useEffect(() => {
    practiceAdvancingRef.current = false;
  }, [practiceTrackIndex, practicePlaylist, selectedCrash]);

  useEffect(() => {
    if (selectedStyle && showWelcomeModal) {
      setShowWelcomeModal(false);
    }
  }, [selectedStyle, showWelcomeModal]);

  useEffect(() => {
    if (selectedStyle && selectedMode === null && !showWelcomeModal) {
      setShowModeModal(true);
    }
  }, [selectedStyle, selectedMode, showWelcomeModal]);

  const handlePracticeTrackCompletion = useCallback(() => {
    if (practiceAdvancingRef.current) {
      console.debug("[practice] track completion suppressed", {
        practiceTrackIndex,
        selectedCrash,
      });
      return;
    }
    practiceAdvancingRef.current = true;
    const tracksLength = practicePlaylist?.tracks?.length ?? 0;
    console.debug("[practice] track completion", {
      tracksLength,
      practiceTrackIndex,
      selectedCrash,
    });
    setPracticeIsPlaying(false);
    setPracticeTrackIndex((prev) => {
      if (tracksLength === 0) return prev;
      const nextIndex = prev + 1;
      if (nextIndex < tracksLength) {
        console.debug("[practice] advancing to next track", {
          from: prev,
          to: nextIndex,
          total: tracksLength,
        });
        return nextIndex;
      }
      console.debug("[practice] end of playlist reached", {
        current: prev,
        total: tracksLength,
      });
      return prev;
    });

    if (
      currentPracticeDanceId &&
      tracksLength > 0 &&
      practiceTrackIndex >= tracksLength - 1
    ) {
      handlePracticeRequest(currentPracticeDanceId, { forceReload: true });
    } else {
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
    }
  }, [
    practicePlaylist,
    practiceTrackIndex,
    currentPracticeDanceId,
    handlePracticeRequest,
    practiceAdvancingRef,
    selectedCrash,
  ]);

  const handlePracticeTimeUpdate = (event) => {
    const audio = event.target;
    const track = currentPracticeTrack;
    if (!track) {
      setPracticeCurrentTime(0);
      return;
    }

    const clipStartSeconds = getClipStartSeconds(track);
    const clipEndSeconds = getClipEndSeconds(track);
    const crashSeconds = getActiveCrashSeconds(track);
    const currentSeconds = audio.currentTime || 0;

    setPracticeCurrentTime(Math.max(currentSeconds - clipStartSeconds, 0));

    const reachedClip = clipEndSeconds != null && currentSeconds >= clipEndSeconds - 0.05;
    const reachedCrash = crashSeconds != null && currentSeconds >= crashSeconds - 0.05;

    if (reachedClip || reachedCrash) {
      console.debug("[practice] reached cutoff", {
        reachedClip,
        reachedCrash,
        currentSeconds,
        crashSeconds,
        clipEndSeconds,
        selectedCrash,
        practiceTrackIndex,
      });
      audio.pause();
      handlePracticeTrackCompletion();
    }
  };

  const handlePracticeLoadedMetadata = (event) => {
    const audio = event.target;
    audio.playbackRate = practicePlaybackRate;
    const track = currentPracticeTrack;
    if (!track) {
      setPracticeDuration(audio.duration || 0);
      setPracticeCurrentTime(audio.currentTime || 0);
      return;
    }

    const clipStartSeconds = getClipStartSeconds(track);
    if (clipStartSeconds > 0 && audio.duration && clipStartSeconds < audio.duration) {
      try {
        audio.currentTime = clipStartSeconds;
      } catch (err) {
        console.warn("Failed to seek practice audio to clip start", err);
      }
    } else {
      audio.currentTime = clipStartSeconds;
    }

    const rawDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const clipDuration = getClipDurationSeconds(track);
    let effectiveDuration =
      clipDuration != null ? Math.min(rawDuration, clipDuration) : rawDuration;
    const crashDuration = getActiveCrashDurationFromClip(track);
    if (crashDuration != null) {
      effectiveDuration = Math.min(effectiveDuration, crashDuration);
    }

    setPracticeDuration(effectiveDuration || 0);
    setPracticeCurrentTime(0);
  };

  const renderOnboardingIndicators = (activeStep) => (
    <div
      className={`welcome-modal-indicators step-${activeStep}`}
      role="img"
      aria-label={`Step ${activeStep} of 2`}
    >
      {[1, 2].map((step) => (
        <div key={step} className="welcome-modal-indicator-slot">
          <span
            className={`welcome-modal-indicator${step === activeStep ? " active" : ""}`}
            aria-hidden="true"
          />
          <span className="welcome-modal-indicator-label">{`Step ${step}`}</span>
        </div>
      ))}
    </div>
  );

  const handlePracticeToggle = () => {
    const audio = practiceAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.playbackRate = practicePlaybackRate;
      audio
        .play()
        .catch((err) => console.error("Practice play error:", err));
    } else {
      audio.pause();
    }
  };

  const handlePracticePrevious = () => {
    setPracticeTrackIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setPracticeCurrentTime(0);
    setPracticeDuration(0);
    setPracticeIsPlaying(false);
    const audio = practiceAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  useEffect(() => {
    const roundAudio = audioRef.current;
    if (roundAudio) {
      roundAudio.playbackRate = roundPlaybackRate;
    }
  }, [roundPlaybackRate]);

  useEffect(() => {
    const practiceAudio = practiceAudioRef.current;
    if (practiceAudio) {
      practiceAudio.playbackRate = practicePlaybackRate;
    }
  }, [practicePlaybackRate]);

  useEffect(() => {
    // Reset playback indicators whenever we load a new track
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });
  }, [currentIndex, round, clearPlayTimeout, clearFadeTimers]);

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
      clearAuthPromptTimeout();
    },
    [clearAuthPromptTimeout, clearBreakInterval, clearPlayTimeout, clearFadeTimers]
  );

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
  const practicePlaylistLength = practicePlaylist?.tracks?.length ?? 0;
  const practiceCanGoPrevious = practiceTrackIndex > 0;
  const practiceCanGoNext =
    practicePlaylistLength > 0 && practiceTrackIndex < practicePlaylistLength - 1;
  const practiceNowPlayingLabel = (() => {
    if (currentPracticeTrack?.file) {
      return getDisplayName(currentPracticeTrack.file);
    }
    if (practicePlaylistLength > 0) {
      return `Practice playlist ready (${practicePlaylistLength} track${
        practicePlaylistLength === 1 ? "" : "s"
      })`;
    }
    return "Practice not loaded yet";
  })();
  const practiceDanceButtonsMarkup =
    practiceDances.length > 0
      ? (
          <div className="practice-dance-button-group">
            {practiceDances.map((dance) => (
              <button
                key={dance.id}
                type="button"
                className={`neomorphus-button${
                  practicePlaylist?.danceId === dance.id ? " active" : ""
                }`}
                disabled={practiceLoadingDance === dance.id || practiceDancesLoading}
                onClick={() => handlePracticeRequest(dance.id)}
              >
                {practiceLoadingDance === dance.id ? "Loading..." : dance.label}
              </button>
            ))}
          </div>
        )
      : null;
  const practiceDanceContent =
    practiceDanceButtonsMarkup ?? (
      <p className="practice-dance-empty">
        {practiceDancesLoading ? "Loading dances..." : "No dances available."}
      </p>
    );
  const practiceQueueContent =
    practicePlaylist?.tracks?.length
      ? (
          <ol className="practice-queue-list">
            {practicePlaylist.tracks.map((track, idx) => (
              <li
                key={track.id ?? track.file ?? idx}
                className={idx === practiceTrackIndex ? "practice-queue-item practice-queue-item--active" : "practice-queue-item"}
              >
                {getDisplayName(track.file)}
                {idx === practiceTrackIndex ? " (current)" : ""}
              </li>
            ))}
          </ol>
        )
      : (
          <p className="practice-queue-empty">
            No practice tracks loaded yet.
          </p>
        );
  const pasoPracticeCrashButtonsMarkup =
    isPasoPracticeContext && hasPasoCrashMetadata
      ? (
          <div className="practice-paso-crash-buttons">
            <span className="practice-paso-crash-heading">Crash Cutoff</span>
            <div className="practice-paso-crash-button-group">
              {pasoCrashOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`neomorphus-button${
                    selectedCrash === option.id ? " active" : ""
                  }`}
                  onClick={() => setSelectedCrash(option.id)}
                >
                  {PASO_CRASH_BUTTON_LABELS[option.id] ?? option.label}
                  {option.seconds != null ? ` (${formatTime(option.seconds)})` : ""}
                </button>
              ))}
            </div>
          </div>
        )
      : null;

  const previousIndexCandidate = getPreviousIndex();
  const nextIndexCandidate = getNextIndex();
  const canGoPrevious = previousIndexCandidate !== null;
  const canGoNext = nextIndexCandidate !== null;
  const startButtonLabel = isPlaying
    ? "Pause Round"
    : breakTimeLeft !== null
    ? "Resume Round"
    : currentIndex === null
    ? "Start Round"
    : "Play Round";
  const startButtonIcon = isPlaying
    ? "⏸️"
    : breakTimeLeft !== null
    ? "⏯️"
    : "▶️";
  const startButtonAriaLabel = isPlaying
    ? "Pause round playback"
    : breakTimeLeft !== null
    ? "Resume round playback"
    : "Start round playback";
  const isStartDisabled =
    round.length === 0 && !roundAuthBlocked && !pendingRoundStyleRef.current;
  const currentSong = currentIndex !== null ? round[currentIndex] : null;
  const upcomingSong = upcomingIndex !== null ? round[upcomingIndex] : null;
  const roundDurationLimitSeconds = getRoundDurationLimitSeconds(currentSong);
  const effectiveDuration = duration
    ? Math.min(duration, roundDurationLimitSeconds)
    : roundDurationLimitSeconds;
  const effectiveCurrentTime = Math.min(currentTime, effectiveDuration);
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      effectiveDuration > 0 ? (effectiveCurrentTime / effectiveDuration) * 100 : 0,
    ),
  );
  const isPasoRoundTrack = isLatinRoundMode && isPasoSong(currentSong);
  const roundPasoReferenceTrack = useMemo(
    () => (isLatinRoundMode ? round.find((song) => isPasoSong(song)) ?? null : null),
    [isLatinRoundMode, round],
  );
  const roundPasoCrashOptions = useMemo(
    () => (roundPasoReferenceTrack ? getCrashOptions(roundPasoReferenceTrack) : []),
    [roundPasoReferenceTrack],
  );
  const handleSelectCrash = (crashId) => {
    userSelectedCrashRef.current = true;
    setSelectedCrash(crashId);
    if (isPasoRoundTrack && isPlaying) {
      schedulePlayTimeout(getRoundDurationLimitSeconds(currentSong));
    }
  };
  useEffect(() => {
    if (!allowCrashSelection || userSelectedCrashRef.current) {
      return;
    }
    if (!roundPasoCrashOptions.length) {
      return;
    }
    const closest = roundPasoCrashOptions.reduce(
      (best, option) => {
        const diff = Math.abs((option.seconds ?? 0) - songDurationSeconds);
        if (!best || diff < best.diff) {
          return { id: option.id, diff };
        }
        return best;
      },
      null,
    );
    if (closest && closest.id && closest.id !== selectedCrash) {
      setSelectedCrash(closest.id);
    }
  }, [
    allowCrashSelection,
    roundPasoCrashOptions,
    selectedCrash,
    songDurationSeconds,
    userSelectedCrashRef,
  ]);
  let currentHeatLabel = null;
  if (roundRepeatCount > 1) {
    const hasRoundProgress = currentIndex !== null || breakTimeLeft !== null;
    if (!hasRoundProgress) {
      currentHeatLabel = `${roundRepeatCount} Heats`;
    } else {
      const heatLabelCandidate =
        breakTimeLeft !== null
          ? upcomingSong ?? currentSong ?? round[0] ?? null
          : currentSong ?? upcomingSong ?? round[0] ?? null;
      const heatLabelTotal =
        heatLabelCandidate?.repeatTotal && heatLabelCandidate.repeatTotal > 1
          ? heatLabelCandidate.repeatTotal
          : roundRepeatCount;
      const heatLabelSlotCandidate = heatLabelCandidate?.repeatSlot;
      const heatLabelSlot =
        heatLabelSlotCandidate && heatLabelSlotCandidate > 0
          ? heatLabelSlotCandidate
          : currentIndex !== null
          ? (round[currentIndex]?.repeatSlot ?? 1)
          : 1;

      if (heatLabelTotal > 1 && heatLabelSlot > 0) {
        currentHeatLabel = `Heat ${heatLabelSlot}`;
      }
    }
  }
  const heatSuffix = currentHeatLabel ? ` • ${currentHeatLabel}` : "";

  const durationControls =
    selectedStyle !== null ? (
      <div
        className="round-controls"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          width: "100%",
        }}
      >
        <div>
          <div className="slider-label-row">
            <label htmlFor="break-duration-slider">Break Duration</label>
            <span className="slider-value">{breakDurationSeconds} seconds</span>
          </div>
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
          <div className="slider-label-row">
            <label htmlFor="round-playback-speed-slider">Speed</label>
            <span className="slider-value">{roundPlaybackSpeedPercent}%</span>
          </div>
          <input
            id="round-playback-speed-slider"
            type="range"
            min={SPEED_MIN_PERCENT}
            max={SPEED_MAX_PERCENT}
            step={SPEED_STEP_PERCENT}
            value={roundPlaybackSpeedPercent}
            className="neomorphus-slider"
            onChange={(e) => {
              const nextValue = Number(e.target.value);
              if (!Number.isFinite(nextValue)) {
                return;
              }
              setRoundPlaybackSpeedPercent(
                Math.min(Math.max(nextValue, SPEED_MIN_PERCENT), SPEED_MAX_PERCENT),
             );
            }}
          />
        </div>
        {!isPasoPracticeContext && (
          <div>
            <div className="slider-label-row">
              <label htmlFor="song-duration-slider">Song Length</label>
              <span className="slider-value">{formatTime(songDurationSeconds)}</span>
            </div>
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
                  schedulePlayTimeout(getRoundDurationLimitSeconds(currentSong, nextValue));
                }
              }}
            />
          </div>
        )}
        {isLatinRoundMode ? (
          <div className="round-paso-crash-buttons" style={{ width: "100%" }}>
            <span className="round-paso-crash-heading">Paso Doble Crash</span>
            <div className="round-paso-crash-button-group">
              {["crash1", "crash2", "crash3"].map((crashId) => {
                const optionSeconds =
                  roundPasoCrashOptions.find((option) => option.id === crashId)?.seconds ??
                  null;
                const crashTimeLabel =
                  optionSeconds != null ? formatTime(optionSeconds) : "N/A";
                return (
                  <button
                    key={crashId}
                    type="button"
                    className={`neomorphus-button${
                      selectedCrash === crashId ? " active" : ""
                    }`}
                    onClick={() => handleSelectCrash(crashId)}
                  >
                    {PASO_CRASH_BUTTON_LABELS[crashId]} ({crashTimeLabel})
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {selectedMode !== "practice" && (
          <div className="heat-controls">
            <div className="heat-mode-button-group">
              {ROUND_HEAT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`heat-mode-button${
                    roundHeatMode === option.id ? " heat-mode-button--active" : ""
                  }`}
                  onClick={() => handleSelectHeatMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : null;

  const nowPlayingLabel = (() => {
    if (currentIndex !== null && round[currentIndex]?.dance) {
      return `Now Playing (${currentIndex + 1}/${round.length})${heatSuffix}: ${round[currentIndex].dance}`;
    }

    if (breakTimeLeft !== null && upcomingIndex !== null && round[upcomingIndex]?.dance) {
      return `Up Next (${upcomingIndex + 1}/${round.length})${heatSuffix}: ${round[upcomingIndex].dance}`;
    }

    if (round.length > 0) {
      return `Round Ready (${round.length} song${round.length === 1 ? "" : "s"})${heatSuffix}`;
    }

    return "Round not loaded yet";
  })();

  const roundTransportControls =
        selectedMode === "round"
      ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                alignSelf: "stretch",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 600,
                  width: "100%",
                  color:
                    currentIndex !== null && breakTimeLeft === null
                      ? HIGHLIGHT_COLOR
                      : TEXT_COLOR,
                  opacity: round.length === 0 ? 0.75 : 1,
                }}
              >
                {nowPlayingLabel}
              </div>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  className="round-progress-wrapper"
                  style={{ width: "91%", maxWidth: "91%", alignSelf: "center" }}
                >
                  <progress
                    value={effectiveCurrentTime}
                    max={effectiveDuration || 1}
                    className="round-progress"
                  />
                  <div
                    className="round-progress-thumb"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
                <div
                  style={{
                    width: "91%",
                    maxWidth: "91%",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    color: TEXT_COLOR,
                    alignSelf: "center",
                  }}
                >
                  <span>{formatTime(effectiveCurrentTime)}</span>
                  <span>{formatTime(effectiveDuration)}</span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="neomorphus-button round-control"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                aria-label="Previous Song"
                title="Previous Song"
              >
                ⏮️
              </button>
              <button
                type="button"
                className="neomorphus-button round-control"
                onClick={handleTogglePlayback}
                disabled={isStartDisabled}
                aria-label={startButtonAriaLabel}
                title={startButtonLabel}
              >
                {startButtonIcon}
              </button>
              <button
                type="button"
                className="neomorphus-button round-control"
                onClick={handleSkip}
                disabled={!canGoNext}
                aria-label="Next Song"
                title="Next Song"
              >
                ⏭️
              </button>
            </div>
          </div>
        )
      : null;

  const practiceTransportControls =
    selectedMode === "practice"
      ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                alignSelf: "stretch",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 600,
                  width: "100%",
                  color: currentPracticeTrack ? HIGHLIGHT_COLOR : TEXT_COLOR,
                  opacity: practicePlaylistLength === 0 ? 0.75 : 1,
                }}
              >
                {practiceNowPlayingLabel}
              </div>
              <div
                style={{
                  width: "91%",
                  maxWidth: "91%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  className="round-progress-wrapper"
                  style={{ width: "91%", maxWidth: "91%", alignSelf: "center" }}
                >
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
                <div
                  style={{
                    width: "91%",
                    maxWidth: "91%",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    color: TEXT_COLOR,
                    alignSelf: "center",
                  }}
                >
                  <span>{formatTime(practiceEffectiveCurrentTime)}</span>
                  <span>{formatTime(practiceEffectiveDuration)}</span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="neomorphus-button round-control"
                onClick={handlePracticePrevious}
                disabled={!practiceCanGoPrevious}
                aria-label="Previous Practice Track"
                title="Previous Practice Track"
              >
                ⏮️
              </button>
              <button
                type="button"
                className="neomorphus-button round-control"
                onClick={handlePracticeToggle}
                disabled={!currentPracticeTrack?.file}
                aria-label={practiceIsPlaying ? "Pause practice playback" : "Play practice playback"}
                title={practiceIsPlaying ? "Pause Practice" : "Play Practice"}
              >
                {practiceIsPlaying ? "⏸️" : "▶️"}
              </button>
              <button
                type="button"
                className="neomorphus-button round-control"
                onClick={handlePracticeTrackCompletion}
                disabled={!practicePlaylistLength}
                aria-label="Next Practice Track"
                title="Next Practice Track"
              >
                ⏭️
              </button>
            </div>
          </div>
        )
      : null;

  return (
    <>
      {showWelcomeModal && (
        <div className="welcome-modal-backdrop">
          <div
            className="welcome-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-modal-title"
          >
            <h2 id="welcome-modal-title" className="welcome-modal-title">
              What would you like
              <br />
              to dance today?
            </h2>
            {renderOnboardingIndicators(1)}
            <div className="welcome-modal-buttons">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`neomorphus-button welcome-dance-button${
                    selectedStyle === style.id ? " active" : ""
                  }`}
                  onClick={() => {
                    handleSelectStyle(style.id);
                    setShowWelcomeModal(false);
                    setShowModeModal(true);
                  }}
                  disabled={!ENABLED_STYLE_IDS.has(style.id)}
                >
                  {style.label}
                  {style.comingSoon ? <span className="style-coming-soon"> (coming soon)</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showModeModal && (
        <div className="welcome-modal-backdrop">
        <div
          className="welcome-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mode-modal-title"
        >
          <h2 id="mode-modal-title" className="welcome-modal-title">
            What would you like
            <br />
            to dance today?
          </h2>
          {renderOnboardingIndicators(2)}
          <div className="welcome-modal-buttons">
            {MODE_OPTIONS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className="neomorphus-button welcome-dance-button"
                onClick={() => handleModeChange(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          clearAuthError();
        }}
        onSelectProvider={handleProviderLogin}
        isProcessing={isProcessingLogin}
        error={authError}
        onRetry={() => clearAuthError()}
      />
      <header className="app-header">
        <h1 className="app-title app-title-floating">Ballroom DJ</h1>
        {isAuthenticated ? (
          <div className="app-menu-bar" ref={authMenuContainerRef}>
            <button
              type="button"
              className={`neomorphus-button app-menu-button${isAuthMenuOpen ? " app-menu-button--open" : ""}`}
              onClick={handleToggleAuthMenu}
              aria-haspopup="true"
              aria-expanded={isAuthMenuOpen}
              aria-label="Account menu"
            >
              Menu
            </button>
            {isAuthMenuOpen ? (
              <div className="app-menu-dropdown">
                <div className="app-menu-header">
                  <span className="app-menu-text">
                    Signed in{user?.email ? ` as ${user.email}` : ""}
                  </span>
                </div>
                {isAdmin ? (
                  <button
                    type="button"
                    className="app-menu-item"
                    onClick={handleOpenAdminLibrary}
                  >
                    Admin Library
                  </button>
                ) : null}
                <button
                  type="button"
                  className="app-menu-item"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="app-menu-bar">
            <button
              type="button"
              className="neomorphus-button app-menu-button"
              onClick={handleShowSignIn}
            >
              Sign In
            </button>
          </div>
        )}
      </header>

      <div className="app-root">
        <div className="app-shell">
          <div className="style-button-group">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style.id}
                onClick={() => handleSelectStyle(style.id)}
                disabled={!ENABLED_STYLE_IDS.has(style.id)}
                className={`neomorphus-button style-button${
                  selectedStyle === style.id ? " active" : ""
                }`}
              >
                {style.label}
                {style.comingSoon ? <span className="style-coming-soon"> (coming soon)</span> : null}
              </button>
            ))}
          </div>

          <div className="app-shell-body">
            <div className="app-shell-columns">
              <div className="app-shell-column app-shell-column--left">
                {selectedStyle && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginTop: "1.5rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className={`neomorphus-button mode-button${
                          selectedMode === mode.id ? " active" : ""
                        }`}
                        onClick={() => handleModeChange(mode.id)}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                )}

                {durationControls}

                {selectedMode === "practice" && selectedStyle && (
                  ENABLED_STYLE_IDS.has(selectedStyle) ? (
                    <div style={{ marginTop: "1rem" }}>
                      {practiceError && <p style={{ color: "#ff8080" }}>{practiceError}</p>}
                      {practiceDancesLoading && !practiceError && <p>Loading dances...</p>}
                      {pasoPracticeCrashButtonsMarkup}
                      {practicePlaylist?.danceId?.toLowerCase() === "chacha" && null}

                      {currentPracticeTrack && currentPracticeTrack.file && (
                        <div style={{ marginTop: "1rem" }}>
                          <audio
                            ref={practiceAudioRef}
                            src={currentPracticeTrack.file}
                            preload="auto"
                            style={{ display: "none" }}
                            onPlay={() => setPracticeIsPlaying(true)}
                            onPause={() => setPracticeIsPlaying(false)}
                            onLoadedMetadata={handlePracticeLoadedMetadata}
                            onTimeUpdate={handlePracticeTimeUpdate}
                            onEnded={handlePracticeTrackCompletion}
                          onError={(e) =>
                            console.error(
                              "Practice audio error:",
                              e,
                              "URL:",
                              currentPracticeTrack.file
                            )
                          }
                        />
                          {showPracticeControls && null}
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

                {selectedMode === "round" && breakTimeLeft !== null && (
                  <div style={{ marginTop: "1rem" }}>
                    <h3>Next song starts in: {breakTimeLeft} seconds</h3>
                  </div>
                )}
              </div>

              <div className="app-shell-column app-shell-column--right">
                {selectedMode === "practice" && selectedStyle ? (
                  <div className="practice-song-type-panel">
                    {practiceDanceContent}
                    <div className="practice-queue-panel">
                      <h4 className="practice-queue-heading">Queue</h4>
                      {practiceQueueContent}
                    </div>
                  </div>
                ) : selectedMode === "round" ? (
                  roundAuthBlocked ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      {round.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                          {round.map((s, i) => (
                            <li key={i}>{getDisplayName(s.file)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "#b5bac6", margin: 0 }}>
                          Sign in to start this round.
                        </p>
                      )}
                      <button
                        onClick={() => {
                          if (selectedStyle) {
                            generateRound(selectedStyle);
                          }
                        }}
                        disabled={
                          !selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle) || roundAuthBlocked
                        }
                        className="neomorphus-button"
                      >
                        🔄 Reload Round
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      {round.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
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
                              {getDisplayName(s.file)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "#b5bac6", margin: 0 }}>
                          Generate a round to see the queue.
                        </p>
                      )}
                      <button
                        onClick={() => {
                          if (selectedStyle) {
                            generateRound(selectedStyle);
                          }
                        }}
                        disabled={!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)}
                        className="neomorphus-button"
                      >
                        🔄 Reload Round
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            </div>

            {selectedMode === "round" && currentIndex !== null && round[currentIndex]?.file && (
              <div>
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
          </div>

          <div className="app-shell-footer">
            {selectedMode === "practice" ? practiceTransportControls : roundTransportControls}
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerApp />} />
      <Route path="/admin/library" element={<AdminLibrary />} />
      <Route path="*" element={<PlayerApp />} />
    </Routes>
  );
}

export default App;
