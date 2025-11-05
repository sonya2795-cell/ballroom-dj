import { useCallback, useRef } from "react";

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function getPointerFraction(event, element) {
  const rect = element.getBoundingClientRect();
  if (!rect || rect.width <= 0) return 0;
  const relativeX = event.clientX - rect.left;
  if (Number.isNaN(relativeX)) return 0;
  return clamp(relativeX / rect.width, 0, 1);
}

export default function TrackProgressBar({
  currentTime,
  duration,
  buffered,
  onSeek,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const seekingRef = useRef(false);

  const handlePointerDown = useCallback(
    (event) => {
      if (disabled) return;
      const container = containerRef.current;
      if (!container || typeof onSeek !== "function") return;
      container.setPointerCapture?.(event.pointerId);
      seekingRef.current = true;
      const fraction = getPointerFraction(event, container);
      const nextTime = (duration || 0) * fraction;
      onSeek(nextTime, { isScrubbing: true });
    },
    [disabled, duration, onSeek]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (disabled || !seekingRef.current) return;
      const container = containerRef.current;
      if (!container || typeof onSeek !== "function") return;
      if (container.hasPointerCapture && !container.hasPointerCapture(event.pointerId)) {
        return;
      }
      const fraction = getPointerFraction(event, container);
      const nextTime = (duration || 0) * fraction;
      onSeek(nextTime, { isScrubbing: true });
    },
    [disabled, duration, onSeek]
  );

  const handlePointerEnd = useCallback(
    (event) => {
      if (!seekingRef.current) return;
      seekingRef.current = false;
      const container = containerRef.current;
      if (container?.releasePointerCapture) {
        try {
          container.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore pointer capture release failures.
        }
      }
      if (disabled || typeof onSeek !== "function") return;
      const fraction = getPointerFraction(event, container);
      const nextTime = (duration || 0) * fraction;
      onSeek(nextTime, { isScrubbing: false });
    },
    [disabled, duration, onSeek]
  );

  const progressPercent =
    duration && duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const bufferedPercent =
    duration && duration > 0 ? clamp((buffered / duration) * 100, 0, 100) : 0;

  return (
    <div
      ref={containerRef}
      role="progressbar"
      aria-valuenow={Math.round(progressPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Song progress"
      style={{
        position: "relative",
        width: "100%",
        height: "6px",
        borderRadius: "999px",
        background: "rgba(255, 255, 255, 0.15)",
        overflow: "hidden",
        cursor: disabled ? "default" : "pointer",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${bufferedPercent}%`,
          background: "rgba(255, 255, 255, 0.25)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${progressPercent}%`,
          background: "rgba(37, 237, 117, 0.9)",
          boxShadow: "0 0 6px rgba(37, 237, 117, 0.6)",
          transition: seekingRef.current ? "none" : "width 120ms linear",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

