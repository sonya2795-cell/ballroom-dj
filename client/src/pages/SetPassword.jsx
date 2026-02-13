import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const MIN_PASSWORD_LENGTH = 6;

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeEmailSignup, authError, clearAuthError, isProcessingLogin } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const verificationSessionToken = searchParams.get("vs") || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isProcessingLogin) return;
    clearAuthError();
    setLocalError("");

    if (!verificationSessionToken) {
      setLocalError("Missing verification session. Please request a new link.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setLocalError("Please enter your first and last name.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    try {
      await completeEmailSignup({
        verificationSessionToken,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      navigate("/");
    } catch {
      // Error surfaced through auth context.
    }
  };

  const displayError = localError || authError;

  return (
    <div className="auth-page">
      <div className="auth-modal">
        <div>
          <div className="auth-page-logo" aria-hidden="true">
            <span className="auth-page-logo-mark">M</span>
          </div>
          <h2>Create your password</h2>
          <p className="auth-modal-subtitle">
            Choose a password to finish setting up your account.
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">First name</span>
              <input
                type="text"
                name="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Ada"
                autoComplete="given-name"
                disabled={isProcessingLogin}
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-field-label">Last name</span>
              <input
                type="text"
                name="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Lovelace"
                autoComplete="family-name"
                disabled={isProcessingLogin}
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-field-label">Password</span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isProcessingLogin}
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-field-label">Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isProcessingLogin}
                required
              />
            </label>
            {displayError ? <p className="auth-local-error">{displayError}</p> : null}
            <button
              type="submit"
              className="neomorphus-button auth-submit"
              disabled={isProcessingLogin}
            >
              {isProcessingLogin ? "Saving..." : "Set password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
