export const PASO_DANCE_ID = "paso";

export const CRASH_DEFINITIONS = [
  { id: "crash1", field: "crash1Ms", label: "Crash 1" },
  { id: "crash2", field: "crash2Ms", label: "Crash 2" },
  { id: "crash3", field: "crash3Ms", label: "Crash 3" },
];

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function canonicalizePaso(value) {
  if (!value && value !== 0) {
    return null;
  }
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  if (normalized === PASO_DANCE_ID) {
    return PASO_DANCE_ID;
  }
  const compact = normalized.replace(/[\s_-]+/g, "");
  if (compact === "pasodoble") {
    return PASO_DANCE_ID;
  }
  return normalized;
}

export function normalizeDanceId(candidate) {
  if (!candidate && candidate !== 0) {
    return null;
  }

  if (typeof candidate === "string") {
    return canonicalizePaso(candidate);
  }

  if (typeof candidate === "object") {
    return (
      canonicalizePaso(candidate.danceId) ||
      canonicalizePaso(candidate.dance) ||
      canonicalizePaso(candidate.category)
    );
  }

  return null;
}

export function isPasoSong(candidate) {
  const normalized = normalizeDanceId(candidate);
  return normalized === PASO_DANCE_ID;
}

export function getCrashSeconds(song, crashId) {
  if (!song || !crashId) return null;
  const crashDef = CRASH_DEFINITIONS.find((def) => def.id === crashId);
  if (!crashDef) return null;
  const raw = song?.[crashDef.field];
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return raw / 1000;
}

export function getCrashOptions(song) {
  if (!song) return [];
  return CRASH_DEFINITIONS.map((def) => {
    const seconds = getCrashSeconds(song, def.id);
    if (seconds == null) {
      return null;
    }
    return { ...def, seconds };
  }).filter(Boolean);
}

export function getCrashRelativeDurationSeconds(song, crashId, clipStartSeconds) {
  const crashSeconds = getCrashSeconds(song, crashId);
  if (crashSeconds == null) {
    return null;
  }
  const safeClipStart = Number.isFinite(clipStartSeconds) ? clipStartSeconds : 0;
  const relative = crashSeconds - safeClipStart;
  if (!Number.isFinite(relative)) {
    return null;
  }
  return Math.max(relative, 0);
}

export function getEarliestAbsoluteCutoff({
  clipStartSeconds = 0,
  clipEndSeconds = null,
  durationSeconds = null,
  crashSeconds = null,
}) {
  const sliderAbsolute =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? clipStartSeconds + durationSeconds
      : null;

  const candidates = [clipEndSeconds, crashSeconds, sliderAbsolute].filter(
    (value) => value != null && Number.isFinite(value) && value > 0
  );

  if (candidates.length === 0) {
    return null;
  }

  return Math.min(...candidates);
}
