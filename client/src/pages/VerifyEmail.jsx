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
  const [localNotice, setLocalNotice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setLocalError(getErrorMessage(errorCode));
    }
  }, [searchParams]);

  const handleResend = async () => {
    if (isResending) return;
    const email = sessionStorage.getItem("verificationEmail") || "";
    if (!email) {
      navigate("/signup");
      return;
    }

    setIsResending(true);
    setLocalError("");
    setLocalNotice("");

    try {
      const response = await fetchWithOrigin("/auth/email/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setLocalError(payload?.error || ERROR_MESSAGES.error);
        return;
      }

      setLocalNotice(`We sent a new code to ${email}.`);
    } catch (err) {
      setLocalError(ERROR_MESSAGES.error);
    } finally {
      setIsResending(false);
    }
  };

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
    setLocalNotice("");

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
                onChange={(event) => {
                  const sanitized = event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 5);
                  setToken(sanitized);
                }}
                placeholder="Paste code"
                autoComplete="one-time-code"
                maxLength={5}
                disabled={isProcessing}
                required
              />
            </label>
            {localError ? <p className="auth-local-error">{localError}</p> : null}
            {localNotice ? <p className="auth-local-success">{localNotice}</p> : null}
            <button type="submit" className="neomorphus-button auth-submit" disabled={isProcessing}>
              {isProcessing ? "Verifying..." : "Continue"}
            </button>
            <button
              type="button"
              className="neomorphus-button secondary auth-submit auth-resend"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? "Sending..." : "Send New Code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
