import { useEffect, useState } from "react";

const PROVIDER_LABELS = {
  google: "Continue with Google",
  facebook: "Continue with Facebook (coming soon)",
  apple: "Continue with Apple (coming soon)",
};
const DISABLED_PROVIDERS = new Set(["facebook", "apple"]);
const FORM_MODES = {
  signin: "signin",
  signup: "signup",
};
const INITIAL_FORM_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthModal({
  isOpen,
  onClose,
  onSelectProvider,
  onEmailLogin,
  onEmailSignup,
  isProcessing,
  error,
  onRetry,
}) {
  const [mode, setMode] = useState(FORM_MODES.signin);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setMode(FORM_MODES.signin);
      setFormState(INITIAL_FORM_STATE);
      setLocalError("");
    }
  }, [isOpen]);

  const showError = Boolean(error);
  const isSignup = mode === FORM_MODES.signup;

  const formTitle = isSignup ? "Create your account" : "Sign in to keep the music going";
  const formSubtitle = isSignup
    ? "Use your email address as your username."
    : "Use your email address and password to continue.";

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isProcessing) return;
    setLocalError("");

    const trimmedEmail = formState.email.trim();
    const trimmedFirstName = formState.firstName.trim();
    const trimmedLastName = formState.lastName.trim();

    if (!trimmedEmail || !formState.password) {
      setLocalError("Please enter your email address and password.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (isSignup && (!trimmedFirstName || !trimmedLastName)) {
      setLocalError("Please enter your first and last name.");
      return;
    }

    try {
      if (isSignup) {
        await onEmailSignup({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          password: formState.password,
        });
      } else {
        await onEmailLogin({
          email: trimmedEmail,
          password: formState.password,
        });
      }
    } catch {
      // Error surfaced through auth context.
    }
  };

  if (!isOpen) {
    return null;
  }

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
            <div className="auth-mode-toggle">
              <button
                type="button"
                className={`auth-mode-button${!isSignup ? " is-active" : ""}`}
                onClick={() => setMode(FORM_MODES.signin)}
                disabled={isProcessing}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`auth-mode-button${isSignup ? " is-active" : ""}`}
                onClick={() => setMode(FORM_MODES.signup)}
                disabled={isProcessing}
              >
                Create account
              </button>
            </div>
            <h2>{formTitle}</h2>
            <p className="auth-modal-subtitle">{formSubtitle}</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              {isSignup ? (
                <div className="auth-form-row">
                  <label className="auth-field">
                    <span className="auth-field-label">First name</span>
                    <input
                      type="text"
                      name="firstName"
                      value={formState.firstName}
                      onChange={handleFieldChange}
                      placeholder="Ada"
                      autoComplete="given-name"
                      disabled={isProcessing}
                      required
                    />
                  </label>
                  <label className="auth-field">
                    <span className="auth-field-label">Last name</span>
                    <input
                      type="text"
                      name="lastName"
                      value={formState.lastName}
                      onChange={handleFieldChange}
                      placeholder="Lovelace"
                      autoComplete="family-name"
                      disabled={isProcessing}
                      required
                    />
                  </label>
                </div>
              ) : null}
              <label className="auth-field">
                <span className="auth-field-label">Email (username)</span>
                <input
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleFieldChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isProcessing}
                  required
                />
              </label>
              <label className="auth-field">
                <span className="auth-field-label">Password</span>
                <input
                  type="password"
                  name="password"
                  value={formState.password}
                  onChange={handleFieldChange}
                  placeholder="••••••••"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  disabled={isProcessing}
                  required
                />
              </label>
              {localError ? <p className="auth-local-error">{localError}</p> : null}
              <button type="submit" className="neomorphus-button auth-submit" disabled={isProcessing}>
                {isProcessing ? "Working..." : isSignup ? "Create account" : "Sign in"}
              </button>
            </form>
            <div className="auth-divider">
              <span>or continue with</span>
            </div>
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
