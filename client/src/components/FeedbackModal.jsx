import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { submitFeedback } from "../services/feedback.js";

const MAX_DESCRIPTION_CHARACTERS = 1500;
const MAX_FILES = 3;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function FeedbackModal({ isOpen, onClose, user }) {
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const descriptionRef = useRef(null);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  const normalizedDescription = description.trim();
  const canSubmit = normalizedDescription.length > 0 && normalizedDescription.length <= MAX_DESCRIPTION_CHARACTERS;
  const descriptionCounter = `${description.length}/${MAX_DESCRIPTION_CHARACTERS}`;

  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement;
    const timer = setTimeout(() => {
      descriptionRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          "button, input, textarea, select, a[href], [tabindex]:not([tabindex='-1'])",
        );
        const focusables = Array.from(focusableElements).filter(
          (element) => !element.disabled && element.offsetParent !== null,
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActive && typeof previousActive.focus === "function") {
        previousActive.focus();
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [isOpen, user, contactEmail]);

  useEffect(() => {
    if (!isOpen) {
      setDescription("");
      setFiles([]);
      setError(null);
      setSuccessMessage("");
      setIsSubmitting(false);
      setIsDragActive(false);
    }
  }, [isOpen]);

  const handleFilesAdded = useCallback(
    (fileList) => {
      if (!fileList) return;
      setError(null);
      const incoming = Array.from(fileList);
      const nextFiles = [];
      const existingCount = files.length;

      for (const file of incoming) {
        if (existingCount + nextFiles.length >= MAX_FILES) {
          setError(`You can upload up to ${MAX_FILES} screenshots.`);
          break;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          setError(`"${file.name}" is too large. Each file must be under ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
          continue;
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
          setError(`"${file.name}" has an unsupported format.`);
          continue;
        }

        nextFiles.push({
          id: createId(),
          file,
        });
      }

      if (nextFiles.length > 0) {
        setFiles((prev) => [...prev, ...nextFiles]);
      }
    },
    [files.length],
  );

  const handleFileInputChange = useCallback(
    (event) => {
      handleFilesAdded(event.target.files);
      event.target.value = "";
    },
    [handleFilesAdded],
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragActive(false);
      handleFilesAdded(event.dataTransfer?.files);
    },
    [handleFilesAdded],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }, [isDragActive]);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragActive(false);
  }, []);

  const removeFile = useCallback((id) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!canSubmit || isSubmitting) return;
      setError(null);
      setIsSubmitting(true);
      setSuccessMessage("");

      try {
        const pageUrl = typeof window !== "undefined" ? window.location.href : "";
        const userAgent =
          typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "";
        const platform =
          typeof navigator !== "undefined" && navigator.platform ? navigator.platform : "";
        let timezone = "";
        if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
          try {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
          } catch {
            timezone = "";
          }
        }

        const metadata = {
          pageUrl,
          userAgent,
          platform,
          timezone,
        };

        await submitFeedback({
          description: normalizedDescription,
          contactEmail: contactEmail?.trim(),
          files: files.map((item) => item.file),
          metadata,
        });

        setSuccessMessage("Thanks for the report! We emailed the team and will take a look.");
        setDescription("");
        setFiles([]);
      } catch (err) {
        setError(err?.message || "We couldn’t send that feedback. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, contactEmail, files, isSubmitting, normalizedDescription],
  );

  const feedbackSummary = useMemo(() => {
    const identity = user?.email || contactEmail?.trim() || "Anonymous reporter";
    return `Sending as ${identity}`;
  }, [contactEmail, user]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="feedback-modal-backdrop" role="presentation">
      <div
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        aria-describedby="feedback-modal-description"
        ref={modalRef}
      >
        <header className="feedback-modal-header">
          <div>
            <p className="feedback-modal-callout">Bugs happen — help us squash them.</p>
            <h2 id="feedback-modal-title">Send feedback</h2>
          </div>
          <button
            type="button"
            className="feedback-modal-close"
            onClick={onClose}
            aria-label="Close feedback form"
          >
            ×
          </button>
        </header>
        <p id="feedback-modal-description" className="feedback-modal-subtitle">
          Tell us what broke and (optionally) add screenshots so we can reproduce it.
        </p>

        <form className="feedback-form" onSubmit={handleSubmit}>
          <label className="feedback-field">
            <span className="feedback-field-label">
              What went wrong?
            </span>
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(event) => {
                if (event.target.value.length <= MAX_DESCRIPTION_CHARACTERS) {
                  setDescription(event.target.value);
                } else {
                  setDescription(event.target.value.slice(0, MAX_DESCRIPTION_CHARACTERS));
                }
              }}
              rows={6}
              placeholder="Describe the steps, what you expected, and what actually happened..."
              required
            />
            <span className="feedback-field-support">{descriptionCounter}</span>
          </label>

          <label className="feedback-field">
            <span className="feedback-field-label">
              Contact email <span className="feedback-field-optional">(optional)</span>
            </span>
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="we'll use this only if we need more detail"
            />
          </label>

          <div
            className={`feedback-dropzone${isDragActive ? " is-dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div>
              <p className="feedback-dropzone-title">Add screenshots</p>
              <p className="feedback-dropzone-subtitle">Drag & drop or click to upload (max {MAX_FILES}).</p>
              <p className="feedback-dropzone-hint">PNG, JPG, WEBP up to {formatBytes(MAX_FILE_SIZE_BYTES)} each.</p>
            </div>
            <button
              type="button"
              className="neomorphus-button small"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/heic,image/heif"
              multiple
              onChange={handleFileInputChange}
              hidden
            />
          </div>

          {files.length > 0 ? (
            <ul className="feedback-file-list">
              {files.map(({ id, file }) => (
                <li key={id} className="feedback-file-item">
                  <div>
                    <p className="feedback-file-name">{file.name}</p>
                    <span className="feedback-file-size">{formatBytes(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(id)}
                    className="feedback-file-remove"
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="feedback-context">{feedbackSummary}</p>

          {error ? <p className="feedback-alert error">{error}</p> : null}
          {successMessage ? <p className="feedback-alert success">{successMessage}</p> : null}

          <div className="feedback-modal-actions">
            <button
              type="button"
              className="neomorphus-button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="neomorphus-button"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
