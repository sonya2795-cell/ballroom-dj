function PasoCrashSelector({
  hasCrashMetadata,
  options,
  selectedCrash = null,
  onChange,
  formatTime,
}) {
  if (!hasCrashMetadata) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          fontSize: "0.9rem",
          lineHeight: 1.4,
        }}
      >
        No crash markers are available for this Paso. Use the duration slider to
        set your cutoff.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "100%",
        maxWidth: "420px",
      }}
    >
      <span style={{ fontWeight: 600 }}>Crash Cutoff</span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          alignItems: "flex-start",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="paso-crash-selection"
            value=""
            checked={!selectedCrash}
            onChange={() => onChange(null)}
          />
          <span>Use duration slider</span>
        </label>
        {options.map((option) => (
          <label
            key={option.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="paso-crash-selection"
              value={option.id}
              checked={selectedCrash === option.id}
              onChange={() => onChange(option.id)}
            />
            <span>
              {option.label} — {formatTime(option.seconds)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default PasoCrashSelector;
