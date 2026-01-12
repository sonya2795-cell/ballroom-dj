import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AuthModal from "../components/AuthModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchWithOrigin } from "../utils/apiClient.js";
import PasoCrashSelector from "../components/PasoCrashSelector.jsx";
import {
  isPasoSong,
  getCrashOptions,
  getCrashRelativeDurationSeconds,
  getEarliestAbsoluteCutoff,
  getCrashSeconds,
  PASO_DANCE_ID,
} from "../utils/pasoCrash.js";

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
  { id: "rhythm", label: "Rhythm" },
  { id: "smooth", label: "Smooth" },
];

const MODE_OPTIONS = [
  { id: "round", label: "Round" },
  { id: "practice", label: "Practice" },
];

const ENABLED_STYLE_IDS = new Set(["latin", "ballroom", "rhythm", "smooth"]);
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
const SPEED_STEP_PERCENT = 1;
const DEFAULT_SPEED_PERCENT = 100;
const DANCE_SHORT_LABELS = {
  waltz: "W",
  tango: "T",
  "viennese waltz": "VW",
  foxtrot: "F",
  quickstep: "Q",
  chacha: "C",
  "cha cha": "C",
  samba: "S",
  rumba: "R",
  paso: "PD",
  "paso doble": "PD",
  jive: "J",
};
const BACKGROUND_COLOR = "#30333a";
const TEXT_COLOR = "#f2f4f7";
const HIGHLIGHT_COLOR = "#25ed27";

function getDanceLabel(label, useShort) {
  if (!useShort || !label) return label;
  const key = label.trim().toLowerCase();
  return DANCE_SHORT_LABELS[key] ?? label;
}

function PlayIcon({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 5.25v13.5L18 12 7 5.25z" />
    </svg>
  );
}

function PauseIcon({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path strokeLinecap="round" d="M9 6.5v11M15 6.5v11" />
    </svg>
  );
}

function NextIcon({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function RestartIcon({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12 15.75 4.5"
      />
    </svg>
  );
}

function RefreshIcon({ className, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
      width={24}
      height={24}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0-4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m-4.991 4.99"
      />
    </svg>
  );
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

function extractFilenameFromUrl(url) {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    const name = pathname.split("/").pop();
    return name ? decodeURIComponent(name) : null;
  } catch {
    const fallback = url.split("/").pop();
    return fallback ? decodeURIComponent(fallback) : null;
  }
}

function getSongLabel(song) {
  if (!song) return "Unknown track";
  if (song.title && song.artist) return `${song.title} — ${song.artist}`;
  if (song.title) return song.title;
  if (song.artist) return song.artist;
  if (song.filename) return song.filename;
  if (song.file) {
    const filename = extractFilenameFromUrl(song.file);
    if (filename) return filename;
  }
  return "Unknown track";
}

function getCrashSecondsForSong(song, selectedCrash) {
  if (!song || !selectedCrash) return null;
  if (!isPasoSong(song)) return null;
  return getCrashSeconds(song, selectedCrash);
}

function getCrashDurationFromClip(song, selectedCrash) {
  if (!song || !selectedCrash) return null;
  if (!isPasoSong(song)) return null;
  return getCrashRelativeDurationSeconds(song, selectedCrash, getClipStartSeconds(song));
}

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

function Player() {
  const {
    isAuthenticated,
    login,
    authError,
    clearAuthError,
    isProcessingLogin,
    user,
    logout,
    isAdmin,
  } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [roundSource, setRoundSource] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
  const [isBreakPaused, setIsBreakPaused] = useState(false);
  const [upcomingIndex, setUpcomingIndex] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
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
  const [roundAuthBlocked, setRoundAuthBlocked] = useState(false);
  const [activeBreakTotalSeconds, setActiveBreakTotalSeconds] = useState(null);
  const [roundHeatMode, setRoundHeatMode] = useState(DEFAULT_HEAT_MODE);
  const [playbackSpeedPercent, setPlaybackSpeedPercent] = useState(DEFAULT_SPEED_PERCENT);
  const [selectedCrash, setSelectedCrash] = useState(null);

  const roundRepeatCount = ROUND_HEAT_REPEAT_MAP[roundHeatMode] ?? 1;
  const round = useMemo(
    () => buildExpandedRound(roundSource, roundRepeatCount),
    [roundSource, roundRepeatCount]
  );
  const playbackRate = useMemo(() => {
    const clampedPercent = Math.min(Math.max(playbackSpeedPercent, SPEED_MIN_PERCENT), SPEED_MAX_PERCENT);
    return clampedPercent / 100;
  }, [playbackSpeedPercent]);
  const normalizedSelectedStyle = selectedStyle ? selectedStyle.toLowerCase() : null;
  const isPasoRoundContext = selectedMode === "round" && normalizedSelectedStyle === "latin";
  const currentPracticeDanceId =
    practicePlaylist?.danceId ?? practicePlaylist?.dance ?? null;
  const normalizedPracticeDanceId = currentPracticeDanceId
    ? currentPracticeDanceId.toLowerCase()
    : null;
  const normalizedLoadingDanceId = practiceLoadingDance
    ? practiceLoadingDance.toLowerCase()
    : null;
  const isPasoPracticeContext =
    selectedMode === "practice" &&
    (normalizedPracticeDanceId === PASO_DANCE_ID ||
      normalizedLoadingDanceId === PASO_DANCE_ID);
  const practiceDanceRows = useMemo(() => {
    if (!practiceDances.length) return [];
    const firstRow = practiceDances.slice(0, 3);
    const secondRow = practiceDances.slice(3);
    return [firstRow, secondRow].filter((row) => row.length > 0);
  }, [practiceDances]);
  const shouldShowCrashSelector = isPasoRoundContext;
  const isCrashSelectionActive = isPasoRoundContext || isPasoPracticeContext;
  const getActiveCrashSeconds = useCallback(
    (song) => getCrashSecondsForSong(song, selectedCrash),
    [selectedCrash]
  );
  const getActiveCrashDurationFromClip = useCallback(
    (song) => getCrashDurationFromClip(song, selectedCrash),
    [selectedCrash]
  );
  const pasoRoundMetadata = useMemo(() => {
    if (!isPasoRoundContext) return null;
    return roundSource.find((song) => isPasoSong(song));
  }, [isPasoRoundContext, roundSource]);
  const pasoPracticeMetadata = useMemo(() => {
    if (!isPasoPracticeContext) return null;
    if (practicePlaylist?.tracks?.length) {
      return (
        practicePlaylist.tracks[practiceTrackIndex] ??
        practicePlaylist.tracks[0] ??
        null
      );
    }
    return null;
  }, [isPasoPracticeContext, practicePlaylist, practiceTrackIndex]);
  const pasoMetadataSource = pasoRoundMetadata ?? pasoPracticeMetadata ?? null;
  const pasoCrashOptions = useMemo(() => {
    if (!pasoMetadataSource) return [];
    return getCrashOptions(pasoMetadataSource);
  }, [pasoMetadataSource]);
  const hasPasoCrashMetadata = pasoCrashOptions.length > 0;
  const audioRef = useRef(null);
  const playTimeoutRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const breakIntervalRef = useRef(null);
  const activationAudioRef = useRef(null);
  const hasPrimedAudioRef = useRef(false);
  const practiceAudioRef = useRef(null);
  const playbackToggleButtonRef = useRef(null);
  const breakCountdownRef = useRef(0);
  const pendingRoundStyleRef = useRef(null);
  const authPromptReasonRef = useRef(null);
  const authPromptTimeoutRef = useRef(null);
  const authStatusRef = useRef(null);
  const preStyleFlashRef = useRef(null);
  const schedulePlayTimeoutRef = useRef(() => {});

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

  const schedulePlayTimeoutInternal = useCallback(
    (durationOverrideSeconds = songDurationSeconds) => {
      clearPlayTimeout();
      clearFadeTimers({ resetVolume: true });

      const audio = audioRef.current;
      const currentSong = currentIndex !== null ? round[currentIndex] : null;
      const clipStartSeconds = getClipStartSeconds(currentSong);
      const clipEndSeconds = getClipEndSeconds(currentSong);
      const crashSeconds = getActiveCrashSeconds(currentSong);

      const elapsedSeconds = audio ? audio.currentTime || 0 : 0;
      const elapsedSinceClipStart = Math.max(elapsedSeconds - clipStartSeconds, 0);

      const sliderTargetSeconds = Number.isFinite(durationOverrideSeconds)
        ? durationOverrideSeconds
        : songDurationSeconds;

      const remainingBySlider =
        sliderTargetSeconds != null && Number.isFinite(sliderTargetSeconds)
          ? Math.max(sliderTargetSeconds - elapsedSinceClipStart, 0)
          : null;
      const remainingByClip =
        clipEndSeconds != null ? Math.max(clipEndSeconds - elapsedSeconds, 0) : null;
      const remainingByCrash =
        crashSeconds != null ? Math.max(crashSeconds - elapsedSeconds, 0) : null;

      const remainingCandidates = [remainingBySlider, remainingByClip, remainingByCrash].filter(
        (value) => value != null && Number.isFinite(value)
      );

      if (remainingCandidates.length === 0) {
        if (audio) audio.pause();
        setIsPlaying(false);
        startBreakThenNext();
        return;
      }

      const effectiveRemainingSeconds = Math.min(...remainingCandidates);

      if (!Number.isFinite(effectiveRemainingSeconds) || effectiveRemainingSeconds <= 0) {
        if (audio) audio.pause();
        setIsPlaying(false);
        startBreakThenNext();
        return;
      }

      const remainingMilliseconds = Math.max(effectiveRemainingSeconds * 1000, 0);

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
    },
    [
      songDurationSeconds,
      clearPlayTimeout,
      clearFadeTimers,
      currentIndex,
      round,
      startBreakThenNext,
      getActiveCrashSeconds,
    ]
  );

  useEffect(() => {
    schedulePlayTimeoutRef.current = schedulePlayTimeoutInternal;
  }, [schedulePlayTimeoutInternal]);

  const schedulePlayTimeout = useCallback(
    (durationOverrideSeconds) => {
      schedulePlayTimeoutRef.current(durationOverrideSeconds);
    },
    []
  );

  useEffect(() => {
    if (!isPlaying) return;
    schedulePlayTimeout();
  }, [isPlaying, selectedCrash, schedulePlayTimeout]);

  const getNextIndex = () => {
    if (round.length === 0) return null;
    if (currentIndex === null) return 0;
    if (currentIndex < round.length - 1) return currentIndex + 1;
    return null;
  };

  const cancelBreakCountdown = useCallback(() => {
    clearBreakInterval();
    breakCountdownRef.current = 0;
    setBreakTimeLeft(null);
    setIsBreakPaused(false);
    setUpcomingIndex(null);
    setActiveBreakTotalSeconds(null);
    advancingRef.current = false;
  }, [clearBreakInterval, setActiveBreakTotalSeconds]);

  const beginBreakCountdown = useCallback(
    (initialSeconds, nextIndex, { preserveTotal = false } = {}) => {
      clearBreakInterval();

      const normalizedSeconds = Number.isFinite(initialSeconds)
        ? Math.max(Math.ceil(initialSeconds), 0)
        : 0;

      advancingRef.current = true;
      breakCountdownRef.current = normalizedSeconds;
      setBreakTimeLeft(normalizedSeconds);
      setUpcomingIndex(nextIndex);
      setIsBreakPaused(false);
      if (!preserveTotal) {
        setActiveBreakTotalSeconds(normalizedSeconds);
      }

      if (normalizedSeconds <= 0) {
        setBreakTimeLeft(null);
        setCurrentIndex(nextIndex);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        setUpcomingIndex(null);
        advancingRef.current = false;
        return;
      }

      breakIntervalRef.current = setInterval(() => {
        const nextCountdown = Math.max(breakCountdownRef.current - 1, 0);
        breakCountdownRef.current = nextCountdown;
        setBreakTimeLeft(nextCountdown);

        if (nextCountdown <= 0) {
          clearBreakInterval();
          setBreakTimeLeft(null);
          setCurrentIndex(nextIndex);
          setCurrentTime(0);
          setDuration(0);
          setIsPlaying(false);
          setUpcomingIndex(null);
          setIsBreakPaused(false);
          advancingRef.current = false;
        }
      }, 1000);
    },
    [clearBreakInterval, setActiveBreakTotalSeconds]
  );

  const startBreakThenNext = () => {
    if (advancingRef.current) return;

    clearPlayTimeout();
    clearFadeTimers();

    const nextIndex = getNextIndex();

    if (nextIndex === null) {
      cancelBreakCountdown();
      setCurrentIndex(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    beginBreakCountdown(breakDurationSeconds, nextIndex);
  };

  const pauseBreakCountdown = useCallback(() => {
    if (breakTimeLeft === null) return;
    breakCountdownRef.current = breakTimeLeft;
    clearBreakInterval();
    setIsBreakPaused(true);
  }, [breakTimeLeft, clearBreakInterval]);

  const resumeBreakCountdown = useCallback(() => {
    if (breakTimeLeft === null) return;
    const targetIndex = upcomingIndex;
    if (targetIndex === null || targetIndex === undefined) return;

    const seconds = breakCountdownRef.current > 0 ? breakCountdownRef.current : breakTimeLeft;
    beginBreakCountdown(seconds, targetIndex, { preserveTotal: true });
  }, [beginBreakCountdown, breakTimeLeft, upcomingIndex]);

  const stopRoundPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    cancelBreakCountdown();
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });
    setIsPlaying(false);
    setCurrentIndex(null);
    setCurrentTime(0);
    setDuration(0);
  }, [cancelBreakCountdown, clearFadeTimers, clearPlayTimeout]);

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
        const res = await fetchWithOrigin(`/api/round?style=${encodeURIComponent(style)}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (res.status === 401) {
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
        setRoundSource(Array.isArray(data) ? data : []);
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
    [clearBreakInterval, clearPlayTimeout, selectedStyle]
  );
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    clearAuthPromptTimeout();
    setShowAuthModal(false);
    setRoundAuthBlocked(false);

    if (pendingRoundStyleRef.current) {
      const styleToGenerate = pendingRoundStyleRef.current;
      pendingRoundStyleRef.current = null;
      generateRound(styleToGenerate);
    }
  }, [clearAuthPromptTimeout, generateRound, isAuthenticated, user?.uid]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAuthMenuOpen(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isCrashSelectionActive && selectedCrash !== null) {
      setSelectedCrash(null);
    }
  }, [isCrashSelectionActive, selectedCrash]);

  useEffect(() => {
    if (!isAuthMenuOpen) {
      return undefined;
    }

    const handleOutsideInteraction = (event) => {
      if (authStatusRef.current && !authStatusRef.current.contains(event.target)) {
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
    if (round.length === 0) {
      return;
    }
    stopRoundPlayback();
  }, [round.length, roundHeatMode, stopRoundPlayback]);

  useEffect(() => {
    if (currentIndex === null) return;
    if (currentIndex < round.length) return;

    stopRoundPlayback();
  }, [currentIndex, round.length, stopRoundPlayback]);

  const handleEnded = () => {
    clearPlayTimeout();
    clearFadeTimers();
    startBreakThenNext();
  };

  const handlePlay = () => {
    clearFadeTimers({ resetVolume: true });
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
      audioRef.current.playbackRate = playbackRate;
    }
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
    const audio = event.target;
    const song = currentIndex !== null ? round[currentIndex] : null;
    const clipStartSeconds = getClipStartSeconds(song);
    const clipEndSeconds = getClipEndSeconds(song);
    const crashSeconds = getActiveCrashSeconds(song);
    const currentSeconds = audio.currentTime || 0;
    setCurrentTime(Math.max(currentSeconds - clipStartSeconds, 0));

    const reachedClip = clipEndSeconds != null && currentSeconds >= clipEndSeconds - 0.05;
    const reachedCrash = crashSeconds != null && currentSeconds >= crashSeconds - 0.05;

    if ((reachedClip || reachedCrash) && !advancingRef.current) {
      audio.pause();
      setIsPlaying(false);
      startBreakThenNext();
    }
  };

  const handleLoadedMetadata = (event) => {
    const audio = event.target;
    audio.playbackRate = playbackRate;
    const song = currentIndex !== null ? round[currentIndex] : null;
    const clipStartSeconds = getClipStartSeconds(song);
    if (clipStartSeconds > 0 && audio.duration && clipStartSeconds < audio.duration) {
      try {
        audio.currentTime = clipStartSeconds;
      } catch (err) {
        console.warn("Failed to seek to clip start", err);
      }
    }

    const rawDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    let effectiveDurationSeconds = rawDuration;
    const clipDuration = getClipDurationSeconds(song);
    if (clipDuration != null) {
      effectiveDurationSeconds = Math.min(rawDuration, clipDuration);
    }
    if (Number.isFinite(songDurationSeconds)) {
      effectiveDurationSeconds = Math.min(effectiveDurationSeconds, songDurationSeconds);
    }
    const crashDuration = getActiveCrashDurationFromClip(song);
    if (crashDuration != null) {
      effectiveDurationSeconds = Math.min(effectiveDurationSeconds, crashDuration);
    }

    if (!Number.isFinite(effectiveDurationSeconds) || effectiveDurationSeconds <= 0) {
      effectiveDurationSeconds = rawDuration;
    }

    setDuration(effectiveDurationSeconds || 0);
    setCurrentTime(0);
  };

  const handleProviderLogin = async (providerKey) => {
    try {
      await login(providerKey);
    } catch {
      // Error is surfaced through auth context; suppress to avoid console noise
    }
  };

  const handleSelectStyle = (styleId) => {
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

  const handleSignOut = async () => {
    clearAuthPromptTimeout();
    setIsAuthMenuOpen(false);
    await logout();
    stopRoundPlayback();
    setRoundAuthBlocked(false);
  };

  const handleSelectHeatMode = useCallback(
    (modeId) => {
      if (!Object.prototype.hasOwnProperty.call(ROUND_HEAT_REPEAT_MAP, modeId)) {
        return;
      }

      setRoundHeatMode(modeId);
    },
    [setRoundHeatMode]
  );

  const handleToggleAuthMenu = useCallback(() => {
    setIsAuthMenuOpen((prev) => !prev);
  }, []);

  const handleSettingsClick = useCallback(() => {
    setIsAuthMenuOpen(false);
  }, []);

  const handleAccountClick = useCallback(() => {
    setIsAuthMenuOpen(false);
  }, []);
  const handleRestartRound = () => {
    if (breakTimeLeft !== null) {
      const targetIndex =
        upcomingIndex !== null && upcomingIndex !== undefined
          ? upcomingIndex
          : getNextIndex();

      const hasNext = Number.isInteger(targetIndex) && targetIndex >= 0;

      cancelBreakCountdown();
      clearPlayTimeout();
      clearFadeTimers({ resetVolume: true });

      if (!hasNext) {
        setCurrentIndex(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        return;
      }

      setCurrentIndex(targetIndex);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      return;
    }

    const audio = audioRef.current;
    if (!audio || currentIndex === null) return;

    const song = round[currentIndex];
    const clipStartSeconds = getClipStartSeconds(song);
    audio.currentTime = clipStartSeconds;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        clearFadeTimers({ resetVolume: true });
        schedulePlayTimeout();
      })
      .catch((err) => console.error("Failed to restart round audio", err));
  };

  const handleShowSignIn = () => {
    clearAuthError();
    setShowAuthModal(true);
  };

  const handlePracticeRequest = async (
    danceId,
    { forceReload = false } = {}
  ) => {
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
      const res = await fetchWithOrigin(
        `/api/practice?style=${encodeURIComponent(
          selectedStyle
        )}&dance=${encodeURIComponent(danceId)}`,
        { credentials: "include" }
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

  const handleSkip = () => {
    if (breakTimeLeft !== null) {
      const targetIndex =
        upcomingIndex !== null && upcomingIndex !== undefined
          ? upcomingIndex
          : getNextIndex();

      const hasNext = Number.isInteger(targetIndex) && targetIndex >= 0;

      cancelBreakCountdown();
      clearPlayTimeout();
      clearFadeTimers({ resetVolume: true });

      if (!hasNext) {
        setCurrentIndex(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        return;
      }

      setCurrentIndex(targetIndex);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (currentIndex === null) return;

    if (audioRef.current) {
      audioRef.current.pause();
      const song = round[currentIndex];
      const clipStartSeconds = getClipStartSeconds(song);
      const clipEndSeconds = getClipEndSeconds(song);
      const crashSeconds = getActiveCrashSeconds(song);
      const absoluteCutoff = getEarliestAbsoluteCutoff({
        clipStartSeconds,
        clipEndSeconds,
        durationSeconds: songDurationSeconds,
        crashSeconds,
      });
      audioRef.current.currentTime =
        absoluteCutoff != null
          ? absoluteCutoff
          : clipEndSeconds != null
          ? clipEndSeconds
          : audioRef.current.duration || 0;
    }

    setIsPlaying(false);
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });

    startBreakThenNext();
  };

  const handleTogglePlayback = () => {
    if (!isAuthenticated) {
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
      if (selectedStyle && ENABLED_STYLE_IDS.has(selectedStyle)) {
        generateRound(selectedStyle);
      }
      return;
    }

    clearAuthPromptTimeout();

    if (breakTimeLeft !== null) {
      if (isBreakPaused) {
        resumeBreakCountdown();
      } else {
        pauseBreakCountdown();
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
    const root = preStyleFlashRef.current;
    if (!root) return undefined;

    const clearDelays = () => {
      const existing = root.querySelectorAll('*');
      existing.forEach((node) => {
        node.style.removeProperty('--pre-style-delay');
      });
      root.style.removeProperty('--pre-style-cycle');
    };

    if (!selectedStyle) {
      const assignDelays = () => {
        const nodes = root.querySelectorAll('*');
        const baseDelay = 0.25;
        const totalDuration = Math.max(nodes.length * baseDelay, 1.5);
        root.style.setProperty('--pre-style-cycle', `${totalDuration}s`);

        nodes.forEach((node, index) => {
          node.style.setProperty('--pre-style-delay', `${index * baseDelay}s`);
        });
      };

      assignDelays();

      const observer = new MutationObserver(assignDelays);
      observer.observe(root, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
        clearDelays();
      };
    }

    clearDelays();
    return undefined;
  }, [selectedStyle]);

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
    practiceAudioRef.current.playbackRate = playbackRate;

    if (isAuthenticated) {
      practiceAudioRef.current
        .play()
        .catch((err) => {
          console.error("Practice play error:", err);
          setPracticeIsPlaying(false);
        });
    } else {
      practiceAudioRef.current.pause();
      setPracticeIsPlaying(false);
    }

    setPracticeCurrentTime(0);
    setPracticeDuration(0);
  }, [practicePlaylist, practiceTrackIndex, isAuthenticated, playbackRate]);
  const handlePracticeTimeUpdate = (event) => {
    const audio = event.target;
    const track = practicePlaylist?.tracks?.[practiceTrackIndex] ?? null;
    const clipStartSeconds = getClipStartSeconds(track);
    const clipEndSeconds = getClipEndSeconds(track);
    const crashSeconds = getActiveCrashSeconds(track);
    const currentSeconds = audio.currentTime || 0;
    setPracticeCurrentTime(Math.max(currentSeconds - clipStartSeconds, 0));

    const reachedClip = clipEndSeconds != null && currentSeconds >= clipEndSeconds - 0.05;
    const reachedCrash = crashSeconds != null && currentSeconds >= crashSeconds - 0.05;

    if (reachedClip || reachedCrash) {
      audio.pause();
      handlePracticeTrackCompletion();
    }
  };

  const handlePracticeLoadedMetadata = (event) => {
    const audio = event.target;
    audio.playbackRate = playbackRate;
    const track = practicePlaylist?.tracks?.[practiceTrackIndex] ?? null;
    const clipStartSeconds = getClipStartSeconds(track);
    if (clipStartSeconds > 0 && audio.duration && clipStartSeconds < audio.duration) {
      try {
        audio.currentTime = clipStartSeconds;
      } catch (err) {
        console.warn("Failed to seek practice audio to clip start", err);
      }
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

  const handlePracticeToggle = () => {
    const audio = practiceAudioRef.current;
    if (!audio) return;

    if (!isAuthenticated) {
      authPromptReasonRef.current = "practice-play";
      clearAuthPromptTimeout();
      clearAuthError();
      setPracticeIsPlaying(false);
      setShowAuthModal(true);
      audio.pause();
      return;
    }

    if (audio.paused) {
      audio.playbackRate = playbackRate;
      audio
        .play()
        .catch((err) => console.error("Practice play error:", err));
    } else {
      audio.pause();
    }
  };

  const handlePracticeTrackCompletion = () => {
    setPracticeIsPlaying(false);
    setPracticeTrackIndex((prev) => {
      const tracksLength = practicePlaylist?.tracks?.length ?? 0;
      if (tracksLength === 0) return prev;
      const nextIndex = prev + 1;
      if (nextIndex < tracksLength) {
        return nextIndex;
      }
      return prev;
    });

    const tracksLength = practicePlaylist?.tracks?.length ?? 0;
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
  };

  const handlePracticeRestart = () => {
    const audio = practiceAudioRef.current;
    if (!audio) return;

    const track = practicePlaylist?.tracks?.[practiceTrackIndex] ?? null;
    const clipStartSeconds = getClipStartSeconds(track);
    audio.currentTime = clipStartSeconds;
    audio.playbackRate = playbackRate;
    audio
      .play()
      .then(() => setPracticeIsPlaying(true))
      .catch((err) => console.error("Practice restart error:", err));
  };

  useEffect(() => {
    const roundAudio = audioRef.current;
    if (roundAudio) {
      roundAudio.playbackRate = playbackRate;
    }

    const practiceAudio = practiceAudioRef.current;
    if (practiceAudio) {
      practiceAudio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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

  useEffect(() => {
    if (breakTimeLeft === null) {
      setIsBreakPaused(false);
      breakCountdownRef.current = 0;
      setActiveBreakTotalSeconds(null);
    }
  }, [breakTimeLeft]);

  const effectiveDuration =
    duration && duration > 0 ? Math.min(duration, songDurationSeconds) : songDurationSeconds;
  const effectiveCurrentTime = Math.min(Math.max(currentTime, 0), effectiveDuration);
  const songProgressPercent = Math.min(
    100,
    Math.max(
      0,
      effectiveDuration > 0 ? (effectiveCurrentTime / effectiveDuration) * 100 : 0,
    ),
  );

  const currentPracticeTrack =
    practicePlaylist?.tracks?.[practiceTrackIndex] ?? null;
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

  const roundDisplayItems = useMemo(() => {
    const seen = new Set();
    const items = [];

    round.forEach((song, index) => {
      const baseIndex = song?.repeatBaseIndex ?? index;
      if (seen.has(baseIndex)) return;
      seen.add(baseIndex);

      const clipDurationSeconds = getClipDurationSeconds(song);
      const fallbackDurationSeconds = msToSeconds(song?.durationMs ?? null);

      items.push({
        baseIndex,
        song,
        repeatTotal: song?.repeatTotal ?? 1,
        displayDurationSeconds: (() => {
          const durationCandidates = [];
          if (clipDurationSeconds != null) {
            durationCandidates.push(clipDurationSeconds);
          }
          if (fallbackDurationSeconds != null) {
            durationCandidates.push(fallbackDurationSeconds);
          }
          const crashDurationSeconds = getActiveCrashDurationFromClip(song);
          if (crashDurationSeconds != null) {
            durationCandidates.push(crashDurationSeconds);
          }
          if (durationCandidates.length === 0) {
            return null;
          }
          return Math.min(...durationCandidates);
        })(),
      });
    });

    return items;
  }, [round]);

  const activeRepeatBaseIndex = useMemo(() => {
    if (currentIndex === null || currentIndex === undefined) return null;
    const currentSong = round[currentIndex];
    if (!currentSong) return null;
    return currentSong.repeatBaseIndex ?? currentIndex;
  }, [currentIndex, round]);

  const upcomingRepeatBaseIndex = useMemo(() => {
    if (upcomingIndex === null || upcomingIndex === undefined) return null;
    const upcomingSong = round[upcomingIndex];
    if (!upcomingSong) return null;
    return upcomingSong.repeatBaseIndex ?? upcomingIndex;
  }, [round, upcomingIndex]);

  const practiceDanceButtonsMarkup =
    practiceDanceRows.length > 0
      ? (
          <div className="practice-dance-button-group practice-dance-button-group--two-rows">
            {practiceDanceRows.map((row, rowIndex) => (
              <div
                key={`practice-dance-row-${rowIndex}`}
                className={`practice-dance-button-row practice-dance-button-row--${
                  rowIndex === 0 ? "first" : "second"
                }`}
              >
                {row.map((dance) => (
                  <button
                    key={dance.id}
                    type="button"
                    className={`neomorphus-button${
                      practicePlaylist?.danceId === dance.id ? " active" : ""
                    }`}
                    disabled={practiceLoadingDance === dance.id || practiceDancesLoading}
                    onClick={() => handlePracticeRequest(dance.id)}
                  >
                    {practiceLoadingDance === dance.id
                      ? "Loading..."
                      : getDanceLabel(dance.label, isNarrowLayout)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )
      : null;

  const pasoPracticeCrashButtonsMarkup =
    isPasoPracticeContext && hasPasoCrashMetadata
      ? (
          <div className="practice-paso-crash-buttons">
            <span className="practice-paso-crash-heading">Paso Doble Crash</span>
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

  const practiceDanceContent =
    practiceDanceButtonsMarkup ?? (
      <p className="practice-dance-empty">
        {practiceDancesLoading ? "Loading dances..." : "No dances available."}
      </p>
    );

  const practiceDanceSelectorMarkup =
    selectedMode === "practice" &&
    selectedStyle &&
    ENABLED_STYLE_IDS.has(selectedStyle)
      ? (
          <div className="practice-dance-row">
            <div className="practice-dance-column">{practiceDanceContent}</div>
            {pasoPracticeCrashButtonsMarkup}
          </div>
        )
      : null;

  const practiceQueuePreview = currentPracticeTrack ? [currentPracticeTrack] : [];
  const practiceQueuePreviewMarkup =
    practiceQueuePreview.length > 0
      ? (
          <div className="practice-queue-preview">
            {practiceQueuePreview.map((track, idx) => {
              if (!track) {
                return null;
              }

              const isCurrent = idx === 0;

              const trackClassName = `practice-queue-preview-track${
                isCurrent ? " practice-queue-preview-track-current" : ""
              }`;

              return (
                <div
                  key={`${track.id ?? track.filename ?? track.file ?? idx}-preview`}
                  className={`practice-queue-preview-item${
                    isCurrent ? " practice-queue-preview-item-current" : ""
                  }`}
                >
                  <span className={trackClassName}>{getSongLabel(track)}</span>
                </div>
              );
            })}
          </div>
        )
      : null;
  const isPracticeToggleShowingPause = practiceIsPlaying;
  const practiceToggleAriaLabel = practiceIsPlaying ? "Pause" : "Play";
  const isPracticeRestartDisabled = !practiceAudioRef.current;
  const isPracticeNextDisabled = (practicePlaylist?.tracks?.length ?? 0) === 0;
  const practiceControlsMarkup =
    selectedMode === "practice" &&
    showPracticeControls &&
    currentPracticeTrack &&
    currentPracticeTrack.file
      ? (
          <>
            {practiceQueuePreviewMarkup}
              <div className="audio-control-container">
                <div className="playback-progress-row">
                  <span className="playback-time playback-time-elapsed">
                    {formatTime(practiceEffectiveCurrentTime)}
                  </span>
                <div className="round-progress-shell playback-progress-shell">
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
                </div>
                <span className="playback-time playback-time-total">
                  {formatTime(practiceEffectiveDuration)}
                </span>
              </div>
              <div className="audio-control-buttons">
                <button
                  type="button"
                  className="neomorphus-button playback-round-button"
                  onClick={handlePracticeRestart}
                  disabled={isPracticeRestartDisabled}
                  aria-label="Restart Song"
                >
                  <RestartIcon className="playback-icon" />
                </button>
                <button
                  type="button"
                  className="neomorphus-button playback-toggle-button"
                  onClick={handlePracticeToggle}
                  style={{
                    fontSize: "1.1rem",
                    color: !isPracticeToggleShowingPause ? HIGHLIGHT_COLOR : undefined,
                  }}
                  aria-label={practiceToggleAriaLabel}
                >
                  {isPracticeToggleShowingPause ? (
                    <PauseIcon className="playback-icon" />
                  ) : (
                    <PlayIcon className="playback-icon" />
                  )}
                </button>
                <button
                  type="button"
                  className="neomorphus-button playback-round-button"
                  onClick={handlePracticeTrackCompletion}
                  disabled={isPracticeNextDisabled}
                  aria-label="Next Song"
                >
                  <NextIcon className="playback-icon" />
                </button>
              </div>
            </div>
          </>
        )
      : null;

  const roundLength = round.length;
  const currentSong = currentIndex !== null ? round[currentIndex] : null;
  const isRoundMode = selectedMode === "round";
  const isRoundActive = Boolean(isRoundMode && currentSong?.file);
  const isBreakActive = breakTimeLeft !== null;
  const breakTotalSeconds = activeBreakTotalSeconds ?? (isBreakActive ? breakDurationSeconds : null);
  const breakRemainingSeconds =
    isBreakActive && breakTimeLeft != null ? Math.max(breakTimeLeft, 0) : 0;
  const breakProgressMax = breakTotalSeconds && breakTotalSeconds > 0 ? breakTotalSeconds : 1;
  const breakProgressPercent =
    isBreakActive && breakTotalSeconds
      ? Math.min(100, Math.max(0, (breakRemainingSeconds / breakProgressMax) * 100))
      : 0;

  const showBreakProgress = isBreakActive && breakTotalSeconds != null;

  const progressValue = showBreakProgress
    ? breakRemainingSeconds
    : isRoundActive
    ? effectiveCurrentTime
    : 0;
  const progressMax = showBreakProgress
    ? breakProgressMax
    : isRoundActive
    ? effectiveDuration || 1
    : 1;
  const progressPercent = showBreakProgress
    ? breakProgressPercent
    : isRoundActive
    ? songProgressPercent
    : 0;
  const elapsedLabel = showBreakProgress
    ? formatTime(breakRemainingSeconds)
    : isRoundActive
    ? formatTime(effectiveCurrentTime)
    : formatTime(0);
  const totalLabel = showBreakProgress
    ? formatTime(breakTotalSeconds ?? 0)
    : isRoundActive
    ? formatTime(effectiveDuration)
    : formatTime(0);

  const roundProgressValue = progressValue;
  const roundProgressMax = progressMax;
  const roundProgressPercent = progressPercent;
  const roundTimeElapsedLabel = elapsedLabel;
  const roundTimeTotalLabel = totalLabel;
  const isPlayToggleDisabled = !isBreakActive && !isRoundActive;
  const isToggleShowingPause = isBreakActive ? !isBreakPaused : isPlaying;
  const playbackToggleAriaLabel = isBreakActive
    ? isBreakPaused
      ? "Resume Break"
      : "Pause Break"
    : isPlaying
    ? "Pause"
    : "Play";
  const nextIndexCandidate = getNextIndex();
  const canRestartDuringBreak =
    isBreakActive && (upcomingIndex !== null && upcomingIndex !== undefined
      ? true
      : nextIndexCandidate !== null);
  const isRestartButtonDisabled = isBreakActive
    ? !canRestartDuringBreak
    : !audioRef.current || !isRoundActive;
  const canSkipTrack = isBreakActive || isRoundActive;
  const isSkipButtonDisabled = !canSkipTrack;
  const shouldShowRoundAudioControls =
    isRoundMode && (isBreakActive || isRoundActive || currentIndex !== null);

  const upcomingSong = upcomingIndex !== null ? round[upcomingIndex] : null;
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

  const nextSongCountdownLabel = (() => {
    if (breakTimeLeft === null) return null;

    const upcomingDance = upcomingSong?.dance ?? null;
    let label = `${upcomingDance ?? "Next song"} starts in: ${breakTimeLeft} seconds`;
    if (
      upcomingIndex !== null &&
      upcomingIndex !== undefined &&
      upcomingDance
    ) {
      label += ` • Up Next (${upcomingIndex + 1}/${round.length})${heatSuffix}: ${
        upcomingDance
      }`;
    }

    return label;
  })();

  // Debug logging to inspect why the play/pause toggle button renders as a square.
  useEffect(() => {
    if (!isRoundMode) return;

    const buttonEl = playbackToggleButtonRef.current;

    if (!buttonEl) {
      console.debug("[playback-button-debug] toggle button ref missing", {
        isRoundActive,
        isPlaying,
        breakTimeLeft,
        roundLength,
      });
      return;
    }

    const classList = Array.from(buttonEl.classList);
    const inlineStyle = buttonEl.getAttribute("style") || null;
    const inlineBorderRadius = buttonEl.style?.borderRadius || null;

    let computedSnapshot = null;

    const hasWindow = typeof window !== "undefined";

    if (hasWindow && window.Element && buttonEl instanceof window.Element) {
      const computedStyle = window.getComputedStyle(buttonEl);
      computedSnapshot = {
        borderRadius: computedStyle?.borderRadius ?? null,
        width: computedStyle?.width ?? null,
        height: computedStyle?.height ?? null,
      };
    }

    const payload = {
      classList,
      hasPlaybackToggleClass: buttonEl.classList.contains("playback-toggle-button"),
      inlineStyle,
      inlineBorderRadius,
      computedSnapshot,
      offsetWidth: buttonEl.offsetWidth,
      offsetHeight: buttonEl.offsetHeight,
      isRoundActive,
      isPlaying,
      breakTimeLeft,
      roundLength,
    };

    if (!payload.hasPlaybackToggleClass) {
      console.debug("[playback-button-debug] missing playback-toggle-button class", payload);
    } else {
      console.debug("[playback-button-debug] toggle button snapshot", payload);
    }
  }, [isRoundMode, isRoundActive, isPlaying, breakTimeLeft, roundLength]);

  const modeButtons =
    selectedStyle !== null
      ? (
          <div className="mode-button-group">
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
        )
      : null;

  const durationControls =
    selectedStyle !== null ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignSelf: "stretch",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          maxHeight: "100%",
          minHeight: 0,
          overflowY: "auto",
          paddingRight: "0.5rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            gap: "0.75rem",
            marginBottom: isPasoPracticeContext ? "0.75rem" : "1.5rem",
          }}
        >
          <label htmlFor="break-duration-slider" style={{ fontSize: "0.9rem" }}>
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
        {isPasoPracticeContext ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <div>
              <label htmlFor="song-duration-slider" style={{ fontSize: "0.9rem" }}>
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
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <label htmlFor="song-duration-slider" style={{ fontSize: "0.9rem" }}>
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
        )}
        {isPasoPracticeContext ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <PasoCrashSelector
                hasCrashMetadata={hasPasoCrashMetadata}
                options={pasoCrashOptions}
                selectedCrash={selectedCrash}
                onChange={setSelectedCrash}
                formatTime={formatTime}
                title="Paso Doble Crash"
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                gap: "0.75rem",
              }}
            >
              <label htmlFor="playback-speed-slider" style={{ fontSize: "0.9rem" }}>
                Speed: {playbackSpeedPercent}%
              </label>
              <input
                id="playback-speed-slider"
                type="range"
                min={SPEED_MIN_PERCENT}
                max={SPEED_MAX_PERCENT}
                step={SPEED_STEP_PERCENT}
                value={playbackSpeedPercent}
                className="neomorphus-slider"
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  if (!Number.isFinite(nextValue)) {
                    return;
                  }
                  setPlaybackSpeedPercent(
                    Math.min(Math.max(nextValue, SPEED_MIN_PERCENT), SPEED_MAX_PERCENT),
                  );
                }}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <label htmlFor="playback-speed-slider" style={{ fontSize: "0.9rem" }}>
              Speed: {playbackSpeedPercent}%
            </label>
            <input
              id="playback-speed-slider"
              type="range"
              min={SPEED_MIN_PERCENT}
              max={SPEED_MAX_PERCENT}
              step={SPEED_STEP_PERCENT}
              value={playbackSpeedPercent}
              className="neomorphus-slider"
              onChange={(e) => {
                const nextValue = Number(e.target.value);
                if (!Number.isFinite(nextValue)) {
                  return;
                }
                setPlaybackSpeedPercent(
                  Math.min(Math.max(nextValue, SPEED_MIN_PERCENT), SPEED_MAX_PERCENT),
                );
              }}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            gap: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
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
      </div>
    ) : null;

  return (
    <>
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
      {isAuthenticated ? (
        <div className="auth-status" ref={authStatusRef}>
          <div className="auth-status-actions">
            <button
              type="button"
              className={`auth-avatar-button${isAuthMenuOpen ? " open" : ""}`}
              onClick={handleToggleAuthMenu}
              aria-haspopup="true"
              aria-expanded={isAuthMenuOpen}
              aria-label="Account menu"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user?.displayName ? `${user.displayName}'s profile` : "Profile"}
                  className="auth-status-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="auth-avatar-fallback">
                  {(
                    user?.displayName?.charAt(0) ||
                    user?.email?.charAt(0) ||
                    "?"
                  ).toUpperCase()}
                </span>
              )}
            </button>
            <div className={`auth-menu${isAuthMenuOpen ? " auth-menu--open" : ""}`}>
              <div className="auth-menu-header">
                <span className="auth-status-text">
                  Signed in{user?.email ? ` as ${user.email}` : ""}
                </span>
              </div>
              <button
                type="button"
                className="auth-menu-item"
                onClick={handleSettingsClick}
              >
                Settings
              </button>
              <button
                type="button"
                className="auth-menu-item"
                onClick={handleAccountClick}
              >
                Account
              </button>
              {isAdmin ? (
                <Link
                  to="/admin/library"
                  className="auth-menu-item"
                  onClick={() => setIsAuthMenuOpen(false)}
                >
                  Admin Library
                </Link>
              ) : null}
              <button
                type="button"
                className="auth-menu-item auth-menu-item--danger"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-status auth-status--guest">
          <button
            type="button"
            className="neomorphus-button sign-in-button"
            onClick={handleShowSignIn}
          >
            Sign In
          </button>
        </div>
      )}
      <h1 className="app-title app-title-floating">
        Muzon App<span className="app-subtitle"> - Ballroom DJ</span>
      </h1>

      <div
        ref={preStyleFlashRef}
        className={`app-root${selectedStyle ? "" : " pre-style-flash"}`}
      >
        <div className="app-shell">
          <div className="app-shell-body">
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
                </button>
              ))}
            </div>
            {selectedStyle ? <div className="mode-row">{modeButtons}</div> : null}
            {practiceDanceSelectorMarkup}
            {selectedMode === "round" &&
            (round.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "1.5rem",
                  alignItems: "start",
                  justifyItems: "stretch",
                  width: "100%",
                  margin: "0 auto",
                  marginTop: "1rem",
                  flex: 1,
                  minHeight: 0,
                  boxSizing: "border-box",
                }}
              >
                {durationControls}
                <div
                  style={{
                    alignSelf: "stretch",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    flex: 1,
                    minHeight: 0,
                    justifyContent: "center",
                  }}
                >
                  {currentHeatLabel ? (
                    <div
                      style={{
                        textAlign: "left",
                        fontWeight: 600,
                        marginBottom: "0.75rem",
                        color: HIGHLIGHT_COLOR,
                        alignSelf: "center",
                        width: "100%",
                        maxWidth: "560px",
                        paddingLeft: "1.25rem",
                        paddingRight: "0.75rem",
                        boxSizing: "border-box",
                      }}
                    >
                      {currentHeatLabel}
                    </div>
                  ) : null}
                  <ul
                    style={{
                      margin: "0 auto",
                      paddingLeft: "1.25rem",
                      paddingRight: "0.75rem",
                      width: "100%",
                      maxWidth: "560px",
                      boxSizing: "border-box",
                      flex: "0 1 auto",
                      minHeight: 0,
                      maxHeight: "100%",
                      overflowY: "auto",
                    }}
                  >
                    {roundDisplayItems.map(({ baseIndex, song, displayDurationSeconds }) => {
                      const isActive =
                        breakTimeLeft === null && activeRepeatBaseIndex === baseIndex;
                      const isUpcoming =
                        breakTimeLeft !== null && upcomingRepeatBaseIndex === baseIndex;
                      const queueKey = `round-base-${baseIndex}`;

                      return (
                        <li
                          key={queueKey}
                          style={{
                            color: isActive
                              ? HIGHLIGHT_COLOR
                              : isUpcoming
                              ? HIGHLIGHT_COLOR
                              : undefined,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {getSongLabel(song)}
                          </span>
                          {displayDurationSeconds ? (
                            <span
                              style={{
                                fontSize: "0.85rem",
                                opacity: 0.75,
                                flexShrink: 0,
                              }}
                            >
                              {formatTime(displayDurationSeconds)}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      marginTop: "0.75rem",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      width: "100%",
                      maxWidth: "560px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      paddingLeft: "1.25rem",
                      paddingRight: "0.75rem",
                      boxSizing: "border-box",
                    }}
                  >
                    {currentIndex === null && breakTimeLeft === null ? (
                      <button
                        onClick={handleTogglePlayback}
                        type="button"
                        className="neomorphus-button heat-mode-button start-round-button"
                      >
                        Start Round
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        if (selectedStyle) {
                          generateRound(selectedStyle);
                        }
                      }}
                      disabled={!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)}
                      type="button"
                      className="neomorphus-button heat-mode-button"
                    >
                      <RefreshIcon className="heat-mode-button-icon" />
                      <span>New Round</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : roundAuthBlocked ? (
              <div
                style={{
                  marginTop: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                {round.length > 0 ? (
                  <>
                    {currentHeatLabel ? (
                      <div
                        style={{
                          textAlign: "left",
                          fontWeight: 600,
                          marginBottom: "0.75rem",
                          color: HIGHLIGHT_COLOR,
                          alignSelf: "center",
                          width: "100%",
                          maxWidth: "560px",
                          paddingLeft: "1.25rem",
                          paddingRight: "0.75rem",
                          boxSizing: "border-box",
                        }}
                      >
                        {currentHeatLabel}
                      </div>
                    ) : null}
                    <ul
                      style={{
                        margin: "0 auto",
                        paddingLeft: "1.25rem",
                        paddingRight: "0.75rem",
                        width: "100%",
                        maxWidth: "560px",
                        boxSizing: "border-box",
                        flex: "0 1 auto",
                        maxHeight: "100%",
                        overflowY: "auto",
                      }}
                    >
                      {roundDisplayItems.map(({ baseIndex, song, displayDurationSeconds }) => {
                        const queueKey = `round-base-${baseIndex}`;

                        return (
                          <li
                            key={queueKey}
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {getSongLabel(song)}
                            </span>
                            {displayDurationSeconds ? (
                              <span
                                style={{ fontSize: "0.8rem", opacity: 0.7, flexShrink: 0 }}
                              >
                                {formatTime(displayDurationSeconds)}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p style={{ color: "#b5bac6", margin: 0 }}>
                    Sign in to start this round.
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                    width: "100%",
                    maxWidth: "560px",
                    marginLeft: "auto",
                    marginRight: "auto",
                    paddingLeft: "1.25rem",
                    paddingRight: "0.75rem",
                    boxSizing: "border-box",
                  }}
                >
                  <button onClick={handleTogglePlayback} className="neomorphus-button">
                    Start Round
                  </button>
                  <button
                    onClick={() => {
                      if (selectedStyle) {
                        generateRound(selectedStyle);
                      }
                    }}
                    disabled={!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)}
                    className="neomorphus-button round-reload-button"
                  >
                    New Round
                  </button>
                  <button
                    type="button"
                    className="neomorphus-button"
                    onClick={handleRestartRound}
                    disabled
                  >
                    Restart Song
                  </button>
                </div>
                {durationControls}
              </div>
            ) : (
              <div style={{ marginTop: "1rem" }}>{durationControls}</div>
            ))}
          {selectedMode === "practice" && selectedStyle && (
            ENABLED_STYLE_IDS.has(selectedStyle) ? (
              <div className="practice-layout">
                <div className="practice-content">
                  {practiceError && (
                    <p style={{ color: "#ff8080" }}>{practiceError}</p>
                  )}
                  {currentPracticeTrack && currentPracticeTrack.file && (
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
                  )}
                  {practicePlaylist && (!practicePlaylist.tracks?.length || !currentPracticeTrack) && (
                    <p style={{ marginTop: "1rem" }}>
                      No tracks available right now for {practicePlaylist.dance}.
                    </p>
                  )}
                </div>
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
          </div>
          {practiceControlsMarkup}
          {shouldShowRoundAudioControls ? (
            <div className="audio-control-container">
              {nextSongCountdownLabel ? (
                <p className="playback-countdown">{nextSongCountdownLabel}</p>
              ) : null}
              <div className="playback-progress-row">
                <span className="playback-time playback-time-elapsed">{roundTimeElapsedLabel}</span>
                <div className="round-progress-shell playback-progress-shell">
                  <div className="round-progress-wrapper">
                    <progress
                      value={roundProgressValue}
                      max={roundProgressMax}
                      className="round-progress"
                    />
                    <div
                      className="round-progress-thumb"
                      style={{ left: `${roundProgressPercent}%` }}
                    />
                  </div>
                </div>
                <span className="playback-time playback-time-total">{roundTimeTotalLabel}</span>
              </div>
              <div className="audio-control-buttons">
                <button
                  type="button"
                  className="neomorphus-button playback-round-button"
                  onClick={handleRestartRound}
                  disabled={isRestartButtonDisabled}
                  aria-label="Restart Song"
                >
                  <RestartIcon className="playback-icon" />
                </button>
                <button
                  ref={playbackToggleButtonRef}
                  onClick={handleTogglePlayback}
                  disabled={isPlayToggleDisabled}
                  className="neomorphus-button playback-toggle-button"
                  style={{
                    fontSize: "1.1rem",
                    color: !isToggleShowingPause ? HIGHLIGHT_COLOR : undefined,
                  }}
                  aria-label={playbackToggleAriaLabel}
                >
                  {isToggleShowingPause ? (
                    <PauseIcon className="playback-icon" />
                  ) : (
                    <PlayIcon className="playback-icon" />
                  )}
                </button>
                <button
                  onClick={handleSkip}
                  className="neomorphus-button playback-round-button"
                  disabled={isSkipButtonDisabled}
                  aria-label="Next Song"
                >
                  <NextIcon className="playback-icon" />
                </button>
              </div>
              {isRoundActive && (
                <audio
                  key={currentSong.repeatQueueKey ?? currentIndex ?? "round-audio"}
                  ref={audioRef}
                  src={currentSong.file} // 👈 USES full Firebase URL directly
                  preload="auto"
                  autoPlay
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={(e) => {
                    console.error("Audio error:", e, "URL:", currentSong.file);
                  }}
                />
              )}
            </div>
          ) : selectedMode === "round" ? (
            <div className="audio-control-container audio-control-container--empty" aria-hidden="true" />
          ) : null}
        </div>
      </div>
    </>
  );
}

export default Player;
