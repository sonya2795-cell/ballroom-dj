import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INITIAL_STATE = Object.freeze({
  trackId: null,
  status: "idle",
  currentTime: 0,
  duration: 0,
  buffered: 0,
  error: null,
});

function safeNumber(value, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getBufferedSeconds(audio) {
  if (!audio?.buffered || audio.buffered.length === 0) return 0;
  try {
    return audio.buffered.end(audio.buffered.length - 1);
  } catch {
    return 0;
  }
}

export default function useAudioPlayer() {
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const pendingSeekRef = useRef(null);

  const [state, setState] = useState(INITIAL_STATE);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const commitState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const stepAnimation = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    commitState((prev) => ({
      ...prev,
      currentTime: safeNumber(audio.currentTime, prev.currentTime),
      duration: safeNumber(audio.duration, prev.duration),
      buffered: getBufferedSeconds(audio),
    }));

    animationRef.current = requestAnimationFrame(stepAnimation);
  }, [commitState]);

  useEffect(() => {
    const audio = ensureAudio();
    if (!audio) return () => {};

    const handleLoadedMetadata = () => {
      if (pendingSeekRef.current != null) {
        try {
          audio.currentTime = pendingSeekRef.current;
        } catch {
          // Ignore failures; some browsers prevent setting currentTime too early.
        } finally {
          pendingSeekRef.current = null;
        }
      }

      commitState((prev) => ({
        ...prev,
        duration: safeNumber(audio.duration, prev.duration),
        status: prev.status === "loading" ? "paused" : prev.status,
      }));
    };

    const handleTimeUpdate = () => {
      commitState((prev) => ({
        ...prev,
        currentTime: safeNumber(audio.currentTime, prev.currentTime),
        duration: safeNumber(audio.duration, prev.duration),
      }));
    };

    const handlePlay = () => {
      stopAnimation();
      animationRef.current = requestAnimationFrame(stepAnimation);
      commitState((prev) => ({
        ...prev,
        status: "playing",
        error: null,
      }));
    };

    const handlePause = () => {
      stopAnimation();
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
      stopAnimation();
      commitState((prev) => ({
        ...prev,
        status: "ended",
        currentTime: safeNumber(audio.duration, prev.currentTime),
      }));
    };

    const handleProgress = () => {
      commitState((prev) => ({
        ...prev,
        buffered: getBufferedSeconds(audio),
      }));
    };

    const handleError = () => {
      stopAnimation();
      const { error } = audio;
      let message = "Audio playback failed";
      if (error) {
        if (error.message) {
          message = error.message;
        } else if (error.code === 4) {
          message = "Unsupported audio source";
        }
      }
      commitState((prev) => ({
        ...prev,
        status: "error",
        error: message,
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
      stopAnimation();
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
  }, [commitState, ensureAudio, stepAnimation, stopAnimation]);

  const loadTrack = useCallback(
    async ({ trackId, src, autoplay = true, startTime = 0 }) => {
      if (!src) {
        commitState({
          ...INITIAL_STATE,
          error: "Missing audio source",
          trackId: null,
          status: "error",
        });
        return;
      }

      const audio = ensureAudio();
      const trimmedSrc = src.trim();
      const nextTrackId = trackId ?? trimmedSrc;
      pendingSeekRef.current = Number.isFinite(startTime) ? Math.max(startTime, 0) : 0;

      const isSameTrack =
        state.trackId === nextTrackId && audio.src === trimmedSrc;

      try {
        if (!isSameTrack) {
          stopAnimation();
          audio.pause();
          audio.src = trimmedSrc;
          audio.load();
        }

        if (pendingSeekRef.current > 0) {
          try {
            audio.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          } catch {
            // Will retry after metadata loads.
          }
        }

        commitState({
          trackId: nextTrackId,
          status: autoplay ? "loading" : "paused",
          currentTime: safeNumber(audio.currentTime, 0),
          duration: safeNumber(audio.duration, 0),
          buffered: getBufferedSeconds(audio),
          error: null,
        });

        if (autoplay) {
          await audio.play();
        }
      } catch (err) {
        stopAnimation();
        console.error("loadTrack failed", err);
        commitState({
          trackId: nextTrackId,
          status: "error",
          currentTime: 0,
          duration: 0,
          buffered: 0,
          error: err instanceof Error ? err.message : "Failed to load audio",
        });
        throw err;
      }
    },
    [commitState, ensureAudio, state.trackId, stopAnimation]
  );

  const play = useCallback(async () => {
    const audio = ensureAudio();
    try {
      await audio.play();
    } catch (err) {
      console.error("play() failed", err);
      commitState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to play audio",
      }));
      throw err;
    }
  }, [commitState, ensureAudio]);

  const pause = useCallback(() => {
    const audio = ensureAudio();
    audio.pause();
  }, [ensureAudio]);

  const seek = useCallback(
    (seconds) => {
      const audio = ensureAudio();
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      if (duration == null) return;

      const target = Math.min(Math.max(Number(seconds) || 0, 0), duration);
      try {
        audio.currentTime = target;
      } catch (err) {
        console.error("seek failed", err);
        return;
      }
      pendingSeekRef.current = null;
      commitState((prev) => ({
        ...prev,
        currentTime: target,
      }));
    },
    [commitState, ensureAudio]
  );

  const stop = useCallback(() => {
    const audio = ensureAudio();
    stopAnimation();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    pendingSeekRef.current = null;
    commitState({ ...INITIAL_STATE });
  }, [commitState, ensureAudio, stopAnimation]);

  return useMemo(
    () => ({
      ...state,
      isPlaying: state.status === "playing",
      isLoading: state.status === "loading" || state.status === "buffering",
      loadTrack,
      play,
      pause,
      seek,
      stop,
      audioElement: audioRef.current ?? null,
    }),
    [loadTrack, pause, play, seek, state, stop]
  );
}

