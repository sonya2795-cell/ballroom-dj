import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import { fetchWithOrigin } from "../utils/apiClient.js";

const AuthContext = createContext(null);

const PROVIDERS = {
  google: () => new GoogleAuthProvider(),
  facebook: () => new FacebookAuthProvider(),
  apple: () => new OAuthProvider("apple.com"),
};

function getSessionStorageAvailable() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return false;
    }
    const key = "__auth_probe__";
    window.sessionStorage.setItem(key, "1");
    window.sessionStorage.removeItem(key);
    return true;
  } catch (err) {
    return false;
  }
}

async function reportAuthError({ error, providerKey }) {
  try {
    await fetchWithOrigin("/api/auth/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        provider: providerKey,
        errorCode: error?.code ?? null,
        errorName: error?.name ?? null,
        errorMessage: error?.message ?? null,
        location: typeof window !== "undefined" ? window.location?.hostname ?? null : null,
        path: typeof window !== "undefined" ? window.location?.pathname ?? null : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent ?? null : null,
        cookieEnabled: typeof navigator !== "undefined" ? navigator.cookieEnabled ?? null : null,
        sessionStorageAvailable: getSessionStorageAvailable(),
      }),
    });
  } catch (err) {
    // Telemetry is best-effort.
  }
}

function mapUserResponse(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    emailVerified: Boolean(user.emailVerified),
    providers: Array.isArray(user.providers) ? user.providers : [],
    customClaims: user.customClaims ?? {},
  };
}

function getFriendlyAuthError(error, fallbackMessage) {
  const code = typeof error?.code === "string" ? error.code : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    case "auth/email-already-in-use":
      return "That email is already associated with an existing account. Please proceed to login with this email.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled yet. Contact support.";
    default:
      return fallbackMessage;
  }
}

function getProviderLabelForMethod(method) {
  switch (method) {
    case "google.com":
      return "Gmail";
    case "facebook.com":
      return "Facebook";
    case "apple.com":
      return "Apple";
    case "github.com":
      return "GitHub";
    case "twitter.com":
      return "Twitter";
    case "password":
      return "email/password";
    default:
      return null;
  }
}

function getGmailHeuristic(email) {
  if (typeof email !== "string") return null;
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return "Gmail";
  }
  return null;
}

function buildExistingAccountMessage(labels) {
  return "That email is already associated with an existing account. Please proceed to login with this email.";
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const clearAuthError = useCallback(() => setAuthError(null), []);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetchWithOrigin("/auth/session", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(mapUserResponse(data.user));
        setStatus("authenticated");
        setAuthError(null);
        return;
      }

      if (response.status === 401) {
        setUser(null);
        setStatus("unauthenticated");
        setAuthError(null);
        return;
      }

      throw new Error(`Unexpected status ${response.status}`);
    } catch (err) {
      console.error("Failed to fetch session", err);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const establishSessionFromUser = useCallback(
    async (firebaseUser) => {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetchWithOrigin("/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to establish session");
      }

      await signOut(auth);
      await fetchSession();
    },
    [fetchSession]
  );

  const login = useCallback(
    async (providerKey) => {
      const providerFactory = PROVIDERS[providerKey];

      if (!providerFactory) {
        throw new Error(`Unsupported provider '${providerKey}'`);
      }

      setIsProcessingLogin(true);
      clearAuthError();

      try {
        const provider = providerFactory();
        const credential = await signInWithPopup(auth, provider);
        await establishSessionFromUser(credential.user);
      } catch (err) {
        console.error("Login failed", err);
        reportAuthError({ error: err, providerKey });
        setAuthError(getFriendlyAuthError(err, "Login failed"));
        setStatus("unauthenticated");
        throw err;
      } finally {
        setIsProcessingLogin(false);
      }
    },
    [clearAuthError, establishSessionFromUser]
  );

  const loginWithEmail = useCallback(
    async ({ email, password }) => {
      setIsProcessingLogin(true);
      clearAuthError();

      try {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.includes("google.com") && !methods.includes("password")) {
            setAuthError(
              "That email is already associated with an existing account. Please continue with Google."
            );
            setStatus("unauthenticated");
            return;
          }
        } catch (lookupError) {
          // Ignore precheck errors and fall through to Firebase.
        }

        const credential = await signInWithEmailAndPassword(auth, email, password);
        await establishSessionFromUser(credential.user);
      } catch (err) {
        console.error("Email login failed", err);
        if (
          err?.code === "auth/invalid-credential" ||
          err?.code === "auth/user-not-found" ||
          err?.code === "auth/wrong-password"
        ) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            const gmailFallback = getGmailHeuristic(email);
            if (methods.includes("google.com") || gmailFallback) {
              setAuthError(
                "That email is already associated with an existing account. Please continue with Google."
              );
            } else {
              setAuthError(getFriendlyAuthError(err, "Login failed"));
            }
          } catch (lookupError) {
            const gmailFallback = getGmailHeuristic(email);
            if (gmailFallback) {
              setAuthError(
                "That email is already associated with an existing account. Please continue with Google."
              );
            } else {
              setAuthError(getFriendlyAuthError(err, "Login failed"));
            }
          }
        } else {
          setAuthError(getFriendlyAuthError(err, "Login failed"));
        }
        setStatus("unauthenticated");
        throw err;
      } finally {
        setIsProcessingLogin(false);
      }
    },
    [clearAuthError, establishSessionFromUser]
  );

  const registerWithEmail = useCallback(
    async ({ email, password, firstName, lastName }) => {
      setIsProcessingLogin(true);
      clearAuthError();

      try {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          const providerLabels = methods
            .map((method) => getProviderLabelForMethod(method))
            .filter(Boolean);
          const gmailFallback = getGmailHeuristic(email);

          if (providerLabels.length > 0 || gmailFallback) {
            const labels = providerLabels.length > 0 ? providerLabels : [gmailFallback];
            setAuthError(buildExistingAccountMessage(labels));
            setStatus("unauthenticated");
            return;
          }

          if (methods.length > 0) {
            setAuthError(buildExistingAccountMessage([]));
            setStatus("unauthenticated");
            return;
          }
        } catch (lookupError) {
          // If lookup fails, continue with signup and let Firebase handle it.
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
        await establishSessionFromUser(credential.user);
      } catch (err) {
        console.error("Email signup failed", err);
        setAuthError(getFriendlyAuthError(err, "Sign up failed"));
        setStatus("unauthenticated");
        throw err;
      } finally {
        setIsProcessingLogin(false);
      }
    },
    [clearAuthError, establishSessionFromUser]
  );

  const logout = useCallback(async () => {
    try {
      await fetchWithOrigin("/auth/session", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to clear session cookie", err);
    }

    try {
      await signOut(auth);
    } catch (err) {
      console.error("Failed to sign out of Firebase", err);
    }

    setUser(null);
    setStatus("unauthenticated");
    clearAuthError();
  }, [clearAuthError]);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === "authenticated",
      isUnauthenticated: status === "unauthenticated",
      isAdmin: user?.customClaims?.role === "admin",
      user,
      authError,
      login,
      loginWithEmail,
      registerWithEmail,
      logout,
      refreshSession: fetchSession,
      isProcessingLogin,
      clearAuthError,
    }),
    [
      status,
      user,
      authError,
      login,
      loginWithEmail,
      registerWithEmail,
      logout,
      fetchSession,
      isProcessingLogin,
      clearAuthError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
