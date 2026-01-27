import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AudioPlayerProvider from "../context/AudioPlayerContext.jsx";
import TrackRow from "../components/TrackRow.jsx";
import { createSong, getSongPlaybackUrl, listSongs, removeSong, upsertSong } from "../services/songService.js";
import { fetchStorageFiles, uploadSongFile } from "../services/storageService.js";
import UploadSongDialog from "../components/UploadSongDialog.jsx";
import useAudioPlayerContext from "../hooks/useAudioPlayerContext.js";

const STYLE_OPTIONS = [
  {
    id: "ballroom",
    label: "Ballroom",
    dances: [
      { id: "Waltz", label: "Waltz" },
      { id: "Tango", label: "Tango" },
      { id: "VienneseWaltz", label: "Viennese Waltz" },
      { id: "Foxtrot", label: "Foxtrot" },
      { id: "Quickstep", label: "Quickstep" },
    ],
  },
  {
    id: "latin",
    label: "Latin",
    dances: [
      { id: "ChaCha", label: "Cha Cha" },
      { id: "Samba", label: "Samba" },
      { id: "Rumba", label: "Rumba" },
      { id: "Paso", label: "Paso" },
      { id: "Jive", label: "Jive" },
    ],
  },
  {
    id: "rhythm",
    label: "Rhythm",
    dances: [
      { id: "ChaCha", label: "Cha Cha" },
      { id: "Rumba", label: "Rumba" },
      { id: "EastCoastSwing", label: "Swing" },
      { id: "Bolero", label: "Bolero" },
      { id: "Mambo", label: "Mambo" },
    ],
  },
  {
    id: "smooth",
    label: "Smooth",
    dances: [
      { id: "Waltz", label: "Waltz" },
      { id: "Tango", label: "Tango" },
      { id: "Foxtrot", label: "Foxtrot" },
      { id: "VienneseWaltz", label: "Viennese Waltz" },
    ],
  },
];

const STYLE_SEGMENT_TO_ID = new Map();
const STYLE_TO_DANCE_SEGMENTS = new Map();

STYLE_OPTIONS.forEach((style) => {
  const styleKeys = [style.id, style.label];
  styleKeys.forEach((key) => {
    if (typeof key === "string") {
      STYLE_SEGMENT_TO_ID.set(key.toLowerCase(), style.id);
    }
  });

  const danceMap = new Map();
  style.dances.forEach((dance) => {
    const danceKeys = [dance.id, dance.label];
    danceKeys.forEach((key) => {
      if (typeof key === "string") {
        danceMap.set(key.toLowerCase(), dance.id);
      }
    });
  });
  STYLE_TO_DANCE_SEGMENTS.set(style.id, danceMap);
});

function millisToSecondsString(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "";
  return String(ms / 1000);
}

function parseSeconds(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return null;
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < 0) return null;
  return numberValue;
}

function secondsToMillis(value) {
  const seconds = parseSeconds(value);
  if (seconds === null) return null;
  return Math.round(seconds * 1000);
}

const PASO_DANCE_IDS = new Set(["paso", "paso doble", "pasodoble"]);

const PASO_CRASH_FIELD_CONFIG = [
  { secondsField: "crash1Seconds", msField: "crash1Ms", label: "1st Crash" },
  { secondsField: "crash2Seconds", msField: "crash2Ms", label: "2nd Crash" },
  { secondsField: "crash3Seconds", msField: "crash3Ms", label: "3rd Crash" },
];

const PASO_CRASH_UI_FIELDS = PASO_CRASH_FIELD_CONFIG.map(({ secondsField, label }) => ({
  field: secondsField,
  label,
}));

function isPasoRow(row) {
  const danceId = typeof row?.danceId === "string" ? row.danceId.toLowerCase() : "";
  if (danceId && PASO_DANCE_IDS.has(danceId)) {
    return true;
  }

  const storagePath = typeof row?.storagePath === "string" ? row.storagePath.toLowerCase() : "";
  if (storagePath.includes("/paso")) {
    return true;
  }

  return false;
}

function buildCrashFieldStateFromMs(source = {}) {
  const result = {};
  PASO_CRASH_FIELD_CONFIG.forEach(({ secondsField, msField }) => {
    const raw = typeof source?.[msField] === "number" ? source[msField] : null;
    result[msField] = raw ?? null;
    result[secondsField] = raw != null ? millisToSecondsString(raw) : "";
  });
  return result;
}

function buildCrashSnapshotFromRow(row = {}) {
  const snapshot = {};
  PASO_CRASH_FIELD_CONFIG.forEach(({ secondsField, msField }) => {
    snapshot[msField] = secondsToMillis(row?.[secondsField]);
  });
  return snapshot;
}

function buildCrashPatchFromSnapshot(crashSnapshot) {
  const patch = {};
  PASO_CRASH_FIELD_CONFIG.forEach(({ secondsField, msField }) => {
    const value = crashSnapshot[msField];
    patch[msField] = value ?? null;
    patch[secondsField] = value != null ? millisToSecondsString(value) : "";
  });
  return patch;
}

function inferStyleDanceFromPath(storagePath) {
  if (!storagePath || typeof storagePath !== "string") {
    return { styleId: null, danceId: null };
  }

  const [styleSegment, danceSegment] = storagePath.split("/").filter(Boolean);
  if (!styleSegment) {
    return { styleId: null, danceId: null };
  }

  const styleId = STYLE_SEGMENT_TO_ID.get(styleSegment.toLowerCase()) ?? null;
  if (!styleId) {
    return { styleId: null, danceId: null };
  }

  const danceMap = STYLE_TO_DANCE_SEGMENTS.get(styleId);
  const danceId = danceSegment ? danceMap?.get(danceSegment.toLowerCase()) ?? null : null;

  return { styleId, danceId };
}

function rowDurationSeconds(row) {
  if (typeof row?.durationMs === "number") return row.durationMs / 1000;
  if (typeof row?.storageInfo?.durationMs === "number") return row.storageInfo.durationMs / 1000;
  return null;
}

function hasClipTimes(row) {
  const start = parseSeconds(row?.startSeconds);
  const end = parseSeconds(row?.endSeconds);
  if (start != null || end != null) return true;
  if (typeof row?.startMs === "number" || typeof row?.endMs === "number") return true;
  return false;
}

function toNumberOrNull(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

const DEFAULT_FILTERS = Object.freeze({
  search: "",
  style: "all",
  dance: "all",
  bpmMin: "",
  bpmMax: "",
  durationMin: "",
  durationMax: "",
  missingMetadataOnly: false,
  missingClipOnly: false,
  missingBpmOnly: false,
});

const SORT_BUTTON_STYLE = Object.freeze({
  background: "transparent",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  padding: 0,
});

const SORT_ARROW_STYLE = Object.freeze({
  fontSize: "0.7rem",
  opacity: 0.7,
});

const SORT_KEY_GETTERS = {
  storagePath: (row) => row.storagePath?.toLowerCase() ?? "",
  title: (row) => row.title?.toLowerCase() ?? "",
  artist: (row) => row.artist?.toLowerCase() ?? "",
  bpm: (row) => {
    const bpm = toNumberOrNull(row.bpm);
    return bpm != null ? bpm : null;
  },
  startSeconds: (row) => {
    const seconds = parseSeconds(row.startSeconds);
    if (seconds != null) return seconds;
    if (typeof row.startMs === "number") return row.startMs / 1000;
    return null;
  },
  endSeconds: (row) => {
    const seconds = parseSeconds(row.endSeconds);
    if (seconds != null) return seconds;
    if (typeof row.endMs === "number") return row.endMs / 1000;
    return null;
  },
  duration: (row) => {
    const seconds = rowDurationSeconds(row);
    return Number.isFinite(seconds) ? seconds : null;
  },
  updated: (row) => row.storageInfo?.updated ?? null,
};

function compareValues(a, b, direction) {
  const factor = direction === "desc" ? -1 : 1;
  const isEmpty = (value) =>
    value === null || typeof value === "undefined" || (typeof value === "string" && value.trim() === "");

  const aEmpty = isEmpty(a);
  const bEmpty = isEmpty(b);
  if (aEmpty && !bEmpty) return 1 * factor;
  if (!aEmpty && bEmpty) return -1 * factor;
  if (aEmpty && bEmpty) return 0;

  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b) * factor;
  }

  const aNum = Number(a);
  const bNum = Number(b);
  const aValid = Number.isFinite(aNum);
  const bValid = Number.isFinite(bNum);

  if (aValid && bValid) {
    if (aNum === bNum) return 0;
    return aNum > bNum ? 1 * factor : -1 * factor;
  }

  return String(a).localeCompare(String(b)) * factor;
}

function combineSongData(firestoreSongs, storageFiles) {
  const map = new Map();

  firestoreSongs.forEach((song) => {
    if (!song.storagePath) return;
    const filename = song.filename ?? song.storagePath.split("/").pop() ?? song.storagePath;
    const inferred = inferStyleDanceFromPath(song.storagePath);
    const crashFieldState = buildCrashFieldStateFromMs(song);
    map.set(song.storagePath, {
      rowKey: song.id ?? song.storagePath,
      id: song.id,
      storagePath: song.storagePath,
      filename,
      title: song.title ?? filename,
      artist: song.artist ?? "",
      bpm: song.bpm != null ? String(song.bpm) : "",
      startMs: song.startMs ?? null,
      endMs: song.endMs ?? null,
      durationMs: song.durationMs ?? null,
      startSeconds: song.startMs != null ? millisToSecondsString(song.startMs) : "",
      endSeconds: song.endMs != null ? millisToSecondsString(song.endMs) : "",
      hasMetadata: true,
      storageInfo: null,
      styleId: song.styleId ?? inferred.styleId,
      danceId: song.danceId ?? inferred.danceId,
      ...crashFieldState,
    });
  });

  storageFiles.forEach((file) => {
    const key = file.path;
    const filename = file.filename ?? key.split("/").pop() ?? key;
    const inferred = inferStyleDanceFromPath(key);
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        filename: existing.filename || filename,
        title: existing.title && existing.title.trim() ? existing.title : filename,
        storageInfo: file,
        styleId: existing.styleId ?? inferred.styleId,
        danceId: existing.danceId ?? inferred.danceId,
      });
    } else {
      const crashFieldState = buildCrashFieldStateFromMs({});
      map.set(key, {
        rowKey: key,
        id: null,
        storagePath: key,
        filename,
        title: filename,
        artist: "",
        bpm: "",
        startMs: null,
        endMs: null,
        durationMs: file.durationMs ?? null,
        startSeconds: "",
        endSeconds: "",
        hasMetadata: false,
        storageInfo: file,
        styleId: inferred.styleId,
        danceId: inferred.danceId,
        ...crashFieldState,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => (a.storagePath || "").localeCompare(b.storagePath || ""));
}

function AdminLibraryContent() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [saveState, setSaveState] = useState({});
  const [saveErrors, setSaveErrors] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [hoveredInfoKey, setHoveredInfoKey] = useState(null);

  const rowsRef = useRef(new Map());
  const snapshotsRef = useRef(new Map());
  const audio = useAudioPlayerContext();
  const playbackUrlCacheRef = useRef(new Map());
  const [playbackState, setPlaybackState] = useState({});
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [sortState, setSortState] = useState(() => ({ field: "storagePath", direction: "asc" }));

  const keyFor = useCallback((song) => song.rowKey ?? song.storagePath, []);

  const refreshRefs = useCallback((data) => {
    const rowsMap = new Map();
    const snapshot = new Map();
    data.forEach((song) => {
      const key = keyFor(song);
      rowsMap.set(key, song);
      const crashSnapshot = buildCrashSnapshotFromRow(song);
      snapshot.set(key, {
        title: song.title,
        artist: song.artist,
        bpm: song.bpm !== "" ? Number(song.bpm) : null,
        startMs: song.startMs ?? null,
        endMs: song.endMs ?? null,
        ...crashSnapshot,
      });
    });
    rowsRef.current = rowsMap;
    snapshotsRef.current = snapshot;
    console.debug("[admin-library] refreshRefs", { rows: data.length });
  }, [keyFor]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStorageError(null);

    try {
      const [songsResult, storageResult] = await Promise.allSettled([
        listSongs(),
        fetchStorageFiles(),
      ]);

      const firestoreSongs = songsResult.status === "fulfilled" ? songsResult.value : [];
      if (songsResult.status === "rejected") {
        console.error("Failed to load songs", songsResult.reason);
        setError(
          songsResult.reason instanceof Error
            ? songsResult.reason.message
            : "Failed to load songs"
        );
      }

      const storageFiles = storageResult.status === "fulfilled" ? storageResult.value : [];
      if (storageResult.status === "rejected") {
        console.error("Failed to load storage files", storageResult.reason);
        setStorageError(
          storageResult.reason instanceof Error
            ? storageResult.reason.message
            : "Failed to load storage files"
        );
      }

      let cleanedSongs = firestoreSongs;
      if (storageResult.status === "fulfilled") {
        const storagePaths = new Set(
          storageFiles
            .map((file) => (typeof file?.path === "string" ? file.path.trim() : ""))
            .filter(Boolean)
        );
        const missingSongs = firestoreSongs.filter((song) => {
          const storagePath = typeof song?.storagePath === "string" ? song.storagePath.trim() : "";
          return storagePath && !storagePaths.has(storagePath);
        });

        if (missingSongs.length) {
          console.warn("[admin-library] auto-cleanup missing storage files", {
            missing: missingSongs.length,
          });
          await Promise.allSettled(
            missingSongs.map((song) => (song?.id ? removeSong(song.id) : Promise.resolve()))
          );
          const missingPaths = new Set(
            missingSongs
              .map((song) => (typeof song?.storagePath === "string" ? song.storagePath.trim() : ""))
              .filter(Boolean)
          );
          cleanedSongs = firestoreSongs.filter((song) => {
            const storagePath = typeof song?.storagePath === "string" ? song.storagePath.trim() : "";
            return !missingPaths.has(storagePath);
          });
        }
      }

      const combined = combineSongData(cleanedSongs, storageFiles);
      console.debug("[admin-library] loadRows combined", {
        firestoreSongs: cleanedSongs.length,
        storageFiles: storageFiles.length,
        combined: combined.length,
      });
      setRows(combined);
      refreshRefs(combined);
    } catch (err) {
      console.error("Unexpected error loading songs", err);
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, [refreshRefs]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const handleUploadSubmit = useCallback(
    async ({ styleId, danceId, fileBase64, fileName, title, artist, bpm, file }) => {
      const trimmedTitle = title?.trim() ?? "";
      const trimmedArtist = artist?.trim() ?? "";
      const bpmNumber = bpm ? Number(bpm) : null;

      if (bpm && Number.isNaN(bpmNumber)) {
        throw new Error("BPM must be numeric");
      }

      try {
        const uploadResult = await uploadSongFile({
          styleId,
          danceId,
          fileBase64,
          fileName,
          contentType: file?.type || "audio/mpeg",
          metadata: {
            title: trimmedTitle || undefined,
            artist: trimmedArtist || undefined,
            bpm: bpmNumber != null ? String(bpmNumber) : undefined,
          },
        });

        const resolvedTitle = trimmedTitle || uploadResult.filename.replace(/\.mp3$/i, "");

        await createSong({
          storagePath: uploadResult.storagePath,
          title: resolvedTitle,
          artist: trimmedArtist,
          bpm: bpmNumber,
        });

        setBannerMessage({ type: "success", text: "Song uploaded" });
        await loadRows();
      } catch (err) {
        console.error("Failed to upload song", err);
        setBannerMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to upload song",
        });
        throw err;
      }
    },
    [loadRows]
  );

  const markPlaybackState = useCallback((storagePath, next) => {
    if (!storagePath) return;
    setPlaybackState((prev) => {
      if (!next) {
        if (!prev[storagePath]) return prev;
        const clone = { ...prev };
        delete clone[storagePath];
        return clone;
      }
      return { ...prev, [storagePath]: next };
    });
  }, []);

  const ensurePlaybackUrl = useCallback(async (storagePath) => {
    if (!storagePath) {
      throw new Error("Storage path missing");
    }
    const normalized = storagePath.trim();
    const cache = playbackUrlCacheRef.current;
    if (cache.has(normalized)) {
      return cache.get(normalized);
    }
    const url = await getSongPlaybackUrl(normalized);
    cache.set(normalized, url);
    return url;
  }, []);

  const handleTogglePreview = useCallback(
    async (row) => {
      const storagePath = row?.storagePath?.trim();
      if (!storagePath) return;

      const clipStartSeconds =
        parseSeconds(row.startSeconds) ??
        (typeof row.startMs === "number" ? row.startMs / 1000 : 0);
      const isActive = audio.trackId === storagePath;

      if (isActive) {
        if (audio.isPlaying) {
          audio.pause();
        } else {
          try {
            await audio.play();
            markPlaybackState(storagePath, null);
          } catch (err) {
            console.error("Failed to resume preview", err);
            markPlaybackState(storagePath, {
              status: "error",
              error: err instanceof Error ? err.message : "Failed to resume playback",
            });
          }
        }
        return;
      }

      markPlaybackState(storagePath, { status: "loading" });
      try {
        const url = await ensurePlaybackUrl(storagePath);
        markPlaybackState(storagePath, null);
        await audio.loadTrack({
          trackId: storagePath,
          src: url,
          autoplay: true,
          startTime: clipStartSeconds ?? 0,
        });
      } catch (err) {
        console.error("Failed to start preview", err);
        markPlaybackState(storagePath, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to start preview",
        });
      }
    },
    [audio, ensurePlaybackUrl, markPlaybackState]
  );

  const handleSeek = useCallback(
    async (row, nextTimeSeconds, meta = {}) => {
      const storagePath = row?.storagePath?.trim();
      if (!storagePath) return;

      const isActive = audio.trackId === storagePath;
      const shouldAutoplay = !meta?.isScrubbing;

      if (isActive) {
        audio.seek(nextTimeSeconds);
        if (shouldAutoplay && audio.status !== "playing") {
          audio.play().catch((err) => {
            console.error("Failed to resume after scrubbing", err);
            markPlaybackState(storagePath, {
              status: "error",
              error: err instanceof Error ? err.message : "Failed to resume playback",
            });
          });
        }
        return;
      }

      markPlaybackState(storagePath, { status: "loading" });
      try {
        const url = await ensurePlaybackUrl(storagePath);
        markPlaybackState(storagePath, null);
        await audio.loadTrack({
          trackId: storagePath,
          src: url,
          autoplay: shouldAutoplay,
          startTime: nextTimeSeconds,
        });
        if (!shouldAutoplay) {
          audio.pause();
        }
      } catch (err) {
        console.error("Failed to scrub preview", err);
        markPlaybackState(storagePath, {
          status: "error",
          error: err instanceof Error ? err.message : "Failed to update preview position",
        });
      }
    },
    [audio, ensurePlaybackUrl, markPlaybackState]
  );

  useEffect(() => {
    const storagePath = audio.trackId;
    if (!storagePath) return;
    if (audio.status === "error" && audio.error) {
      markPlaybackState(storagePath, {
        status: "error",
        error: audio.error,
      });
    } else if (audio.status === "playing" || audio.status === "paused" || audio.status === "ended") {
      markPlaybackState(storagePath, null);
    }
  }, [audio.trackId, audio.status, audio.error, markPlaybackState]);

  const handleSearchFilterChange = useCallback((event) => {
    const { value } = event.target;
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const handleStyleFilterChange = useCallback((event) => {
    const { value } = event.target;
    setFilters((prev) => ({ ...prev, style: value, dance: "all" }));
  }, []);

  const handleDanceFilterChange = useCallback((event) => {
    const { value } = event.target;
    setFilters((prev) => ({ ...prev, dance: value }));
  }, []);

  const handleBpmFilterChange = useCallback((field) => (event) => {
    const { value } = event.target;
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleDurationFilterChange = useCallback((field) => (event) => {
    const { value } = event.target;
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCheckboxFilterChange = useCallback((field) => (event) => {
    const { checked } = event.target;
    setFilters((prev) => ({ ...prev, [field]: checked }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const handleSort = useCallback((field) => {
    setSortState((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field, direction: "asc" };
    });
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email;
    return user.uid;
  }, [user]);

  const selectedFilterStyle = useMemo(
    () => STYLE_OPTIONS.find((option) => option.id === filters.style) ?? null,
    [filters.style]
  );

  const availableFilterDances = useMemo(() => {
    if (!selectedFilterStyle) return [];
    return selectedFilterStyle.dances;
  }, [selectedFilterStyle]);

  const visibleRows = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    const searchTerm = filters.search.trim().toLowerCase();
    const bpmMin = toNumberOrNull(filters.bpmMin);
    const bpmMax = toNumberOrNull(filters.bpmMax);
    const durationMin = toNumberOrNull(filters.durationMin);
    const durationMax = toNumberOrNull(filters.durationMax);

    let result = rows;

    if (searchTerm) {
      result = result.filter((row) => {
        const haystacks = [row.title, row.artist, row.filename, row.storagePath];
        return haystacks.some((value) => {
          if (!value) return false;
          return String(value).toLowerCase().includes(searchTerm);
        });
      });
    }

    if (filters.style !== "all") {
      result = result.filter((row) => row.styleId === filters.style);
    }

    if (filters.dance !== "all") {
      result = result.filter((row) => row.danceId === filters.dance);
    }

    if (filters.missingMetadataOnly) {
      result = result.filter((row) => !row.hasMetadata);
    }

    if (filters.missingClipOnly) {
      result = result.filter((row) => !hasClipTimes(row));
    }

    if (filters.missingBpmOnly) {
      result = result.filter((row) => toNumberOrNull(row.bpm) == null);
    }

    if (bpmMin != null || bpmMax != null) {
      result = result.filter((row) => {
        const bpm = toNumberOrNull(row.bpm);
        if (bpm == null) return false;
        if (bpmMin != null && bpm < bpmMin) return false;
        if (bpmMax != null && bpm > bpmMax) return false;
        return true;
      });
    }

    if (durationMin != null || durationMax != null) {
      result = result.filter((row) => {
        const durationSeconds = rowDurationSeconds(row);
        if (!Number.isFinite(durationSeconds)) return false;
        if (durationMin != null && durationSeconds < durationMin) return false;
        if (durationMax != null && durationSeconds > durationMax) return false;
        return true;
      });
    }

    const getter = SORT_KEY_GETTERS[sortState.field] ?? SORT_KEY_GETTERS.storagePath;

    return [...result].sort((a, b) => {
      const aValue = getter(a);
      const bValue = getter(b);
      return compareValues(aValue, bValue, sortState.direction);
    });
  }, [filters, rows, sortState.direction, sortState.field]);

  const updateRowField = useCallback(
    (key, patch) => {
      console.debug("[admin-library] updateRowField", key, patch);
      setRows((prev) => prev.map((row) => (keyFor(row) === key ? { ...row, ...patch } : row)));

      const existing = rowsRef.current.get(key);
      if (existing) {
        rowsRef.current.set(key, { ...existing, ...patch });
      } else {
        rowsRef.current.set(key, patch);
      }

      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [keyFor]
  );

  const handleChange = useCallback(
    (key, field) => (event) => {
      const value = event.target.value;
      const patch = { [field]: value };

      if (field === "storagePath") {
        const filenameFromPath = value.split("/").pop() || value;
        patch.filename = filenameFromPath;
        const current = rowsRef.current.get(key);
        if (current && (!current.title || current.title === current.filename)) {
          patch.title = filenameFromPath;
        }
        const inferred = inferStyleDanceFromPath(value);
        patch.styleId = inferred.styleId;
        patch.danceId = inferred.danceId;
      }

      updateRowField(key, patch);
    },
    [updateRowField]
  );

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }, []);

  const persistRow = useCallback(
    async (key) => {
      const row = rowsRef.current.get(key);
      if (!row) return;

      if (!row.storagePath || !row.storagePath.trim()) {
        setSaveErrors((prev) => ({ ...prev, [key]: "Storage path is required" }));
        return;
      }

      const storagePath = row.storagePath.trim();
      const title = row.title?.trim() || row.filename || storagePath;
      const artist = row.artist?.trim() || "";
      const bpmNumber = row.bpm !== "" ? Number(row.bpm) : null;

      if (row.bpm !== "" && Number.isNaN(bpmNumber)) {
        setSaveErrors((prev) => ({ ...prev, [key]: "BPM must be numeric" }));
        return;
      }

      const startMs = secondsToMillis(row.startSeconds);
      const endMs = secondsToMillis(row.endSeconds);

      const snapshot = snapshotsRef.current.get(key);
      const crashSnapshot = buildCrashSnapshotFromRow(row);
      const nextSnapshot = {
        title,
        artist,
        bpm: bpmNumber,
        startMs,
        endMs,
        ...crashSnapshot,
      };

      const crashFieldsChanged = PASO_CRASH_FIELD_CONFIG.some(({ msField }) => {
        const previous = snapshot ? snapshot[msField] ?? null : null;
        const next = nextSnapshot[msField] ?? null;
        return previous !== next;
      });

      const unchanged = snapshot
        && snapshot.title === nextSnapshot.title
        && snapshot.artist === nextSnapshot.artist
        && (snapshot.bpm ?? null) === (nextSnapshot.bpm ?? null)
        && (snapshot.startMs ?? null) === (nextSnapshot.startMs ?? null)
        && (snapshot.endMs ?? null) === (nextSnapshot.endMs ?? null)
        && !crashFieldsChanged;

      if (unchanged && row.hasMetadata) {
        return;
      }

      console.debug("[admin-library] persist start", {
        key,
        title,
        artist,
        bpmNumber,
        startMs,
        endMs,
        hasMetadata: row.hasMetadata,
      });

      setSaveState((prev) => ({ ...prev, [key]: "saving" }));

      try {
        const isPaso = isPasoRow(row);
        const payload = {
          storagePath,
          title,
          artist,
          bpm: bpmNumber,
          startMs,
          endMs,
        };

        if (isPaso) {
          PASO_CRASH_FIELD_CONFIG.forEach(({ msField }) => {
            payload[msField] = crashSnapshot[msField];
          });
        }

        if (row.id) {
          console.debug("[admin-library] upsert", { id: row.id, payload });
          await upsertSong(row.id, payload);
          console.debug("[admin-library] upsert done", { id: row.id });
        } else {
          console.debug("[admin-library] create", { payload });
          const created = await createSong(payload);
          console.debug("[admin-library] create done", created);
          payload.title = created.title ?? title;
          payload.artist = created.artist ?? artist;
          payload.bpm = created.bpm ?? bpmNumber;
          payload.startMs = created.startMs ?? startMs;
          payload.endMs = created.endMs ?? endMs;
          updateRowField(key, {
            id: created.id,
            hasMetadata: true,
          });
        }

        const crashFieldPatch = isPaso ? buildCrashPatchFromSnapshot(crashSnapshot) : {};

        updateRowField(key, {
          title,
          artist,
          bpm: row.bpm !== "" || bpmNumber != null ? String(bpmNumber ?? "") : "",
          startMs,
          endMs,
          ...crashFieldPatch,
          hasMetadata: true,
        });

        snapshotsRef.current.set(key, nextSnapshot);
        setSaveState((prev) => ({ ...prev, [key]: "saved" }));
        setTimeout(() => {
          setSaveState((prev) => {
            const next = { ...prev };
            if (next[key] === "saved") delete next[key];
            return next;
          });
        }, 1500);
        console.debug("[admin-library] persist success", { key });
      } catch (err) {
        console.error("Failed to save row", err);
        setSaveState((prev) => ({ ...prev, [key]: "error" }));
        setSaveErrors((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Failed to save metadata",
        }));
      }
    },
    [updateRowField]
  );

  const handleBlur = useCallback(
    (key) => () => {
      persistRow(key);
    },
    [persistRow]
  );

  const handleDelete = useCallback(
    async (row) => {
      if (!row.id) return;
      const key = keyFor(row);
      setIsDeleting(true);
      try {
        await removeSong(row.id);
        snapshotsRef.current.delete(key);
        setBannerMessage({ type: "success", text: "Metadata deleted" });
        await loadRows();
      } catch (err) {
        console.error("Failed to delete song", err);
        setBannerMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to delete song",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [keyFor, loadRows]
  );

  const dismissBanner = useCallback(() => setBannerMessage(null), []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#10141b",
        color: "#f2f4f7",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          justifyContent: "space-between",
          padding: "1.5rem 2rem",
          background: "#1b1f27",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 600 }}>Music Library</span>
            <span style={{ fontSize: "0.9rem", color: "rgba(242, 244, 247, 0.7)" }}>
              Signed in as {displayName}
            </span>
          </div>
          <nav
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}
            aria-label="Admin sections"
          >
            <Link
              to="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                color: "inherit",
                textDecoration: "none",
                fontWeight: 600,
                letterSpacing: "0.02em",
                background: "transparent",
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/admin/library"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                border: "1px solid rgba(37, 237, 39, 0.6)",
                color: "#d5ffd6",
                textDecoration: "none",
                fontWeight: 600,
                letterSpacing: "0.02em",
                background: "rgba(37, 237, 39, 0.18)",
              }}
            >
              Music
            </Link>
            <Link
              to="/admin/users"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                color: "inherit",
                textDecoration: "none",
                fontWeight: 600,
                letterSpacing: "0.02em",
                background: "transparent",
              }}
            >
              Users
            </Link>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => loadRows()}
            disabled={loading}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              background: loading ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.18)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "inherit",
              cursor: loading ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              background: "#25ed27",
              border: "none",
              color: "#0f1014",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Song
          </button>
          <Link
            to="/"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "inherit",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Back to Player
          </Link>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              background: "#e05555",
              border: "none",
              color: "#10141b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: "2rem",
          display: "grid",
          gap: "1.5rem",
        }}
      >
        {bannerMessage ? (
          <div
            style={{
              padding: "0.65rem 0.9rem",
              borderRadius: "0.65rem",
              border:
                bannerMessage.type === "success"
                  ? "1px solid rgba(37, 237, 117, 0.35)"
                  : "1px solid rgba(224, 85, 85, 0.35)",
              background:
                bannerMessage.type === "success"
                  ? "rgba(37, 237, 117, 0.12)"
                  : "rgba(224, 85, 85, 0.12)",
              color: bannerMessage.type === "success" ? "#9ef0c6" : "#f8b3b3",
              fontSize: "0.9rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span>{bannerMessage.text}</span>
            <button
              type="button"
              onClick={dismissBanner}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "underline",
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <section
          style={{
            padding: "1.5rem",
            borderRadius: "1rem",
            background: "linear-gradient(145deg, #131820, #0b0d13)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            boxShadow: "0 18px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.3rem", fontWeight: 600 }}>Song Catalog</h2>
          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                background: "rgba(224, 85, 85, 0.12)",
                border: "1px solid rgba(224, 85, 85, 0.35)",
                color: "#f8b3b3",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}
          {storageError && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.65rem 1rem",
                borderRadius: "0.75rem",
                background: "rgba(224, 176, 85, 0.12)",
                border: "1px solid rgba(224, 176, 85, 0.35)",
                color: "#f5d7aa",
                fontSize: "0.85rem",
              }}
            >
              {storageError}
            </div>
          )}

          {!loading && rows.length > 0 ? (
            <div
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Search</label>
                <input
                  type="search"
                  value={filters.search}
                  onChange={handleSearchFilterChange}
                  placeholder="Title, artist, filename, path"
                  style={{
                    minWidth: "220px",
                    borderRadius: "0.45rem",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    background: "rgba(10, 12, 16, 0.82)",
                    color: "inherit",
                    padding: "0.45rem 0.6rem",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Style</label>
                <select
                  value={filters.style}
                  onChange={handleStyleFilterChange}
                  style={{
                    minWidth: "160px",
                    borderRadius: "0.45rem",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    background: "rgba(10, 12, 16, 0.82)",
                    color: "inherit",
                    padding: "0.4rem 0.6rem",
                  }}
                >
                  <option value="all">All styles</option>
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Dance</label>
                <select
                  value={filters.dance}
                  onChange={handleDanceFilterChange}
                  disabled={filters.style === "all"}
                  style={{
                    minWidth: "160px",
                    borderRadius: "0.45rem",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    background: "rgba(10, 12, 16, 0.82)",
                    color: filters.style === "all" ? "rgba(242, 244, 247, 0.5)" : "inherit",
                    padding: "0.4rem 0.6rem",
                    cursor: filters.style === "all" ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="all">All dances</option>
                  {availableFilterDances.map((dance) => (
                    <option key={dance.id} value={dance.id}>
                      {dance.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>BPM range</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="number"
                    value={filters.bpmMin}
                    onChange={handleBpmFilterChange("bpmMin")}
                    placeholder="Min"
                    style={{
                      width: "90px",
                      borderRadius: "0.45rem",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(10, 12, 16, 0.82)",
                      color: "inherit",
                      padding: "0.35rem 0.5rem",
                    }}
                  />
                  <input
                    type="number"
                    value={filters.bpmMax}
                    onChange={handleBpmFilterChange("bpmMax")}
                    placeholder="Max"
                    style={{
                      width: "90px",
                      borderRadius: "0.45rem",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(10, 12, 16, 0.82)",
                      color: "inherit",
                      padding: "0.35rem 0.5rem",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Duration (s)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="number"
                    value={filters.durationMin}
                    onChange={handleDurationFilterChange("durationMin")}
                    placeholder="Min"
                    style={{
                      width: "90px",
                      borderRadius: "0.45rem",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(10, 12, 16, 0.82)",
                      color: "inherit",
                      padding: "0.35rem 0.5rem",
                    }}
                  />
                  <input
                    type="number"
                    value={filters.durationMax}
                    onChange={handleDurationFilterChange("durationMax")}
                    placeholder="Max"
                    style={{
                      width: "90px",
                      borderRadius: "0.45rem",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(10, 12, 16, 0.82)",
                      color: "inherit",
                      padding: "0.35rem 0.5rem",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "140px" }}>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Quick filters</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <input
                      type="checkbox"
                      checked={filters.missingMetadataOnly}
                      onChange={handleCheckboxFilterChange("missingMetadataOnly")}
                    />
                    <span>Missing metadata</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <input
                      type="checkbox"
                      checked={filters.missingClipOnly}
                      onChange={handleCheckboxFilterChange("missingClipOnly")}
                    />
                    <span>Missing clip times</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <input
                      type="checkbox"
                      checked={filters.missingBpmOnly}
                      onChange={handleCheckboxFilterChange("missingBpmOnly")}
                    />
                    <span>Missing BPM</span>
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Controls</span>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={resetFilters}
                    style={{
                      padding: "0.4rem 0.85rem",
                      borderRadius: "0.65rem",
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Reset
                  </button>
                  <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                    Showing {visibleRows.length} of {rows.length}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div style={{ padding: "1.5rem 0", color: "rgba(242, 244, 247, 0.7)" }}>
              Loading songs…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: "1.5rem 0", color: "rgba(242, 244, 247, 0.7)" }}>
              No songs found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "5px 0",
                  fontSize: "0.95rem",
                  color: "rgba(242, 244, 247, 0.85)",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", color: "rgba(242, 244, 247, 0.55)" }}>
                    <th
                      style={{ padding: "0.75rem", fontWeight: 500, width: "80px" }}
                      aria-sort={
                        sortState.field === "storagePath"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("storagePath")}
                      >
                        <span>Path</span>
                        {sortState.field === "storagePath" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th
                      style={{ padding: "0.75rem 0.75rem 0.75rem 5px", fontWeight: 500 }}
                      aria-sort={
                        sortState.field === "title"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("title")}
                      >
                        <span>Title</span>
                        {sortState.field === "title" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th
                      style={{ padding: "0.75rem", fontWeight: 500 }}
                      aria-sort={
                        sortState.field === "artist"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("artist")}
                      >
                        <span>Artist</span>
                        {sortState.field === "artist" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th
                      style={{ padding: "0.75rem", fontWeight: 500, width: "110px" }}
                      aria-sort={
                        sortState.field === "bpm"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("bpm")}
                      >
                        <span>BPM</span>
                        {sortState.field === "bpm" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th
                      style={{ padding: "0.75rem", fontWeight: 500, width: "140px" }}
                      aria-sort={
                        sortState.field === "startSeconds"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("startSeconds")}
                      >
                        <span>Clip Start (s)</span>
                        {sortState.field === "startSeconds" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th
                      style={{ padding: "0.75rem", fontWeight: 500, width: "140px" }}
                      aria-sort={
                        sortState.field === "endSeconds"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("endSeconds")}
                      >
                        <span>Clip End (s)</span>
                        {sortState.field === "endSeconds" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th
                      style={{ padding: "0.75rem", fontWeight: 500, width: "220px" }}
                      aria-sort={
                        sortState.field === "duration"
                          ? sortState.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        style={SORT_BUTTON_STYLE}
                        onClick={() => handleSort("duration")}
                      >
                        <span>Preview</span>
                        {sortState.field === "duration" ? (
                          <span style={SORT_ARROW_STYLE}>{sortState.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                      </button>
                    </th>
                    <th style={{ padding: "0.75rem", fontWeight: 500, textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const key = keyFor(row);
                    const rowError = saveErrors[key];
                    const storagePath = row.storagePath?.trim() ?? "";
                    const isActiveTrack = storagePath && audio.trackId === storagePath;
                    const playbackMeta = storagePath ? playbackState[storagePath] ?? null : null;
                    const fallbackDurationSeconds =
                      typeof row.durationMs === "number"
                        ? row.durationMs / 1000
                        : row.storageInfo && typeof row.storageInfo.durationMs === "number"
                          ? row.storageInfo.durationMs / 1000
                          : null;
                    const isPasoTrack = isPasoRow(row);
                    const crashFields = isPasoTrack ? PASO_CRASH_UI_FIELDS : [];
                    return (
                      <TrackRow
                        key={key}
                        row={row}
                        rowKey={key}
                        onFieldChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        onSave={persistRow}
                        onDelete={handleDelete}
                        disabledSave={!row.storagePath || saveState[key] === "saving"}
                        disabledDelete={!row.id || isDeleting}
                        errorMessage={rowError}
                        hovered={hoveredInfoKey === key}
                        onHoverChange={(nextKey) => setHoveredInfoKey(nextKey)}
                        showPasoFields={isPasoTrack}
                        crashFields={crashFields}
                        playback={{
                          isActive: isActiveTrack,
                          isPlaying: isActiveTrack && audio.isPlaying,
                          isLoading:
                            playbackMeta?.status === "loading" ||
                            (isActiveTrack && audio.isLoading),
                          status: audio.status,
                          onTogglePlay: handleTogglePreview,
                          onSeek: handleSeek,
                          currentTime: isActiveTrack ? audio.currentTime : 0,
                          duration: isActiveTrack ? audio.duration : null,
                          buffered: isActiveTrack ? audio.buffered : 0,
                          error:
                            (isActiveTrack && audio.status === "error" ? audio.error : null) ||
                            playbackMeta?.error ||
                            null,
                          fallbackDuration: fallbackDurationSeconds,
                        }}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <UploadSongDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={handleUploadSubmit}
        styleOptions={STYLE_OPTIONS}
      />
    </div>
  );
}

export default function AdminLibrary() {
  return (
    <AudioPlayerProvider>
      <AdminLibraryContent />
    </AudioPlayerProvider>
  );
}
