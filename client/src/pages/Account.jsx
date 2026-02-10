import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../context/AuthContext.jsx";
import { auth } from "../firebase";

export default function Account() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const canChangePassword = useMemo(
    () => Array.isArray(user?.providers) && user.providers.includes("password"),
    [user]
  );

  const socialProviderLabel = useMemo(() => {
    if (!Array.isArray(user?.providers)) return null;
    if (user.providers.includes("google.com")) return "Gmail";
    if (user.providers.includes("facebook.com")) return "Facebook";
    if (user.providers.includes("apple.com")) return "Apple";
    if (user.providers.includes("github.com")) return "GitHub";
    if (user.providers.includes("twitter.com")) return "Twitter";
    return null;
  }, [user]);

  const handleSendReset = async () => {
    if (!user?.email || isSending) return;
    setIsSending(true);
    setStatus(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setStatus({
        type: "success",
        message: `Password reset email sent to ${user.email}.`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: "We couldn't send the reset email. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="account-page">
        <div className="account-card">
          <h2>Your account</h2>
          <p className="account-muted">
            You need to sign in to view account details.
          </p>
          <div className="account-actions">
            <button
              type="button"
              className="neomorphus-button secondary"
              onClick={() => navigate("/")}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="account-card">
        <div className="account-header">
          <h2>Your account</h2>
          <button
            type="button"
            className="neomorphus-button secondary"
            onClick={() => navigate("/")}
          >
            Back
          </button>
        </div>
        <div className="account-details">
          <div className="account-row">
            <span className="account-label">Name</span>
            <span className="account-value">
              {user?.displayName || "Not set"}
            </span>
          </div>
          <div className="account-row">
            <span className="account-label">Email</span>
            <span className="account-value">{user?.email || "Not set"}</span>
          </div>
        </div>
        <div className="account-divider" />
        <div className="account-section">
          <h3>Password</h3>
          {canChangePassword ? (
            <>
              <p className="account-muted">
                Forgot your password or want to change it? We can email you a reset link.
              </p>
              {status ? (
                <div className={`account-status account-status--${status.type}`}>
                  {status.message}
                </div>
              ) : null}
              <button
                type="button"
                className="neomorphus-button"
                onClick={handleSendReset}
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send password reset email"}
              </button>
            </>
          ) : (
            <p className="account-muted">
              This account uses {socialProviderLabel || "social login"} to login, so there is no
              password to change.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
