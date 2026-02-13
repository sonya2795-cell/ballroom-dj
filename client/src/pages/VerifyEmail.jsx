import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchWithOrigin } from "../utils/apiClient.js";

const ERROR_MESSAGES = {
  invalid: "That verification code is invalid. Please request a new one.",
  expired: "That verification code expired. Please request a new one.",
  used: "That verification code was already used. Please request a new one.",
  exists: "That email already has an account. Please log in instead.",
  error: "We couldn't verify your email. Please try again.",
};

function getErrorMessage(code) {
  if (!code) return "";
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.error;
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [localError, setLocalError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setLocalError(getErrorMessage(errorCode));
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isProcessing) return;
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setLocalError("Please enter the verification code.");
      return;
    }

    setIsProcessing(true);
    setLocalError("");

    try {
      const response = await fetchWithOrigin("/auth/email/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token: trimmedToken }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setLocalError(getErrorMessage(payload?.error));
        return;
      }

      const sessionToken = payload?.verificationSessionToken;
      if (!sessionToken) {
        setLocalError(ERROR_MESSAGES.error);
        return;
      }

      navigate(`/set-password?vs=${encodeURIComponent(sessionToken)}`);
    } catch (err) {
      setLocalError(ERROR_MESSAGES.error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-modal">
        <div>
          <div className="auth-page-logo" aria-hidden="true">
            <span className="auth-page-logo-mark">M</span>
          </div>
          <h2>Verify your email</h2>
          <p className="auth-modal-subtitle">
            Paste the verification code from your email to continue.
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">Verification code</span>
              <input
                type="text"
                name="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste code"
                autoComplete="one-time-code"
                disabled={isProcessing}
                required
              />
            </label>
            {localError ? <p className="auth-local-error">{localError}</p> : null}
            <button type="submit" className="neomorphus-button auth-submit" disabled={isProcessing}>
              {isProcessing ? "Verifying..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
