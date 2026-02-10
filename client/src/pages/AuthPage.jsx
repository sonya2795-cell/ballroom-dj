import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage({ initialMode }) {
  const {
    isAuthenticated,
    login,
    loginWithEmail,
    registerWithEmail,
    authError,
    clearAuthError,
    isProcessingLogin,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleProviderLogin = async (providerKey) => {
    try {
      await login(providerKey);
    } catch {
      // Error is surfaced through auth context; suppress to avoid console noise
    }
  };

  const handleEmailLogin = async (payload) => {
    try {
      await loginWithEmail(payload);
    } catch {
      // Error is surfaced through auth context; suppress to avoid console noise
    }
  };

  const handleEmailSignup = async (payload) => {
    try {
      await registerWithEmail(payload);
    } catch {
      // Error is surfaced through auth context; suppress to avoid console noise
    }
  };

  return (
    <AuthModal
      isOpen
      variant="page"
      showModeToggle={false}
      onClose={() => navigate("/")}
      onSelectProvider={handleProviderLogin}
      onEmailLogin={handleEmailLogin}
      onEmailSignup={handleEmailSignup}
      isProcessing={isProcessingLogin}
      error={authError}
      onRetry={() => clearAuthError()}
      initialMode={initialMode}
      pageTitle={initialMode === "signup" ? "Sign up to start Jiving" : "Welcome back"}
      pageSubtitle={initialMode === "signup" ? null : "Log in to keep Jiving."}
      submitLabel={initialMode === "signup" ? "Create account" : "Continue"}
      dividerText="or"
      emailLabel="Email"
      footerContent={
        initialMode === "signup" ? (
          <span>
            Already have an account?{" "}
            <button type="button" className="auth-footer-link" onClick={() => navigate("/login")}>
              Log in
            </button>
          </span>
        ) : (
          <span>
            Don&apos;t have an account?{" "}
            <button type="button" className="auth-footer-link" onClick={() => navigate("/signup")}>
              Sign up
            </button>
          </span>
        )
      }
    />
  );
}
