import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { createSong, listSongs, removeSong, upsertSong } from "../services/songService.js";
import { fetchStorageFiles, uploadSongFile } from "../services/storageService.js";
import UploadSongDialog from "../components/UploadSongDialog.jsx";

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
];

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

function combineSongData(firestoreSongs, storageFiles) {
  const map = new Map();

  firestoreSongs.forEach((song) => {
    if (!song.storagePath) return;
    const filename = song.filename ?? song.storagePath.split("/").pop() ?? song.storagePath;
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
    });
  });

  storageFiles.forEach((file) => {
    const key = file.path;
    const filename = file.filename ?? key.split("/").pop() ?? key;
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        filename: existing.filename || filename,
        title: existing.title && existing.title.trim() ? existing.title : filename,
        storageInfo: file,
      });
    } else {
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
    });
  }
  });

  return Array.from(map.values()).sort((a, b) => (a.storagePath || "").localeCompare(b.storagePath || ""));
}

function AdminLibrary() {
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

  const keyFor = useCallback((song) => song.rowKey ?? song.storagePath, []);

  const refreshRefs = useCallback((data) => {
    const rowsMap = new Map();
    const snapshot = new Map();
    data.forEach((song) => {
      const key = keyFor(song);
      rowsMap.set(key, song);
      snapshot.set(key, {
        title: song.title,
        artist: song.artist,
        bpm: song.bpm !== "" ? Number(song.bpm) : null,
        startMs: song.startMs ?? null,
        endMs: song.endMs ?? null,
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

      const combined = combineSongData(firestoreSongs, storageFiles);
      console.debug("[admin-library] loadRows combined", {
        firestoreSongs: firestoreSongs.length,
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

  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email;
    return user.uid;
  }, [user]);

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
      const nextSnapshot = {
        title,
        artist,
        bpm: bpmNumber,
        startMs,
        endMs,
      };

      const unchanged = snapshot
        && snapshot.title === nextSnapshot.title
        && snapshot.artist === nextSnapshot.artist
        && (snapshot.bpm ?? null) === (nextSnapshot.bpm ?? null)
        && (snapshot.startMs ?? null) === (nextSnapshot.startMs ?? null)
        && (snapshot.endMs ?? null) === (nextSnapshot.endMs ?? null);

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
        const payload = {
          storagePath,
          title,
          artist,
          bpm: bpmNumber,
          startMs,
          endMs,
        };

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

        updateRowField(key, {
          title,
          artist,
          bpm: row.bpm !== "" || bpmNumber != null ? String(bpmNumber ?? "") : "",
          startMs,
          endMs,
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 600 }}>Admin Library</span>
          <span style={{ fontSize: "0.9rem", color: "rgba(242, 244, 247, 0.7)" }}>
            Signed in as {displayName}
          </span>
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
              background: "#25ed75",
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
                    <th style={{ padding: "0.75rem", fontWeight: 500, width: "80px" }}>Path</th>
                    <th style={{ padding: "0.75rem 0.75rem 0.75rem 5px", fontWeight: 500 }}>Title</th>
                    <th style={{ padding: "0.75rem", fontWeight: 500 }}>Artist</th>
                    <th style={{ padding: "0.75rem", fontWeight: 500, width: "110px" }}>BPM</th>
                    <th style={{ padding: "0.75rem", fontWeight: 500, width: "140px" }}>Clip Start (s)</th>
                    <th style={{ padding: "0.75rem", fontWeight: 500, width: "140px" }}>Clip End (s)</th>
                    <th style={{ padding: "0.75rem", fontWeight: 500, textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = keyFor(row);
                    const rowError = saveErrors[key];
                    return (
                      <tr key={key} style={{ borderTop: "1px solid rgba(255, 255, 255, 0.07)" }}>
                        <td style={{ padding: "0.5rem", minWidth: "80px" }}>
                          <div
                            style={{ display: "flex", alignItems: "center", position: "relative" }}
                            onMouseEnter={() => (row.storagePath ? setHoveredInfoKey(key) : null)}
                            onMouseLeave={() => setHoveredInfoKey((current) => (current === key ? null : current))}
                          >
                            <span
                              aria-label={
                                row.storagePath ? `Storage path ${row.storagePath}` : "Storage path not available"
                              }
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
                              onFocus={() => (row.storagePath ? setHoveredInfoKey(key) : null)}
                              onBlur={() => setHoveredInfoKey((current) => (current === key ? null : current))}
                            >
                              i
                            </span>
                            {hoveredInfoKey === key && row.storagePath ? (
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
                            onChange={handleChange(key, "title")}
                            onBlur={handleBlur(key)}
                            onKeyDown={handleKeyDown}
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
                            onChange={handleChange(key, "artist")}
                            onBlur={handleBlur(key)}
                            onKeyDown={handleKeyDown}
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
                            onChange={handleChange(key, "bpm")}
                            onBlur={handleBlur(key)}
                            onKeyDown={handleKeyDown}
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
                            onChange={handleChange(key, "startSeconds")}
                            onBlur={handleBlur(key)}
                            onKeyDown={handleKeyDown}
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
                            onChange={handleChange(key, "endSeconds")}
                            onBlur={handleBlur(key)}
                            onKeyDown={handleKeyDown}
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
                        <td style={{ padding: "0.5rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                            <button
                              type="button"
                              onClick={() => persistRow(key)}
                              disabled={!row.storagePath || saveState[key] === "saving"}
                              style={{
                                padding: "0.35rem 0.75rem",
                                borderRadius: "0.65rem",
                                background: "rgba(255, 255, 255, 0.18)",
                                border: "1px solid rgba(255, 255, 255, 0.25)",
                                color: "inherit",
                                cursor:
                                  !row.storagePath || saveState[key] === "saving"
                                    ? "default"
                                    : "pointer",
                                fontSize: "0.8rem",
                                opacity: !row.storagePath || saveState[key] === "saving" ? 0.6 : 1,
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              disabled={!row.id || isDeleting}
                              style={{
                                padding: "0.35rem 0.75rem",
                                borderRadius: "0.65rem",
                                background: "rgba(224, 85, 85, 0.18)",
                                border: "1px solid rgba(224, 85, 85, 0.35)",
                                color: "inherit",
                                cursor: !row.id || isDeleting ? "default" : "pointer",
                                fontSize: "0.8rem",
                                opacity: !row.id || isDeleting ? 0.6 : 1,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                          {rowError ? (
                            <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#f8b3b3" }}>
                              {rowError}
                            </div>
                          ) : null}
                        </td>
                      </tr>
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

export default AdminLibrary;
