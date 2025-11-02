import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INITIAL_STATE = Object.freeze({
  activeKey: null,
  status: "idle",
  currentTime: 0,
  duration: 0,
  buffered: 0,
  error: null,
});

function getBufferedSeconds(audio) {
  try {
    if (!audio || !audio.buffered || audio.buffered.length === 0) {
      return 0;
    }
    return audio.buffered.end(audio.buffered.length - 1);
  } catch {
    return 0;
  }
}

function coerceNumber(value, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default function useAudioController() {
  const audioRef = useRef(null);
  const pendingSeekRef = useRef(null);

  if (!audioRef.current) {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
  }

  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(state);

  const commitState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      stateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return () => {};

    const handleLoadedMetadata = () => {
      if (pendingSeekRef.current != null) {
        try {
          audio.currentTime = pendingSeekRef.current;
        } catch {
          // Ignore seek failures; browsers may block until data is available.
        }
        pendingSeekRef.current = null;
      }
      commitState((prev) => ({
        ...prev,
        duration: coerceNumber(audio.duration, prev.duration),
        status: prev.status === "loading" ? "paused" : prev.status,
      }));
    };

    const handleTimeUpdate = () => {
      commitState((prev) => ({
        ...prev,
        currentTime: coerceNumber(audio.currentTime, prev.currentTime),
        duration: coerceNumber(audio.duration, prev.duration),
        buffered: getBufferedSeconds(audio),
      }));
    };

    const handlePlay = () => {
      commitState((prev) => ({
        ...prev,
        status: "playing",
        error: null,
      }));
    };

    const handlePause = () => {
      commitState((prev) => ({
        ...prev,
        status: audio.ended ? "ended" : "paused",
      }));
    };

    const handleWaiting = () => {
      commitState((prev) => ({
        ...prev,
        status: "buffering",
      }));
    };

    const handlePlaying = () => {
      commitState((prev) => ({
        ...prev,
        status: "playing",
      }));
    };

    const handleEnded = () => {
      commitState((prev) => ({
        ...prev,
        status: "ended",
        currentTime: coerceNumber(audio.duration, prev.currentTime),
      }));
    };

    const handleProgress = () => {
      commitState((prev) => ({
        ...prev,
        buffered: getBufferedSeconds(audio),
      }));
    };

    const handleError = () => {
      let errorMessage = "Audio playback failed";
      if (audio.error) {
        if (audio.error.message) {
          errorMessage = audio.error.message;
        } else if (audio.error.code === 4) {
          errorMessage = "Unsupported audio format or source";
        }
      }
      commitState((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("error", handleError);
    };
  }, [commitState]);

  const load = useCallback(
    async ({ key, url, autoplay = true, startTime = 0 }) => {
      const audio = audioRef.current;
      if (!audio || !url) {
        commitState((prev) => ({
          ...prev,
          status: "error",
          error: "Missing audio source",
        }));
        return;
      }

      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        commitState((prev) => ({
          ...prev,
          status: "error",
          error: "Missing audio source",
        }));
        return;
      }

      try {
        const isSameSource =
          stateRef.current.activeKey === key && audio.src === trimmedUrl;

        if (!isSameSource) {
          audio.pause();
          audio.src = trimmedUrl;
          audio.load();
        }

        const nextCurrentTime = Math.max(0, Number(startTime) || 0);

        if (!Number.isNaN(nextCurrentTime) && Number.isFinite(nextCurrentTime)) {
          pendingSeekRef.current = nextCurrentTime;
          try {
            audio.currentTime = nextCurrentTime;
          } catch {
            // Some browsers disallow setting currentTime before metadata loads.
          }
        } else {
          pendingSeekRef.current = null;
        }

        commitState({
          activeKey: key ?? null,
          status: autoplay ? "loading" : "paused",
          currentTime: nextCurrentTime,
          duration: isSameSource ? stateRef.current.duration : 0,
          buffered: 0,
          error: null,
        });

        if (autoplay) {
          await audio.play();
        }
      } catch (err) {
        console.error("Audio load failed", err);
        commitState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Audio playback failed",
        }));
        throw err;
      }
    },
    [commitState]
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch (err) {
      console.error("Audio play failed", err);
      commitState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Audio playback failed",
      }));
      throw err;
    }
  }, [commitState]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  }, []);

  const seek = useCallback(
    (nextTimeSeconds) => {
      const audio = audioRef.current;
      if (!audio) return;

      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      if (duration == null || duration <= 0) return;

      const next = Math.min(Math.max(Number(nextTimeSeconds) || 0, 0), duration);

      try {
        audio.currentTime = next;
      } catch {
        return;
      }

      pendingSeekRef.current = next;

      commitState((prev) => ({
        ...prev,
        currentTime: next,
      }));
    },
    [commitState]
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    commitState(INITIAL_STATE);
  }, [commitState]);

  const controls = useMemo(
    () => ({
      ...state,
      isPlaying: state.status === "playing",
      isLoading: state.status === "loading" || state.status === "buffering",
      load,
      play,
      pause,
      seek,
      stop,
      audioElement: audioRef.current,
    }),
    [load, pause, play, seek, state, stop]
  );

  return controls;
}
