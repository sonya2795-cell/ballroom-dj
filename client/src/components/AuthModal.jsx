import { useEffect, useState } from "react";

const PROVIDER_LABELS = {
  google: "Continue with Google",
};
const FORM_MODES = {
  signin: "signin",
  signup: "signup",
};
const INITIAL_FORM_STATE = {
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
  initialMode = FORM_MODES.signin,
  variant = "modal",
  showModeToggle = true,
  pageTitle,
  pageSubtitle,
  submitLabel,
  dividerText,
  footerContent,
  emailLabel,
  promptTitle,
  promptPrimaryLabel,
  promptSecondaryLabel,
  onPromptPrimary,
  onPromptSecondary,
}) {
  const [mode, setMode] = useState(FORM_MODES.signin);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [localError, setLocalError] = useState("");
  const [signupStep, setSignupStep] = useState("email");

  useEffect(() => {
    if (!isOpen) {
      setMode(FORM_MODES.signin);
      setFormState(INITIAL_FORM_STATE);
      setLocalError("");
      setSignupStep("email");
      return;
    }
    setMode(initialMode);
    setSignupStep("email");
  }, [isOpen, initialMode]);

  const displayError = localError || error;
  const isSignup = mode === FORM_MODES.signup;
  const formTitle =
    pageTitle || (isSignup ? "Create your account" : "Log in to keep the music going");
  const formSubtitle =
    pageSubtitle === null
      ? null
      : pageSubtitle ||
        (isSignup
          ? "Use your email address as your username."
          : "Use your email address and password to continue.");
  const primaryButtonLabel = submitLabel || (isSignup ? "Create account" : "Log in");
  const resolvedPrimaryLabel = primaryButtonLabel;
  const dividerLabel = dividerText || "or continue with";
  const resolvedEmailLabel = emailLabel || "Email (username)";

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isProcessing) return;
    setLocalError("");

    const trimmedEmail = formState.email.trim();

    if (!trimmedEmail) {
      if (onRetry) onRetry();
      setLocalError("Please enter your email address.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      if (onRetry) onRetry();
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (!isSignup && !formState.password) {
      if (onRetry) onRetry();
      setLocalError("Please enter your password.");
      return;
    }

    try {
      if (isSignup) {
        await onEmailSignup({ email: trimmedEmail });
        sessionStorage.setItem("verificationEmail", trimmedEmail);
        setSignupStep("sent");
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

  if (!isOpen && (variant === "modal" || variant === "prompt")) {
    return null;
  }

  if (variant === "prompt") {
    return (
      <div className="auth-modal-backdrop">
        <div className="auth-modal auth-prompt">
          <h2>{promptTitle || "Start jiving now"}</h2>
          <div className="auth-prompt-actions">
            <button
              type="button"
              className="neomorphus-button"
              onClick={onPromptPrimary || onClose}
            >
              {promptPrimaryLabel || "Sign up"}
            </button>
            <button
              type="button"
              className="neomorphus-button secondary"
              onClick={onPromptSecondary || onClose}
            >
              {promptSecondaryLabel || "Log in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div className="auth-modal">
      <div>
            {variant === "page" ? (
              <div className="auth-page-logo" aria-hidden="true">
                <span className="auth-page-logo-mark">M</span>
              </div>
            ) : null}
            {showModeToggle ? (
              <div className="auth-mode-toggle">
                <button
                  type="button"
                  className={`auth-mode-button${!isSignup ? " is-active" : ""}`}
                  onClick={() => {
                    setMode(FORM_MODES.signin);
                    setSignupStep("email");
                    setLocalError("");
                  }}
                  disabled={isProcessing}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={`auth-mode-button${isSignup ? " is-active" : ""}`}
                  onClick={() => {
                    setMode(FORM_MODES.signup);
                    setSignupStep("email");
                    setLocalError("");
                  }}
                  disabled={isProcessing}
                >
                  Create account
                </button>
              </div>
            ) : null}
            <h2>{formTitle}</h2>
            {formSubtitle ? <p className="auth-modal-subtitle">{formSubtitle}</p> : null}
            {isSignup && signupStep === "sent" ? (
              <div className="auth-form">
                <p className="auth-step-text">
                  We sent a verification link and code to your inbox. Click the link or paste the
                  code on the verification page to continue.
                </p>
                <div className="auth-step-divider" aria-hidden="true" />
                <p className="auth-step-help">Having touble?</p>
                {displayError ? <p className="auth-local-error">{displayError}</p> : null}
                <div className="auth-modal-actions">
                  <a className="neomorphus-button" href="/verify">
                    Enter verification code
                  </a>
                  <button
                    type="button"
                    className="neomorphus-button secondary"
                    onClick={async () => {
                      setLocalError("");
                      try {
                        await onEmailSignup({ email: formState.email.trim() });
                        sessionStorage.setItem("verificationEmail", formState.email.trim());
                      } catch {
                        // Errors surfaced via auth context.
                      }
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Sending..." : "Resend email"}
                  </button>
                </div>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span className="auth-field-label">{resolvedEmailLabel}</span>
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
                {!isSignup ? (
                  <label className="auth-field">
                    <span className="auth-field-label">Password</span>
                    <input
                      type="password"
                      name="password"
                      value={formState.password}
                      onChange={handleFieldChange}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isProcessing}
                      required
                    />
                  </label>
                ) : null}
                {displayError ? <p className="auth-local-error">{displayError}</p> : null}
                <button
                  type="submit"
                  className="neomorphus-button auth-submit"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Working..." : resolvedPrimaryLabel}
                </button>
              </form>
            )}
            <div className="auth-divider-line" />
            <div className="auth-divider">
              <span>{dividerLabel}</span>
            </div>
            <div className="auth-provider-buttons">
              {Object.entries(PROVIDER_LABELS).map(([provider, label]) => (
                <button
                  key={provider}
                  type="button"
                  className="neomorphus-button provider"
                  onClick={() => onSelectProvider(provider)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    "Connecting..."
                  ) : (
                    <>
                      {provider === "google" ? (
                        <span className="google-icon" aria-hidden="true">
                          <svg viewBox="0 0 533.5 544.3">
                            <path
                              fill="#4285F4"
                              d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.2H272v95h146.9c-6.3 34-25 62.9-53.4 82.2v68h86.4c50.5-46.5 81.6-115 81.6-195z"
                            />
                            <path
                              fill="#34A853"
                              d="M272 544.3c72.6 0 133.5-24.1 178-65.6l-86.4-68c-24 16.1-54.7 25.6-91.6 25.6-70 0-129.3-47.1-150.5-110.2H31.5v69.4C76 475.2 167.5 544.3 272 544.3z"
                            />
                            <path
                              fill="#FBBC04"
                              d="M121.5 326.1c-10.2-30-10.2-62.1 0-92.1v-69.4H31.5c-39 77.9-39 169 0 246.9l90-69.4z"
                            />
                            <path
                              fill="#EA4335"
                              d="M272 107.7c39.5-.6 77.6 14.2 106.6 41.2l79.3-79.3C413.9 24.2 344.6-1.1 272 0 167.5 0 76 69.1 31.5 164.6l90 69.4C142.7 154.8 202 107.7 272 107.7z"
                            />
                          </svg>
                        </span>
                      ) : null}
                      <span>{label}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
            {footerContent ? <div className="auth-footer">{footerContent}</div> : null}
          </div>
    </div>
  );

  if (variant === "page") {
    return <div className="auth-page">{content}</div>;
  }

  return <div className="auth-modal-backdrop">{content}</div>;
}
