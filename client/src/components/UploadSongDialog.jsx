import { useEffect, useMemo, useRef, useState } from "react";

function ensureMp3(file) {
  if (!file) return false;
  const nameOk = typeof file.name === "string" && file.name.toLowerCase().endsWith(".mp3");
  const typeOk = typeof file.type === "string" && file.type.toLowerCase() === "audio/mpeg";
  return nameOk || typeOk;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function UploadSongDialog({
  isOpen,
  onClose,
  onSubmit,
  styleOptions,
}) {
  const fileInputRef = useRef(null);
  const [styleId, setStyleId] = useState(styleOptions[0]?.id ?? "");
  const [danceId, setDanceId] = useState(styleOptions[0]?.dances[0]?.id ?? "");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [bpm, setBpm] = useState("");
  const [customFileName, setCustomFileName] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const activeStyle = useMemo(
    () => styleOptions.find((style) => style.id === styleId) ?? styleOptions[0] ?? null,
    [styleId, styleOptions]
  );

  const danceOptions = useMemo(() => activeStyle?.dances ?? [], [activeStyle]);

  useEffect(() => {
    if (activeStyle && !danceOptions.some((dance) => dance.id === danceId)) {
      setDanceId(activeStyle.dances[0]?.id ?? "");
    }
  }, [activeStyle, danceId, danceOptions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError(null);
    setIsSubmitting(false);
    if (!file) {
      setTitle("");
      setArtist("");
      setBpm("");
      setCustomFileName("");
    }
  }, [isOpen, file]);

  const resetState = () => {
    setFile(null);
    setTitle("");
    setArtist("");
    setBpm("");
    setCustomFileName("");
    setError(null);
    setIsSubmitting(false);
  };

  const closeAndReset = () => {
    resetState();
    onClose?.();
  };

  const handleFileSelection = (nextFile) => {
    if (!nextFile) return;
    if (!ensureMp3(nextFile)) {
      setError("Only MP3 files are supported");
      return;
    }

    setFile(nextFile);
    setTitle((prev) => prev || nextFile.name.replace(/\.mp3$/i, ""));
    setCustomFileName(nextFile.name);
    setError(null);
  };

  const handleInputChange = (event) => {
    const [nextFile] = event.target.files ?? [];
    handleFileSelection(nextFile ?? null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const [nextFile] = event.dataTransfer?.files ?? [];
    handleFileSelection(nextFile ?? null);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!file) {
      setError("Drag an MP3 file to upload");
      return;
    }

    if (!styleId || !danceId) {
      setError("Choose a folder before uploading");
      return;
    }

    const bpmValue = bpm.trim();
    if (bpmValue && Number.isNaN(Number(bpmValue))) {
      setError("BPM must be numeric");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const payload = {
        styleId,
        danceId,
        file,
        fileBase64: dataUrl,
        title: title.trim() || file.name.replace(/\.mp3$/i, ""),
        artist: artist.trim(),
        bpm: bpmValue,
        fileName: customFileName.trim() || file.name,
      };

      await onSubmit?.(payload);
      closeAndReset();
    } catch (err) {
      console.error("Upload failed", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 2000,
        padding: "1.5rem",
      }}
      onClick={closeAndReset}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(640px, 100%)",
          background: "#12161e",
          borderRadius: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 1.5rem 3rem rgba(0, 0, 0, 0.4)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          color: "#f2f4f7",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 600 }}>Upload Song</h2>
          <button
            type="button"
            onClick={closeAndReset}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
            aria-label="Close upload dialog"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>Folder</span>
              <select
                value={styleId}
                onChange={(event) => setStyleId(event.target.value)}
                style={{
                  background: "rgba(12, 15, 22, 0.9)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "inherit",
                  padding: "0.5rem 0.75rem",
                }}
              >
                {styleOptions.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>Subfolder</span>
              <select
                value={danceId}
                onChange={(event) => setDanceId(event.target.value)}
                style={{
                  background: "rgba(12, 15, 22, 0.9)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "inherit",
                  padding: "0.5rem 0.75rem",
                }}
              >
                {danceOptions.map((dance) => (
                  <option key={dance.id} value={dance.id}>
                    {dance.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? "#25ed27" : "rgba(255, 255, 255, 0.25)"}`,
              background: isDragging ? "rgba(37, 237, 117, 0.08)" : "rgba(10, 14, 18, 0.85)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,.mp3"
              style={{ display: "none" }}
              onChange={handleInputChange}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "center" }}>
              <span style={{ fontSize: "1rem", fontWeight: 500 }}>
                {file ? "File selected" : "Drag & drop an MP3 file"}
              </span>
              <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                {file ? file.name : "or click to browse"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>File name</span>
              <input
                type="text"
                value={customFileName}
                onChange={(event) => setCustomFileName(event.target.value)}
                placeholder={file?.name ?? "song.mp3"}
                style={{
                  background: "rgba(12, 15, 22, 0.9)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "inherit",
                  padding: "0.5rem 0.75rem",
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Song title"
                style={{
                  background: "rgba(12, 15, 22, 0.9)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "inherit",
                  padding: "0.5rem 0.75rem",
                }}
              />
            </label>
            <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>Artist</span>
              <input
                type="text"
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                placeholder="Artist"
                style={{
                  background: "rgba(12, 15, 22, 0.9)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "inherit",
                  padding: "0.5rem 0.75rem",
                }}
              />
            </label>
            <label style={{ width: "120px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>BPM</span>
              <input
                type="number"
                value={bpm}
                min="0"
                step="1"
                onChange={(event) => setBpm(event.target.value)}
                placeholder="120"
                style={{
                  background: "rgba(12, 15, 22, 0.9)",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "inherit",
                  padding: "0.5rem 0.75rem",
                }}
              />
            </label>
          </div>

          {error ? (
            <div style={{ color: "#f8b3b3", fontSize: "0.85rem" }}>{error}</div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={closeAndReset}
              disabled={isSubmitting}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "999px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.55rem 1.35rem",
                borderRadius: "999px",
                border: "none",
                background: isSubmitting ? "rgba(37, 237, 117, 0.4)" : "#25ed27",
                color: "#0f1014",
                fontWeight: 600,
                cursor: isSubmitting ? "default" : "pointer",
              }}
            >
              {isSubmitting ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadSongDialog;
