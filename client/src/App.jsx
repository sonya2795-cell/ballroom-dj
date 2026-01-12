import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import AuthModal from "./components/AuthModal.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";
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
  { id: "ballroom", label: "Ballroom", shortLabel: "ST" },
  { id: "latin", label: "Latin", shortLabel: "LA" },
  { id: "rhythm", label: "Rhythm", shortLabel: "RH", comingSoon: true },
  { id: "smooth", label: "Smooth", shortLabel: "SM", comingSoon: true },
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

const SONG_MIN_SECONDS = 60;
const SONG_MAX_SECONDS = 180;
const SONG_STEP_SECONDS = 5;
const DEFAULT_SONG_SECONDS = 90;
const SPEED_MIN_PERCENT = 50;
const SPEED_MAX_PERCENT = 120;
const SPEED_STEP_PERCENT = 1;
const DEFAULT_SPEED_PERCENT = 100;
const PREVIOUS_RESTART_THRESHOLD_SECONDS = 3;
const BACKGROUND_COLOR = "#30333a";
const TEXT_COLOR = "#f2f4f7";
const HIGHLIGHT_COLOR = "#25ed27";

function getDanceLabel(label, useShort) {
  if (!useShort || !label) return label;
  const key = label.trim().toLowerCase();
  return DANCE_SHORT_LABELS[key] ?? label;
}

function PlayIcon({ className = "" }) {
  return (
    <svg
      className={`round-control-icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}

function PauseIcon({ className = "" }) {
  return (
    <svg
      className={`round-control-icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  );
}

function NextIcon({ className = "" }) {
  return (
    <svg
      className={`round-control-icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function PreviousIcon({ className = "" }) {
  return (
    <svg
      className={`round-control-icon${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
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

function getAudioDurationSeconds(fileUrl, timeoutMs = 8000) {
  if (!fileUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("abort", onError);
      audio.src = "";
      resolve(value);
    };
    const handleLoaded = () => {
      const seconds = Number.isFinite(audio.duration) ? audio.duration : null;
      settle(seconds);
    };
    const handleError = () => settle(null);
    const timer = setTimeout(() => settle(null), timeoutMs);
    const onLoaded = () => {
      clearTimeout(timer);
      handleLoaded();
    };
    const onError = () => {
      clearTimeout(timer);
      handleError();
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("error", onError);
    audio.addEventListener("abort", onError);
    audio.preload = "metadata";
    audio.src = fileUrl;
    audio.load();
  });
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [roundSource, setRoundSource] = useState([]);
  const [roundHeatMode, setRoundHeatMode] = useState(DEFAULT_HEAT_MODE);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState(null);
  const [activeBreakTotalSeconds, setActiveBreakTotalSeconds] = useState(null);
  const [isBreakPaused, setIsBreakPaused] = useState(false);
  const [upcomingIndex, setUpcomingIndex] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showModeModal, setShowModeModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsDragging, setIsSettingsDragging] = useState(false);
  const [settingsDragOffset, setSettingsDragOffset] = useState(0);
  const settingsDragStartYRef = useRef(0);
  const settingsDragPointerIdRef = useRef(null);
  const settingsDragHasCaptureRef = useRef(false);
  const settingsModalContentRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const settingsPanelRef = useRef(null);
  const [settingsClosedOffset, setSettingsClosedOffset] = useState(null);
  const settingsOpenDragStartYRef = useRef(0);
  const settingsOpenPointerIdRef = useRef(null);
  const settingsOpenDraggedRef = useRef(false);
  const settingsOpenHasCaptureRef = useRef(false);
  const [isNarrowLayout, setIsNarrowLayout] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 800px)").matches;
  });
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
  const isPracticeMode = selectedMode === "practice";
  const settingsLabel = isNarrowLayout
    ? selectedMode === "practice"
      ? "Practice Settings"
      : selectedMode === "round"
        ? "Round Settings"
        : "Settings"
    : "Settings";
  const isPracticeFullSongSelection =
    isPracticeMode && songDurationSeconds >= SONG_MAX_SECONDS;
  const minSongDurationMs = songDurationSeconds * 1000;
  const isTrackLongEnough = useCallback(
    (track) => {
      const durationMs = track?.durationMs;
      if (!Number.isFinite(durationMs)) {
        return true;
      }
      return durationMs >= minSongDurationMs;
    },
    [minSongDurationMs],
  );
  const isPracticeTrackAllowed = useCallback(
    (track) => {
      if (isPracticeFullSongSelection) {
        return true;
      }
      return isTrackLongEnough(track);
    },
    [isPracticeFullSongSelection, isTrackLongEnough],
  );
  const hydrateTrackDurations = useCallback(async (tracks) => {
    const hydrated = await Promise.all(
      tracks.map(async (track) => {
        if (!track || Number.isFinite(track.durationMs)) {
          return track;
        }
        const durationSeconds = await getAudioDurationSeconds(track.file);
        if (!Number.isFinite(durationSeconds)) {
          return track;
        }
        const startSeconds = msToSeconds(track.startMs ?? null) ?? 0;
        const effectiveSeconds = Math.max(durationSeconds - startSeconds, 0);
        return {
          ...track,
          durationMs: Math.round(effectiveSeconds * 1000),
        };
      }),
    );
    return hydrated;
  }, []);
  const getTrackKey = useCallback((track, index) => {
    if (!track) return `null-${index}`;
    return (
      track.id ??
      track.songId ??
      track.storagePath ??
      track.file ??
      track.filename ??
      `track-${index}`
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const mediaQuery = window.matchMedia("(max-width: 800px)");
    const handleChange = (event) => setIsNarrowLayout(event.matches);

    setIsNarrowLayout(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!isNarrowLayout && isSettingsOpen) {
      setIsSettingsOpen(false);
    }
  }, [isNarrowLayout, isSettingsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) {
      setSettingsDragOffset(0);
      setIsSettingsDragging(false);
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen]);

  const handleSettingsDragStart = (event) => {
    if (!isSettingsOpen) {
      return;
    }
    const handleElement = event.target.closest(".settings-modal-handle");
    if (!handleElement) {
      const interactiveElement = event.target.closest(
        "button, a, input, select, textarea, label, [role='button'], [data-no-sheet-drag]",
      );
      if (interactiveElement) {
        return;
      }
      const contentEl = settingsModalContentRef.current;
      if (contentEl && contentEl.scrollTop > 0) {
        return;
      }
    }
    settingsDragPointerIdRef.current = event.pointerId;
    settingsDragStartYRef.current = event.clientY;
    settingsDragHasCaptureRef.current = false;
    setIsSettingsDragging(false);
  };

  const handleSettingsDragMove = (event) => {
    if (settingsDragPointerIdRef.current !== event.pointerId) {
      return;
    }
    const delta = Math.max(event.clientY - settingsDragStartYRef.current, 0);
    if (!isSettingsDragging) {
      if (delta < 6) {
        return;
      }
      setIsSettingsDragging(true);
      if (!settingsDragHasCaptureRef.current) {
        event.currentTarget.setPointerCapture(event.pointerId);
        settingsDragHasCaptureRef.current = true;
      }
    }
    setSettingsDragOffset(delta);
  };

  const handleSettingsDragEnd = (event) => {
    if (settingsDragPointerIdRef.current !== event.pointerId) {
      return;
    }
    const shouldClose = settingsDragOffset > 80;
    settingsDragPointerIdRef.current = null;
    if (settingsDragHasCaptureRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      settingsDragHasCaptureRef.current = false;
    }
    setIsSettingsDragging(false);
    setSettingsDragOffset(0);
    if (shouldClose) {
      setIsSettingsOpen(false);
    }
  };

  const updateSettingsOffsets = useCallback((includeClosedOffset = false) => {
    if (typeof window === "undefined") {
      return;
    }
    const button = settingsButtonRef.current;
    const panel = settingsPanelRef.current;
    if (!button) {
      return;
    }
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const buttonRect = button.getBoundingClientRect();

    if (includeClosedOffset && panel) {
      const panelRect = panel.getBoundingClientRect();
      const offset = Math.max(
        buttonRect.top + panelRect.height - viewportHeight,
        0,
      );
      setSettingsClosedOffset(offset);
    }
  }, []);

  const prepareSettingsOpen = () => {
    updateSettingsOffsets(true);
    setIsSettingsOpen(true);
  };

  useEffect(() => {
    if (!isNarrowLayout || !isSettingsOpen) {
      return;
    }
    const handleResize = () => updateSettingsOffsets(false);
    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [isNarrowLayout, isSettingsOpen, updateSettingsOffsets]);

  const handleSettingsOpenDragStart = (event) => {
    if (isSettingsOpen) {
      return;
    }
    settingsOpenPointerIdRef.current = event.pointerId;
    settingsOpenDragStartYRef.current = event.clientY;
    settingsOpenDraggedRef.current = false;
    settingsOpenHasCaptureRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    settingsOpenHasCaptureRef.current = true;
  };

  const handleSettingsOpenDragMove = (event) => {
    if (settingsOpenPointerIdRef.current !== event.pointerId || isSettingsOpen) {
      return;
    }
    const delta = settingsOpenDragStartYRef.current - event.clientY;
    if (delta > 40) {
      settingsOpenDraggedRef.current = true;
      prepareSettingsOpen();
      if (settingsOpenHasCaptureRef.current) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        settingsOpenHasCaptureRef.current = false;
      }
      settingsOpenPointerIdRef.current = null;
    }
  };

  const handleSettingsOpenDragEnd = (event) => {
    if (settingsOpenPointerIdRef.current !== event.pointerId) {
      return;
    }
    if (settingsOpenHasCaptureRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      settingsOpenHasCaptureRef.current = false;
    }
    settingsOpenPointerIdRef.current = null;
  };
  const filteredRoundSource = useMemo(
    () => roundSource.filter((track) => isTrackLongEnough(track)),
    [isTrackLongEnough, roundSource],
  );
  const round = useMemo(
    () => buildExpandedRound(filteredRoundSource, roundRepeatCount),
    [filteredRoundSource, roundRepeatCount],
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
  const breakCountdownRef = useRef(null);
  const activationAudioRef = useRef(null);
  const hasPrimedAudioRef = useRef(false);
  const practiceAudioRef = useRef(null);
  const practiceAdvancingRef = useRef(false);
  const practiceQueueContainerRef = useRef(null);
  const roundQueueContainerRef = useRef(null);
  const pendingRoundStyleRef = useRef(null);
  const authPromptReasonRef = useRef(null);
  const authPromptTimeoutRef = useRef(null);
  const authMenuContainerRef = useRef(null);
  const userSelectedCrashRef = useRef(false);
  const roundReplacementRequestsRef = useRef(new Set());
  const roundSongDurationRef = useRef(null);
  const previousModeRef = useRef(null);

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

  const resetBreakState = useCallback(() => {
    clearBreakInterval();
    breakCountdownRef.current = null;
    setBreakTimeLeft(null);
    setUpcomingIndex(null);
    setIsBreakPaused(false);
    setActiveBreakTotalSeconds(null);
  }, [clearBreakInterval]);

  const startBreakCountdown = useCallback(
    (nextIndex) => {
      if (nextIndex === null) {
        resetBreakState();
        setCurrentIndex(null);
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(false);
        advancingRef.current = false;
        return;
      }

      clearBreakInterval();
      breakIntervalRef.current = setInterval(() => {
        if (breakCountdownRef.current === null) {
          clearBreakInterval();
          return;
        }

        breakCountdownRef.current = Math.max(breakCountdownRef.current - 1, 0);
        setBreakTimeLeft(breakCountdownRef.current);

        if (breakCountdownRef.current <= 0) {
          resetBreakState();
          setCurrentIndex(nextIndex);
          setCurrentTime(0);
          setDuration(0);
          setIsPlaying(false);
          advancingRef.current = false;
        }
      }, 1000);
    },
    [clearBreakInterval, resetBreakState],
  );

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

    resetBreakState();
    clearPlayTimeout();
    clearFadeTimers({ resetVolume: true });
    setIsPlaying(false);
    setCurrentIndex(null);
    setCurrentTime(0);
    setDuration(0);
  }, [clearFadeTimers, clearPlayTimeout, resetBreakState]);

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
  const getPracticeDurationLimitSeconds = useCallback(
    (track, sliderOverrideSeconds = songDurationSeconds) => {
      const clipDuration = getClipDurationSeconds(track);
      const crashDuration = getActiveCrashDurationFromClip(track);
      const sliderDuration =
        isPasoPracticeContext || isPracticeFullSongSelection ? null : sliderOverrideSeconds;

      const candidates = [];
      if (clipDuration != null) candidates.push(clipDuration);
      if (crashDuration != null) candidates.push(crashDuration);
      if (sliderDuration != null) candidates.push(sliderDuration);

      if (candidates.length === 0) {
        return songDurationSeconds;
      }

      return Math.min(...candidates);
    },
    [
      getActiveCrashDurationFromClip,
      isPasoPracticeContext,
      isPracticeFullSongSelection,
      songDurationSeconds,
    ],
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

    let effectiveIndex = null;

    if (breakTimeLeft !== null && upcomingIndex !== null) {
      // During the break, treat the upcoming song as the active slot so we can jump
      // back to the song that just finished.
      effectiveIndex = upcomingIndex;
    } else if (currentIndex !== null) {
      effectiveIndex = currentIndex;
    } else if (upcomingIndex !== null) {
      effectiveIndex = upcomingIndex;
    }

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
      resetBreakState();
      setCurrentIndex(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      advancingRef.current = false;
      return;
    }

    advancingRef.current = true;
    resetBreakState();

    breakCountdownRef.current = breakDurationSeconds;
    setActiveBreakTotalSeconds(breakDurationSeconds);
    setBreakTimeLeft(breakCountdownRef.current);
    setUpcomingIndex(nextIndex);
    setIsBreakPaused(false);
    startBreakCountdown(nextIndex);
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
        resetBreakState();
        clearPlayTimeout();
        setRoundAuthBlocked(false);
        const normalizedData = Array.isArray(data) ? data : [];
        console.debug("[round] fetch success", {
          style,
          trackCount: normalizedData.length,
        });
        setRoundSource(normalizedData);
        setCurrentIndex(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        advancingRef.current = false;
      } catch (error) {
        console.error("Error fetching round:", error);
      }
    },
    [clearPlayTimeout, resetBreakState, roundSource.length, selectedStyle]
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
    resetBreakState();
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

  const handleRoundReloadClick = useCallback(() => {
    const state = {
      selectedStyle,
      isEnabledStyle:
        selectedStyle != null ? ENABLED_STYLE_IDS.has(selectedStyle) : false,
      roundAuthBlocked,
    };

    if (!state.selectedStyle) {
      console.debug("[round-button] click ignored - no style selected", state);
      return;
    }

    if (!state.isEnabledStyle) {
      console.debug("[round-button] click ignored - style not enabled", state);
      return;
    }

    if (state.roundAuthBlocked) {
      console.debug("[round-button] click ignored - auth blocked", state);
      return;
    }

    console.debug("[round-button] click accepted", state);
    generateRound(state.selectedStyle);
  }, [generateRound, roundAuthBlocked, selectedStyle]);

  useEffect(() => {
    if (selectedMode !== "round") return;

    const disableReasons = [];

    if (!selectedStyle) {
      disableReasons.push("no-style-selected");
    } else if (!ENABLED_STYLE_IDS.has(selectedStyle)) {
      disableReasons.push("style-not-enabled");
    }

    if (roundAuthBlocked) {
      disableReasons.push("auth-blocked");
    }

    console.debug("[round-button] availability", {
      selectedStyle,
      isEnabledStyle:
        selectedStyle != null ? ENABLED_STYLE_IDS.has(selectedStyle) : false,
      roundAuthBlocked,
      disableReasons,
    });
  }, [roundAuthBlocked, selectedMode, selectedStyle]);

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

      const tracksForFilter = isPracticeFullSongSelection
        ? payload.tracks
        : await hydrateTrackDurations(payload.tracks);
      const filteredTracks = tracksForFilter.filter((track) =>
        isPracticeTrackAllowed(track),
      );
      if (filteredTracks.length === 0) {
        throw new Error("No tracks match the current song length");
      }

      setPracticePlaylist({
        ...payload,
        tracks: filteredTracks,
        style: selectedStyle,
      });
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

  const getTrackTitle = (track) => {
    if (!track) return "Unknown track";
    const title = typeof track.title === "string" ? track.title.trim() : "";
    return title || getDisplayName(track.file);
  };

  const getTrackArtist = (track) => {
    if (!track) return "Unknown artist";
    const artist = typeof track.artist === "string" ? track.artist.trim() : "";
    return artist || "Unknown artist";
  };

  const getRoundDanceBadgeInfo = (track, fallbackDance) => {
    const badgeMap = {
      chacha: "C",
      cha: "C",
      samba: "S",
      rumba: "R",
      rhumba: "R",
      paso: "PD",
      pasodoble: "PD",
      pd: "PD",
      jive: "J",
      waltz: "W",
      w: "W",
      tango: "T",
      t: "T",
      viennesewaltz: "VW",
      vienesewaltz: "VW", // guard against common misspelling
      viennese: "VW",
      vienese: "VW",
      vw: "VW",
      foxtrot: "F",
      fox: "F",
      quickstep: "Q",
      qs: "Q",
      quick: "Q",
    };

    const candidates = [
      track?.danceId,
      track?.dance,
      track?.danceKey,
      track?.danceLabel,
      track?.folder,
      fallbackDance,
    ];

    for (const key of candidates) {
      if (!key) continue;
      const normalized = key
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      if (!normalized) continue;
      if (badgeMap[normalized]) return { label: badgeMap[normalized], isFallback: false };
    }

    return { label: "?", isFallback: true };
  };

  const handleSkip = () => {
    const nextIndex = getNextIndex();

    if (breakTimeLeft === null) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      clearPlayTimeout();
      clearFadeTimers({ resetVolume: true });
      setIsPlaying(false);

      if (nextIndex === null) {
        resetBreakState();
        setCurrentIndex(null);
        setCurrentTime(0);
        setDuration(0);
        advancingRef.current = false;
      } else {
        startBreakThenNext();
      }

      return;
    }

    const targetIndex = upcomingIndex !== null ? upcomingIndex : nextIndex;
    if (targetIndex === null) {
      resetBreakState();
      setCurrentIndex(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      advancingRef.current = false;
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    clearPlayTimeout();
    resetBreakState();
    clearFadeTimers({ resetVolume: true });

    advancingRef.current = false;
    setIsPlaying(false);
    setCurrentIndex(targetIndex);
    setCurrentTime(0);
    setDuration(0);
  };

  const handlePrevious = () => {
    const thresholdSeconds = PREVIOUS_RESTART_THRESHOLD_SECONDS;
    const hasBreakActive = breakTimeLeft !== null;
    const activeSong = currentIndex !== null ? round[currentIndex] : null;

    const goToPreviousSong = () => {
      const previousIndex = getPreviousIndex();
      if (previousIndex === null) {
        return false;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      clearPlayTimeout();
      resetBreakState();
      clearFadeTimers({ resetVolume: true });

      advancingRef.current = false;
      setIsPlaying(false);
      setCurrentIndex(previousIndex);
      setCurrentTime(0);
      setDuration(0);
      return true;
    };

    const restartCurrentSong = () => {
      if (!activeSong || currentIndex === null) {
        return false;
      }

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      clearPlayTimeout();
      clearFadeTimers({ resetVolume: true });
      setCurrentTime(0);

      if (isPlaying) {
        schedulePlayTimeout(getRoundDurationLimitSeconds(activeSong));
      }

      return true;
    };

    const restartBreak = () => {
      if (upcomingIndex === null) {
        return false;
      }

      const totalSeconds =
        activeBreakTotalSeconds != null ? activeBreakTotalSeconds : breakDurationSeconds;
      if (
        totalSeconds == null ||
        Number.isNaN(totalSeconds) ||
        totalSeconds <= 0
      ) {
        return false;
      }

      breakCountdownRef.current = totalSeconds;
      setActiveBreakTotalSeconds(totalSeconds);
      setBreakTimeLeft(totalSeconds);
      setIsBreakPaused(false);
      startBreakCountdown(upcomingIndex);
      advancingRef.current = true;
      return true;
    };

    const returnToBreakBeforeCurrentSong = () => {
      if (currentIndex === null) {
        return false;
      }
      const targetUpcomingIndex = currentIndex;
      if (targetUpcomingIndex === null) {
        return false;
      }

      const precedingIndex =
        targetUpcomingIndex > 0 ? targetUpcomingIndex - 1 : null;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      clearPlayTimeout();
      clearFadeTimers({ resetVolume: true });
      resetBreakState();

      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setCurrentIndex(precedingIndex);

      const totalSeconds = breakDurationSeconds;
      if (
        totalSeconds == null ||
        Number.isNaN(totalSeconds) ||
        totalSeconds <= 0
      ) {
        return false;
      }

      breakCountdownRef.current = totalSeconds;
      setActiveBreakTotalSeconds(totalSeconds);
      setBreakTimeLeft(totalSeconds);
      setUpcomingIndex(targetUpcomingIndex);
      setIsBreakPaused(false);
      advancingRef.current = true;
      startBreakCountdown(targetUpcomingIndex);
      return true;
    };

    if (hasBreakActive) {
      const breakTotal = activeBreakTotalSeconds ?? breakDurationSeconds;
      const elapsed =
        breakTotal != null && breakTimeLeft != null
          ? Math.max(breakTotal - breakTimeLeft, 0)
          : null;

      if (elapsed != null && elapsed >= thresholdSeconds) {
        restartBreak();
        return;
      }

      goToPreviousSong();
      return;
    }

    if (activeSong && currentTime >= thresholdSeconds) {
      restartCurrentSong();
      return;
    }

    if (activeSong && currentTime < thresholdSeconds) {
      if (returnToBreakBeforeCurrentSong()) {
        return;
      }
    }

    goToPreviousSong();
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
      if (!isBreakPaused) {
        clearBreakInterval();
        setIsBreakPaused(true);
      } else {
        const targetIndex =
          upcomingIndex !== null ? upcomingIndex : getNextIndex();

        if (targetIndex === null) {
          resetBreakState();
          setCurrentIndex(null);
          setCurrentTime(0);
          setDuration(0);
          advancingRef.current = false;
        } else {
          breakCountdownRef.current =
            breakCountdownRef.current ?? Math.max(breakTimeLeft, 0);
          setIsBreakPaused(false);
          startBreakCountdown(targetIndex);
        }
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
    if (!roundSource.length) {
      return;
    }
    let isCancelled = false;
    const hydrateRoundTracks = async () => {
      const hydratedTracks = await hydrateTrackDurations(roundSource);
      if (isCancelled) return;
      const hasHydratedDurations = roundSource.some((track, index) => {
        const sourceDuration = track?.durationMs;
        const nextDuration = hydratedTracks[index]?.durationMs;
        return !Number.isFinite(sourceDuration) && Number.isFinite(nextDuration);
      });
      if (!hasHydratedDurations) {
        return;
      }
      const currentKeys = roundSource.map(getTrackKey).join("|");
      const hydratedKeys = hydratedTracks.map(getTrackKey).join("|");
      if (currentKeys !== hydratedKeys) {
        return;
      }
      setRoundSource((prev) => {
        if (!prev?.length) return prev;
        const prevKeys = prev.map(getTrackKey).join("|");
        if (prevKeys !== hydratedKeys) {
          return prev;
        }
        return hydratedTracks;
      });
    };

    hydrateRoundTracks();

    return () => {
      isCancelled = true;
    };
  }, [getTrackKey, hydrateTrackDurations, roundSource]);

  useEffect(() => {
    roundReplacementRequestsRef.current.clear();
  }, [roundSource, selectedStyle, songDurationSeconds]);

  useEffect(() => {
    if (selectedMode !== "round") {
      return;
    }
    if (!roundSource.length) {
      return;
    }
    if (!selectedStyle) {
      return;
    }
    const minDurationMs = songDurationSeconds * 1000;
    if (!Number.isFinite(minDurationMs) || minDurationMs <= 0) {
      return;
    }

    let isCancelled = false;

    const replaceTooShortTracks = async () => {
      const tracksForCheck = await hydrateTrackDurations(roundSource);
      if (isCancelled) return;
      const hasHydratedDurations = roundSource.some((track, index) => {
        const sourceDuration = track?.durationMs;
        const nextDuration = tracksForCheck[index]?.durationMs;
        return !Number.isFinite(sourceDuration) && Number.isFinite(nextDuration);
      });
      if (hasHydratedDurations) {
        const currentKeys = roundSource.map(getTrackKey).join("|");
        const hydratedKeys = tracksForCheck.map(getTrackKey).join("|");
        if (currentKeys === hydratedKeys) {
          setRoundSource((prev) => {
            if (!prev?.length) return prev;
            const prevKeys = prev.map(getTrackKey).join("|");
            if (prevKeys !== hydratedKeys) {
              return prev;
            }
            return tracksForCheck;
          });
        }
      }

      const candidates = tracksForCheck
        .map((track, index) => {
          const durationMs = track?.durationMs;
          if (!Number.isFinite(durationMs) || durationMs >= minDurationMs) {
            return null;
          }
          const danceId = track?.danceId;
          if (!danceId) {
            return null;
          }
          const targetKey = getTrackKey(track, index);
          const requestKey = `${danceId}:${minDurationMs}:${targetKey}`;
          if (roundReplacementRequestsRef.current.has(requestKey)) {
            return null;
          }
          roundReplacementRequestsRef.current.add(requestKey);
          return {
            index,
            danceId,
            targetKey,
            excludeId: track?.songId ?? track?.id ?? null,
            excludeStoragePath: track?.storagePath ?? null,
          };
        })
        .filter(Boolean);

      if (!candidates.length) {
        return;
      }

      const replacements = await Promise.all(
        candidates.map(async (candidate) => {
          const excludeIds = new Set();
          const excludeStoragePaths = new Set();
          if (candidate.excludeId) excludeIds.add(candidate.excludeId);
          if (candidate.excludeStoragePath) excludeStoragePaths.add(candidate.excludeStoragePath);
          const maxAttempts = 3;

          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const params = new URLSearchParams({
              style: selectedStyle,
              dance: candidate.danceId,
              minDurationMs: String(minDurationMs),
            });
            if (excludeIds.size > 0) {
              params.set("excludeIds", Array.from(excludeIds).join(","));
            }
            if (excludeStoragePaths.size > 0) {
              params.set("excludeStoragePaths", Array.from(excludeStoragePaths).join(","));
            }

            try {
              const res = await fetchWithOrigin(
                `/api/round/replacement?${params.toString()}`,
                { credentials: "include" },
              );
              if (!res.ok) {
                return null;
              }
              const payload = await res.json();
              const replacement = payload?.track ?? null;
              if (!replacement) {
                return null;
              }

              let replacementDurationMs = replacement.durationMs;
              if (!Number.isFinite(replacementDurationMs)) {
                const durationSeconds = await getAudioDurationSeconds(replacement.file);
                if (Number.isFinite(durationSeconds)) {
                  const startSeconds = msToSeconds(replacement.startMs ?? null) ?? 0;
                  replacementDurationMs = Math.round(
                    Math.max(durationSeconds - startSeconds, 0) * 1000,
                  );
                }
              }

              if (!Number.isFinite(replacementDurationMs)) {
                if (replacement.songId) excludeIds.add(replacement.songId);
                if (replacement.id) excludeIds.add(replacement.id);
                if (replacement.storagePath) excludeStoragePaths.add(replacement.storagePath);
                continue;
              }

              if (replacementDurationMs < minDurationMs) {
                if (replacement.songId) excludeIds.add(replacement.songId);
                if (replacement.id) excludeIds.add(replacement.id);
                if (replacement.storagePath) excludeStoragePaths.add(replacement.storagePath);
                continue;
              }

              return {
                ...candidate,
                replacement: { ...replacement, durationMs: replacementDurationMs },
              };
            } catch (err) {
              console.warn("Failed to replace round track", err);
              return null;
            }
          }

          return null;
        }),
      );

      if (isCancelled) {
        return;
      }

      const validReplacements = replacements.filter(Boolean);
      if (!validReplacements.length) {
        return;
      }

      setRoundSource((prev) => {
        if (!prev?.length) return prev;
        let didChange = false;
        const next = prev.map((track, index) => {
          const match = validReplacements.find((item) => item.index === index);
          if (!match) return track;
          const currentKey = getTrackKey(track, index);
          if (currentKey !== match.targetKey) {
            return track;
          }
          didChange = true;
          return match.replacement;
        });
        return didChange ? next : prev;
      });
    };

    replaceTooShortTracks();

    return () => {
      isCancelled = true;
    };
  }, [
    getTrackKey,
    hydrateTrackDurations,
    roundSource,
    selectedMode,
    selectedStyle,
    songDurationSeconds,
  ]);

  useEffect(() => {
    if (selectedMode !== "practice") {
      return;
    }
    if (!practicePlaylist?.tracks?.length) {
      return;
    }

    let isCancelled = false;

    const refilterPracticeTracks = async () => {
      const sourceTracks = practicePlaylist.tracks;
      const tracksForFilter = isPracticeFullSongSelection
        ? sourceTracks
        : await hydrateTrackDurations(sourceTracks);
      if (isCancelled) return;
      const filteredTracks = tracksForFilter.filter((track) =>
        isPracticeTrackAllowed(track),
      );
      if (filteredTracks.length === 0) {
        return;
      }
      const hasHydratedDurations = sourceTracks.some((track, index) => {
        const sourceDuration = track?.durationMs;
        const nextDuration = tracksForFilter[index]?.durationMs;
        return !Number.isFinite(sourceDuration) && Number.isFinite(nextDuration);
      });
      const nextKeys = filteredTracks.map(getTrackKey).join("|");
      const currentKeys = sourceTracks.map(getTrackKey).join("|");
      if (nextKeys === currentKeys && !hasHydratedDurations) {
        return;
      }
      const nextTracks =
        nextKeys === currentKeys && hasHydratedDurations
          ? tracksForFilter
          : filteredTracks;
      setPracticePlaylist((prev) => {
        if (!prev) return prev;
        const prevKeys = prev.tracks?.map(getTrackKey).join("|");
        if (prevKeys === nextKeys && !hasHydratedDurations) {
          return prev;
        }
        return { ...prev, tracks: nextTracks };
      });
      if (nextTracks !== sourceTracks) {
        setPracticeTrackIndex((prevIndex) => {
          if (prevIndex < nextTracks.length) {
            return prevIndex;
          }
          return 0;
        });
      }
    };

    refilterPracticeTracks();

    return () => {
      isCancelled = true;
    };
  }, [
    getTrackKey,
    hydrateTrackDurations,
    isPracticeFullSongSelection,
    isPracticeTrackAllowed,
    practicePlaylist,
    selectedMode,
    songDurationSeconds,
  ]);

  useEffect(() => {
    let targetDuration = null;
    const previousMode = previousModeRef.current;

    if (selectedMode === "practice" && previousMode !== "practice") {
      if (previousMode === "round") {
        roundSongDurationRef.current = songDurationSeconds;
      }
      targetDuration = SONG_MAX_SECONDS;
    } else if (selectedMode === "round" && previousMode !== "round") {
      if (roundSongDurationRef.current == null) {
        roundSongDurationRef.current = 90;
      }
      targetDuration = roundSongDurationRef.current;
    }

    if (
      targetDuration != null &&
      Number.isFinite(targetDuration) &&
      targetDuration !== songDurationSeconds
    ) {
      setSongDurationSeconds(targetDuration);
    }

    previousModeRef.current = selectedMode;
  }, [selectedMode]);

  useEffect(() => {
    if (selectedMode === "round") {
      roundSongDurationRef.current = songDurationSeconds;
    }
  }, [selectedMode, songDurationSeconds]);

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
    const shouldRespectPracticeCutoffs = !isPracticeFullSongSelection;

    const elapsedSeconds = Math.max(currentSeconds - clipStartSeconds, 0);
    setPracticeCurrentTime(elapsedSeconds);

    const reachedClip =
      shouldRespectPracticeCutoffs &&
      clipEndSeconds != null &&
      currentSeconds >= clipEndSeconds - 0.05;
    const reachedCrash =
      shouldRespectPracticeCutoffs &&
      crashSeconds != null &&
      currentSeconds >= crashSeconds - 0.05;
    const durationLimit = shouldRespectPracticeCutoffs
      ? getPracticeDurationLimitSeconds(track)
      : null;
    const reachedLimit =
      durationLimit != null && elapsedSeconds >= durationLimit - 0.05;

    if (reachedClip || reachedCrash || reachedLimit) {
      console.debug("[practice] reached cutoff", {
        reachedClip,
        reachedCrash,
        reachedLimit,
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
    let effectiveDuration = rawDuration;
    if (isPracticeFullSongSelection) {
      effectiveDuration = Math.max(rawDuration - clipStartSeconds, 0);
    } else {
      const clipDuration = getClipDurationSeconds(track);
      effectiveDuration =
        clipDuration != null ? Math.min(rawDuration, clipDuration) : rawDuration;
      const crashDuration = getActiveCrashDurationFromClip(track);
      if (crashDuration != null) {
        effectiveDuration = Math.min(effectiveDuration, crashDuration);
      }
    }
    if (!isPracticeFullSongSelection) {
      const durationLimit = getPracticeDurationLimitSeconds(track);
      if (durationLimit != null) {
        effectiveDuration = Math.min(effectiveDuration, durationLimit);
      }
    }

    setPracticeDuration(effectiveDuration || 0);
    setPracticeCurrentTime(0);
  };

  useEffect(() => {
    if (!practiceIsPlaying || !currentPracticeTrack) {
      return;
    }
    const durationLimit = getPracticeDurationLimitSeconds(currentPracticeTrack);
    if (durationLimit == null) {
      return;
    }
    if (practiceCurrentTime >= durationLimit - 0.05) {
      const audio = practiceAudioRef.current;
      if (audio) {
        audio.pause();
      }
      handlePracticeTrackCompletion();
    }
  }, [
    currentPracticeTrack,
    getPracticeDurationLimitSeconds,
    handlePracticeTrackCompletion,
    practiceCurrentTime,
    practiceIsPlaying,
  ]);

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
    if (practicePlaylistLength === 0) {
      return;
    }

    const audio = practiceAudioRef.current;
    const hasPreviousTrack = practiceTrackIndex > 0;
    const shouldGoToPrevious =
      practiceCurrentTime < PREVIOUS_RESTART_THRESHOLD_SECONDS && hasPreviousTrack;

    if (shouldGoToPrevious) {
      setPracticeTrackIndex((prev) => (prev > 0 ? prev - 1 : prev));
      setPracticeCurrentTime(0);
      setPracticeDuration(0);
      setPracticeIsPlaying(false);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }

    const clipStartSeconds = getClipStartSeconds(currentPracticeTrack);
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = clipStartSeconds;
      } catch (err) {
        console.warn("Failed to restart practice track", err);
      }
      if (practiceIsPlaying) {
        audio.play().catch((err) => console.error("Practice play error:", err));
      }
    }
    setPracticeCurrentTime(0);
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
  const practiceCanGoPrevious = practicePlaylistLength > 0;
  const practiceCanGoNext =
    practicePlaylistLength > 0 && practiceTrackIndex < practicePlaylistLength - 1;
  const practiceNowPlayingInfo = (() => {
    if (currentPracticeTrack) {
      const title = getTrackTitle(currentPracticeTrack);
      const artist = getTrackArtist(currentPracticeTrack);
      const fallback = currentPracticeTrack.file ? getDisplayName(currentPracticeTrack.file) : "";
      const labelTitle = title || fallback || "Unknown track";
      return { title: labelTitle, artist: artist || "" };
    }
    if (practicePlaylistLength > 0) {
      return {
        label: `Practice playlist ready (${practicePlaylistLength} track${
          practicePlaylistLength === 1 ? "" : "s"
        })`,
      };
    }
    return { label: "Practice not loaded yet" };
  })();
  const practiceStartButtonIcon = practiceIsPlaying ? (
    <PauseIcon className="round-control-icon--primary" />
  ) : (
    <PlayIcon className="round-control-icon--primary" />
  );
  const practiceDanceRows = useMemo(() => {
    if (!practiceDances.length) return [];
    if (isNarrowLayout) {
      return [practiceDances];
    }
    const firstRow = practiceDances.slice(0, 3);
    const secondRow = practiceDances.slice(3);
    return [firstRow, secondRow].filter((row) => row.length > 0);
  }, [isNarrowLayout, practiceDances]);

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
  const practiceDanceContent =
    practiceDanceButtonsMarkup ?? (
      <p className="practice-dance-empty">
        {practiceDancesLoading ? "Loading dances..." : "No dances available."}
      </p>
    );
  const practiceDancePanel =
    selectedMode === "practice" &&
    selectedStyle &&
    ENABLED_STYLE_IDS.has(selectedStyle) ? (
      <div className="practice-song-type-panel practice-song-type-panel--left">
        {practiceDanceContent}
      </div>
    ) : null;
  const practiceQueueContent =
    practicePlaylist?.tracks?.length
      ? (
          <ul className="round-queue-list">
            {practicePlaylist.tracks.map((track, idx) => {
              const badge = getRoundDanceBadgeInfo(
                track,
                practicePlaylist?.danceId || practicePlaylist?.dance
              );
              const isActive = idx === practiceTrackIndex;
              return (
                <li
                  key={track.id ?? track.file ?? idx}
                  className={`round-queue-item${isActive ? " round-queue-item--current" : ""}`}
                >
                  <div
                    className={`round-queue-item-art${
                      badge.isFallback ? " round-queue-item-art--fallback" : ""
                    }`}
                    aria-hidden="true"
                    title={badge.isFallback ? "Unknown dance" : undefined}
                  >
                    {badge.label}
                  </div>
                  <div className="round-queue-item-text">
                    <div
                      className="round-queue-item-title"
                      style={{ color: isActive ? HIGHLIGHT_COLOR : undefined }}
                    >
                      {getTrackTitle(track)}
                    </div>
                    <div className="round-queue-item-artist">{getTrackArtist(track)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
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

  const previousIndexCandidate = getPreviousIndex();
  const nextIndexCandidate = getNextIndex();
  const canGoPrevious = Boolean(
    breakTimeLeft !== null || currentIndex !== null || previousIndexCandidate !== null,
  );
  const canGoNext = nextIndexCandidate !== null;
  const isBreakActive = breakTimeLeft !== null;
  const isBreakCountingDown = isBreakActive && !isBreakPaused;
  const isPlaybackEngaged = isPlaying || isBreakCountingDown;
  const startButtonLabel = isBreakActive
    ? isBreakPaused
      ? "Resume Break"
      : "Pause Break"
    : isPlaying
    ? "Pause Round"
    : currentIndex === null
    ? "Start Round"
    : "Play Round";
  const startButtonIcon = isPlaybackEngaged ? (
    <PauseIcon className="round-control-icon--primary" />
  ) : (
    <PlayIcon className="round-control-icon--primary" />
  );
  const startButtonAriaLabel = isBreakActive
    ? isBreakPaused
      ? "Resume break countdown"
      : "Pause break countdown"
    : isPlaying
    ? "Pause round playback"
    : "Start round playback";
  const isStartDisabled =
    !isBreakActive &&
    round.length === 0 &&
    !roundAuthBlocked &&
    !pendingRoundStyleRef.current;
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
  const breakTotalSeconds =
    activeBreakTotalSeconds ?? (isBreakActive ? breakDurationSeconds : null);
  const breakRemainingSeconds =
    isBreakActive && breakTimeLeft != null ? Math.max(breakTimeLeft, 0) : 0;
  const breakProgressMax =
    breakTotalSeconds && breakTotalSeconds > 0 ? breakTotalSeconds : 1;
  const breakProgressPercent =
    isBreakActive && breakTotalSeconds
      ? Math.min(100, Math.max(0, (breakRemainingSeconds / breakProgressMax) * 100))
      : 0;
  const showBreakProgress = isBreakActive && breakTotalSeconds != null;
  const progressBarValue = showBreakProgress ? breakRemainingSeconds : effectiveCurrentTime;
  const progressBarMax = showBreakProgress ? breakProgressMax : effectiveDuration || 1;
  const progressBarPercent = showBreakProgress ? breakProgressPercent : progressPercent;
  const elapsedTimeLabel = showBreakProgress
    ? formatTime(breakRemainingSeconds)
    : formatTime(effectiveCurrentTime);
  const totalTimeLabel = showBreakProgress
    ? formatTime(breakTotalSeconds ?? 0)
    : formatTime(effectiveDuration);
  const isPasoRoundTrack = isLatinRoundMode && isPasoSong(currentSong);
  const roundPasoReferenceTrack = useMemo(
    () => (isLatinRoundMode ? round.find((song) => isPasoSong(song)) ?? null : null),
    [isLatinRoundMode, round],
  );
  const roundPasoCrashOptions = useMemo(
    () => (roundPasoReferenceTrack ? getCrashOptions(roundPasoReferenceTrack) : []),
    [roundPasoReferenceTrack],
  );
  useEffect(() => {
    if (selectedMode !== "round" || !isPlaying || breakTimeLeft !== null) {
      return;
    }
    if (currentIndex === null) {
      return;
    }
    const container = roundQueueContainerRef.current;
    if (!container) {
      return;
    }
    const list = container.querySelector(".round-queue-list");
    if (!list) {
      return;
    }
    const items = list.children;
    const firstItem = items[0];
    if (!firstItem) {
      return;
    }
    const secondItem = items[1];
    const firstRect = firstItem.getBoundingClientRect();
    const step = secondItem
      ? secondItem.getBoundingClientRect().top - firstRect.top
      : firstRect.height;
    if (step <= 0) {
      return;
    }
    container.scrollTo({
      top: Math.max(0, step * currentIndex),
      behavior: "smooth",
    });
  }, [breakTimeLeft, currentIndex, isPlaying, selectedMode]);
  useEffect(() => {
    if (selectedMode !== "practice" || !practiceIsPlaying) {
      return;
    }
    const container = practiceQueueContainerRef.current;
    if (!container) {
      return;
    }
    const list = container.querySelector(".round-queue-list");
    if (!list) {
      return;
    }
    const items = list.children;
    const firstItem = items[0];
    if (!firstItem) {
      return;
    }
    const secondItem = items[1];
    const firstRect = firstItem.getBoundingClientRect();
    const step = secondItem
      ? secondItem.getBoundingClientRect().top - firstRect.top
      : firstRect.height;
    if (step <= 0) {
      return;
    }
    container.scrollTo({
      top: Math.max(0, step * practiceTrackIndex),
      behavior: "smooth",
    });
  }, [practiceIsPlaying, practiceTrackIndex, selectedMode]);
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
        <div
          style={
            isPasoPracticeContext
              ? { display: "flex", flexDirection: "column", gap: "0.7rem" }
              : undefined
          }
        >
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
          {isPasoPracticeContext ? pasoPracticeCrashButtonsMarkup : null}
        </div>
        {!isPasoPracticeContext && !isPracticeMode && (
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
        {!isPasoPracticeContext && isPracticeMode && (
          <div>
            <div className="slider-label-row">
              <label htmlFor="song-duration-slider">Song Length</label>
              <span className="slider-value">
                {isPracticeFullSongSelection
                  ? "Full Song"
                  : formatTime(songDurationSeconds)}
              </span>
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
        {selectedMode === "round" && (
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
        )}
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

  let nextSongCountdownLabel = null;
  const upcomingDance = upcomingSong?.dance ?? null;

  if (breakTimeLeft !== null) {
    nextSongCountdownLabel = `${upcomingDance ?? "Next song"} starts in: ${breakTimeLeft} seconds`;
  } else if (
    selectedMode === "round" &&
    round.length > 0 &&
    currentSong === null &&
    breakTimeLeft === null
  ) {
    nextSongCountdownLabel = "Press play to begin round";
  } else if (currentSong) {
    const currentDance = currentSong.dance ?? "Song";
    nextSongCountdownLabel = `${currentDance} playing`;
  }

const roundTransportControls =
      selectedMode === "round"
    ? (
        <div
            style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
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
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {nextSongCountdownLabel ? (
                  <h3
                    style={{
                      textAlign: "left",
                      margin: 0,
                      width: "91%",
                      maxWidth: "91%",
                      alignSelf: "center",
                      fontSize: "0.9rem",
                      color: "rgba(255, 255, 255, 0.65)",
                      fontWeight: 400,
                    }}
                  >
                    {nextSongCountdownLabel}
                  </h3>
                ) : null}
                <div
                  className="round-progress-wrapper"
                  style={{ width: "91%", maxWidth: "91%", alignSelf: "center" }}
                >
                  <progress
                    value={progressBarValue}
                    max={progressBarMax}
                    className="round-progress"
                  />
                  <div
                    className="round-progress-thumb"
                    style={{ left: `${progressBarPercent}%` }}
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
                  <span>{elapsedTimeLabel}</span>
                  <span>{totalTimeLabel}</span>
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
              <PreviousIcon />
            </button>
            <button
              type="button"
              className="neomorphus-button round-control round-control--primary"
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
              <NextIcon />
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
                gap: 0,
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
                  fontWeight: 400,
                  fontSize: "0.9rem",
                  width: "100%",
                  color: "rgba(255, 255, 255, 0.65)",
                  opacity: practicePlaylistLength === 0 ? 0.75 : 1,
                }}
              >
                {practiceNowPlayingInfo.label ? (
                  practiceNowPlayingInfo.label
                ) : (
                  <>
                    <span>{practiceNowPlayingInfo.title}</span>
                    {practiceNowPlayingInfo.artist ? (
                      <span> - {practiceNowPlayingInfo.artist}</span>
                    ) : null}
                  </>
                )}
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
              <PreviousIcon />
            </button>
              <button
                type="button"
                className="neomorphus-button round-control round-control--primary"
                onClick={handlePracticeToggle}
                disabled={!currentPracticeTrack?.file}
                aria-label={
                  practiceIsPlaying ? "Pause practice playback" : "Play practice playback"
                }
                title={practiceIsPlaying ? "Pause Practice" : "Play Practice"}
              >
                {practiceStartButtonIcon}
              </button>
            <button
              type="button"
              className="neomorphus-button round-control"
              onClick={handlePracticeTrackCompletion}
              disabled={!practicePlaylistLength}
              aria-label="Next Practice Track"
              title="Next Practice Track"
            >
              <NextIcon />
            </button>
            </div>
          </div>
        )
      : null;

  const settingsBodyContent = (
    <>
      {durationControls}

      {selectedMode === "practice" && selectedStyle && (
        ENABLED_STYLE_IDS.has(selectedStyle) ? (
          <div style={{ marginTop: "1rem" }}>
            {practiceError && <p style={{ color: "#ff8080" }}>{practiceError}</p>}
            {practiceDancesLoading && !practiceError && <p>Loading dances...</p>}
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

      {!isNarrowLayout ? practiceDancePanel : null}
    </>
  );

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
                  <span className="style-label-full">{style.label}</span>
                  <span className="style-label-short">{style.shortLabel}</span>
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
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        user={user}
      />
      <header className="app-header">
        <div className="app-header-section app-header-section--left">
          <h1 className="app-title app-title-floating">
            Muzon <span className="app-title-app">App</span>
            <span className="app-subtitle"> - Ballroom DJ</span>
          </h1>
        </div>
        <div className="app-header-meta">
          <div className="app-header-badge" aria-label="Beta release badge">
            Beta
          </div>
          {isAuthenticated ? (
            <button
              type="button"
              className="neomorphus-button feedback-button"
              onClick={() => setShowFeedbackModal(true)}
            >
              Feedback
            </button>
          ) : null}
        </div>
        <div className="app-header-section app-header-section--right">
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
                <span className="app-menu-label">Menu</span>
                <span className="app-menu-icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
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
        </div>
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
                <span className="style-label-full">{style.label}</span>
                <span className="style-label-short">{style.shortLabel}</span>
                {style.comingSoon ? <span className="style-coming-soon"> (coming soon)</span> : null}
              </button>
            ))}
          </div>

          {selectedStyle && (
            <div className="mode-row mode-row--mobile">
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
            </div>
          )}

          {isNarrowLayout ? practiceDancePanel : null}

          <div className="app-shell-body">
            <div className="app-shell-columns">
              {!isNarrowLayout && (
                <div className="app-shell-column app-shell-column--left">
                  {selectedStyle && (
                    <div className="mode-row mode-row--desktop">
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
                    </div>
                  )}

                  {settingsBodyContent}
                </div>
              )}

              <div className="app-shell-column app-shell-column--right">
                {selectedMode === "practice" && selectedStyle ? (
                  <div className="practice-song-type-panel">
                    <div className="round-queue-wrapper">
                      <h4 className="round-queue-heading">Queue</h4>
                      <div className="round-queue-container" ref={practiceQueueContainerRef}>
                        {practiceQueueContent}
                      </div>
                    </div>
                  </div>
                ) : selectedMode === "round" ? (
                  roundAuthBlocked ? (
                    <div className="round-queue-wrapper">
                      <h4 className="round-queue-heading">Queue</h4>
                      <div className="round-queue-container" ref={roundQueueContainerRef}>
                        {round.length > 0 ? (
                          <ul className="round-queue-list">
                            {round.map((s, i) => (
                              <li
                                key={s.repeatQueueKey ?? s.id ?? s.file ?? i}
                                className="round-queue-item"
                              >
                                {(() => {
                                  const badge = getRoundDanceBadgeInfo(s, selectedStyle);
                                  return (
                                    <div
                                      className={`round-queue-item-art${
                                        badge.isFallback ? " round-queue-item-art--fallback" : ""
                                      }`}
                                      aria-hidden="true"
                                      title={badge.isFallback ? "Unknown dance" : undefined}
                                    >
                                      {badge.label}
                                    </div>
                                  );
                                })()}
                                <div className="round-queue-item-text">
                                  <div className="round-queue-item-title">{getTrackTitle(s)}</div>
                                  <div className="round-queue-item-artist">{getTrackArtist(s)}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: "#b5bac6", margin: 0 }}>
                            Sign in to start this round.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleRoundReloadClick}
                        disabled={
                          !selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle) || roundAuthBlocked
                        }
                        className="neomorphus-button round-reload-button"
                      >
                        New Round
                      </button>
                    </div>
                  ) : (
                    <div className="round-queue-wrapper">
                      <h4 className="round-queue-heading">Queue</h4>
                      <div className="round-queue-container" ref={roundQueueContainerRef}>
                        {round.length > 0 ? (
                          <ul className="round-queue-list">
                            {round.map((s, i) => (
                              <li
                                key={s.repeatQueueKey ?? s.id ?? s.file ?? i}
                                className={`round-queue-item${
                                  currentIndex === i && breakTimeLeft === null
                                    ? " round-queue-item--current"
                                    : ""
                                }${
                                  breakTimeLeft !== null && upcomingIndex === i
                                    ? " round-queue-item--upcoming"
                                    : ""
                                }`}
                              >
                                {(() => {
                                  const badge = getRoundDanceBadgeInfo(s, selectedStyle);
                                  return (
                                    <div
                                      className={`round-queue-item-art${
                                        badge.isFallback ? " round-queue-item-art--fallback" : ""
                                      }`}
                                      aria-hidden="true"
                                      title={badge.isFallback ? "Unknown dance" : undefined}
                                    >
                                      {badge.label}
                                    </div>
                                  );
                                })()}
                                <div className="round-queue-item-text">
                                  <div
                                    className="round-queue-item-title"
                                    style={{
                                      color:
                                        currentIndex === i && breakTimeLeft === null
                                          ? HIGHLIGHT_COLOR
                                          : breakTimeLeft !== null && upcomingIndex === i
                                          ? HIGHLIGHT_COLOR
                                          : undefined,
                                    }}
                                  >
                                    {getTrackTitle(s)}
                                  </div>
                                  <div className="round-queue-item-artist">{getTrackArtist(s)}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: "#b5bac6", margin: 0 }}>
                            Generate a round to see the queue.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleRoundReloadClick}
                        disabled={!selectedStyle || !ENABLED_STYLE_IDS.has(selectedStyle)}
                        className="neomorphus-button round-reload-button"
                      >
                        New Round
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
                  autoPlay={!isBreakActive}
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

          <button
            type="button"
            className="app-shell-settings"
            aria-label={settingsLabel}
            aria-expanded={isSettingsOpen}
            aria-controls="settings-modal"
            ref={settingsButtonRef}
            onClick={() => {
              if (settingsOpenDraggedRef.current) {
                settingsOpenDraggedRef.current = false;
                return;
              }
              if (isSettingsOpen) {
                setIsSettingsOpen(false);
              } else {
                prepareSettingsOpen();
              }
            }}
            onPointerDown={handleSettingsOpenDragStart}
            onPointerMove={handleSettingsOpenDragMove}
            onPointerUp={handleSettingsOpenDragEnd}
            onPointerCancel={handleSettingsOpenDragEnd}
          >
            {!isSettingsOpen && (
              <span className="app-shell-settings-handle" aria-hidden="true">
                <span />
              </span>
            )}
            <span className="app-shell-settings-label">
              {settingsLabel}
            </span>
          </button>

          {isNarrowLayout && (
            <div className={`settings-modal${isSettingsOpen ? " is-open" : ""}`}>
              <button
                type="button"
                className="settings-modal-backdrop"
                onClick={() => setIsSettingsOpen(false)}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div
                className="settings-modal-panel"
                role="dialog"
                aria-modal="true"
                aria-label={settingsLabel}
                id="settings-modal"
                ref={settingsPanelRef}
                onPointerDown={handleSettingsDragStart}
                onPointerMove={handleSettingsDragMove}
                onPointerUp={handleSettingsDragEnd}
                onPointerCancel={handleSettingsDragEnd}
                style={{
                  "--settings-closed-offset":
                    settingsClosedOffset !== null ? `${settingsClosedOffset}px` : undefined,
                  ...(isSettingsOpen
                    ? {
                        transform: `translateY(${settingsDragOffset}px)`,
                        transition: isSettingsDragging ? "none" : undefined,
                      }
                    : null),
                }}
              >
                <div className="settings-modal-handle" aria-hidden="true">
                  <span />
                </div>
                <div className="settings-modal-header">
                  <span className="settings-modal-title">{settingsLabel}</span>
                </div>
                <div className="settings-modal-content" ref={settingsModalContentRef}>
                  {settingsBodyContent}
                </div>
              </div>
            </div>
          )}

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
