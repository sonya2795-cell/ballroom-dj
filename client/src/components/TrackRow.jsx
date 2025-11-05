import { Fragment, useMemo } from "react";
import TrackProgressBar from "./TrackProgressBar.jsx";

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return "--:--";
  }
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total - minutes * 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function TrackRow({
  row,
  rowKey,
  onFieldChange,
  onBlur,
  onKeyDown,
  onSave,
  onDelete,
  disabledSave,
  disabledDelete,
  errorMessage,
  hovered,
  onHoverChange,
  showPasoFields,
  crashFields,
  playback,
}) {
  const {
    isActive,
    isPlaying,
    isLoading,
    onTogglePlay,
    onSeek,
    currentTime,
    duration,
    buffered,
    error,
    fallbackDuration,
  } = playback;

  const displayDuration = useMemo(() => duration ?? fallbackDuration ?? null, [duration, fallbackDuration]);

  const playLabel = isLoading
    ? "Loading…"
    : isActive
      ? isPlaying
        ? "Pause"
        : playback?.status === "ended"
          ? "Replay"
          : "Play"
      : "Play";

  const disablePlay = !row.storagePath || isLoading;

  return (
    <Fragment>
      <tr style={{ borderTop: "1px solid rgba(255, 255, 255, 0.07)" }}>
        <td style={{ padding: "0.5rem", minWidth: "80px" }}>
          <div
            style={{ display: "flex", alignItems: "center", position: "relative" }}
            onMouseEnter={() => (row.storagePath ? onHoverChange(rowKey) : null)}
            onMouseLeave={() => onHoverChange(null)}
            onFocus={() => (row.storagePath ? onHoverChange(rowKey) : null)}
            onBlur={() => onHoverChange(null)}
          >
            <span
              aria-label={row.storagePath ? `Storage path ${row.storagePath}` : "Storage path not available"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.5rem",
                height: "1.5rem",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "rgba(242, 244, 247, 0.85)",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: row.storagePath ? "pointer" : "default",
                outline: "none",
              }}
              tabIndex={row.storagePath ? 0 : -1}
            >
              i
            </span>
            {hovered && row.storagePath ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 0.25rem)",
                  left: "0",
                  background: "rgba(4, 6, 10, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "0.4rem",
                  padding: "0.4rem 0.55rem",
                  fontSize: "0.8rem",
                  color: "rgba(242, 244, 247, 0.95)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.45)",
                  zIndex: 5,
                }}
              >
                {row.storagePath}
              </div>
            ) : null}
          </div>
        </td>
        <td style={{ padding: "0.5rem 0.5rem 0.5rem 5px", minWidth: "180px" }}>
          <input
            type="text"
            value={row.title}
            onChange={onFieldChange(rowKey, "title")}
            onBlur={onBlur(rowKey)}
            onKeyDown={onKeyDown}
            style={{
              width: "100%",
              borderRadius: "0.4rem",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(10, 12, 16, 0.85)",
              color: "inherit",
              padding: "0.4rem 0.6rem",
            }}
          />
        </td>
        <td style={{ padding: "0.5rem", minWidth: "160px" }}>
          <input
            type="text"
            value={row.artist}
            onChange={onFieldChange(rowKey, "artist")}
            onBlur={onBlur(rowKey)}
            onKeyDown={onKeyDown}
            style={{
              width: "100%",
              borderRadius: "0.4rem",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(10, 12, 16, 0.85)",
              color: "inherit",
              padding: "0.4rem 0.6rem",
            }}
          />
        </td>
        <td style={{ padding: "0.5rem", width: "110px" }}>
          <input
            type="number"
            step="1"
            value={row.bpm}
            onChange={onFieldChange(rowKey, "bpm")}
            onBlur={onBlur(rowKey)}
            onKeyDown={onKeyDown}
            style={{
              width: "100%",
              borderRadius: "0.4rem",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(10, 12, 16, 0.85)",
              color: "inherit",
              padding: "0.4rem 0.6rem",
            }}
          />
        </td>
        <td style={{ padding: "0.5rem", width: "140px" }}>
          <input
            type="number"
            step="0.001"
            value={row.startSeconds}
            onChange={onFieldChange(rowKey, "startSeconds")}
            onBlur={onBlur(rowKey)}
            onKeyDown={onKeyDown}
            style={{
              width: "100%",
              borderRadius: "0.4rem",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(10, 12, 16, 0.85)",
              color: "inherit",
              padding: "0.4rem 0.6rem",
            }}
          />
        </td>
        <td style={{ padding: "0.5rem", width: "140px" }}>
          <input
            type="number"
            step="0.001"
            value={row.endSeconds}
            onChange={onFieldChange(rowKey, "endSeconds")}
            onBlur={onBlur(rowKey)}
            onKeyDown={onKeyDown}
            style={{
              width: "100%",
              borderRadius: "0.4rem",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              background: "rgba(10, 12, 16, 0.85)",
              color: "inherit",
              padding: "0.4rem 0.6rem",
            }}
          />
        </td>
        <td style={{ padding: "0.5rem", minWidth: "220px" }}>
          {row.storagePath ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => onTogglePlay(row)}
                  disabled={disablePlay}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "0.65rem",
                    background: isActive
                      ? "rgba(37, 237, 117, 0.18)"
                      : "rgba(255, 255, 255, 0.15)",
                    border: isActive
                      ? "1px solid rgba(37, 237, 117, 0.45)"
                      : "1px solid rgba(255, 255, 255, 0.25)",
                    color: "inherit",
                    cursor: disablePlay ? "default" : "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    opacity: disablePlay ? 0.6 : 1,
                  }}
                >
                  {playLabel}
                </button>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontVariantNumeric: "tabular-nums",
                    opacity: displayDuration != null ? 0.85 : 0.55,
                  }}
                >
                  {formatTime(isActive ? currentTime : 0)} / {formatTime(displayDuration)}
                </span>
              </div>
              <TrackProgressBar
                currentTime={isActive ? currentTime : 0}
                duration={displayDuration || 0}
                buffered={isActive ? buffered : 0}
                disabled={!row.storagePath || displayDuration == null}
                onSeek={(nextTime, meta) => onSeek(row, nextTime, meta)}
              />
              {isLoading ? (
                <span style={{ fontSize: "0.75rem", color: "rgba(242, 244, 247, 0.7)" }}>
                  Loading preview…
                </span>
              ) : null}
              {error ? (
                <span style={{ fontSize: "0.75rem", color: "#f8b3b3" }}>{error}</span>
              ) : null}
            </div>
          ) : (
            <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>No storage path</span>
          )}
        </td>
        <td style={{ padding: "0.5rem", textAlign: "right" }}>
          <div style={{ display: "inline-flex", gap: "0.35rem" }}>
            <button
              type="button"
              onClick={() => onSave(rowKey)}
              disabled={disabledSave}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "0.65rem",
                background: "rgba(255, 255, 255, 0.18)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "inherit",
                cursor: disabledSave ? "default" : "pointer",
                fontSize: "0.8rem",
                opacity: disabledSave ? 0.6 : 1,
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => onDelete(row)}
              disabled={disabledDelete}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "0.65rem",
                background: "rgba(224, 85, 85, 0.18)",
                border: "1px solid rgba(224, 85, 85, 0.35)",
                color: "inherit",
                cursor: disabledDelete ? "default" : "pointer",
                fontSize: "0.8rem",
                opacity: disabledDelete ? 0.6 : 1,
              }}
            >
              Delete
            </button>
          </div>
          {errorMessage ? (
            <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#f8b3b3" }}>
              {errorMessage}
            </div>
          ) : null}
        </td>
      </tr>
      {showPasoFields ? (
        <tr style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <td colSpan={4} style={{ padding: "0.35rem 0.5rem 0.75rem", fontSize: "0.85rem" }}>
            Paso crashes (seconds)
          </td>
          <td colSpan={3} style={{ padding: "0.5rem 0.5rem 0.75rem" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "nowrap",
                gap: "1rem",
                alignItems: "center",
                justifyContent: "flex-start",
                overflowX: "auto",
              }}
            >
              {crashFields.map(({ field, label }) => (
                <div
                  key={`${rowKey}-${field}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    minWidth: 0,
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ opacity: 0.75, whiteSpace: "nowrap" }}>{label}</span>
                  <input
                    type="number"
                    step="0.001"
                    value={row[field] ?? ""}
                    onChange={onFieldChange(rowKey, field)}
                    onBlur={onBlur(rowKey)}
                    onKeyDown={onKeyDown}
                    style={{
                      width: "6rem",
                      borderRadius: "0.4rem",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(10, 12, 16, 0.85)",
                      color: "inherit",
                      padding: "0.35rem 0.4rem",
                    }}
                  />
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
