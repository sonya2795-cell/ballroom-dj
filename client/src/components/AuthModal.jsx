const PROVIDER_LABELS = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
  apple: "Continue with Apple",
};
const DISABLED_PROVIDERS = new Set(["facebook", "apple"]);

export default function AuthModal({
  isOpen,
  onClose,
  onSelectProvider,
  isProcessing,
  error,
  onRetry,
}) {
  if (!isOpen) {
    return null;
  }

  const showError = Boolean(error);

  return (
    <div className="auth-modal-backdrop">
      <div className="auth-modal">
        {showError ? (
          <div className="auth-modal-error">
            <h2>We couldn&apos;t sign you in</h2>
            <p>{error}</p>
            <div className="auth-modal-actions">
              <button
                type="button"
                className="neomorphus-button"
                onClick={onRetry}
              >
                Try Again
              </button>
              <button
                type="button"
                className="neomorphus-button secondary"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2>Sign in to keep the music going</h2>
            <p className="auth-modal-subtitle">
              Choose a login provider to continue with your round.
            </p>
            <div className="auth-provider-buttons">
              {Object.entries(PROVIDER_LABELS).map(([provider, label]) => (
                <button
                  key={provider}
                  type="button"
                  className="neomorphus-button provider"
                  onClick={() => onSelectProvider(provider)}
                  disabled={isProcessing || DISABLED_PROVIDERS.has(provider)}
                  title={DISABLED_PROVIDERS.has(provider) ? "Temporarily disabled" : undefined}
                >
                  {isProcessing ? "Connecting..." : label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
