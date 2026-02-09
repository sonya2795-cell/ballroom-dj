import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
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
        setAuthError(err instanceof Error ? err.message : "Login failed");
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
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await establishSessionFromUser(credential.user);
      } catch (err) {
        console.error("Email login failed", err);
        setAuthError(err instanceof Error ? err.message : "Login failed");
        setStatus("unauthenticated");
        throw err;
      } finally {
        setIsProcessingLogin(false);
      }
    },
    [clearAuthError, establishSessionFromUser]
  );

  const registerWithEmail = useCallback(
    async ({ firstName, lastName, email, password }) => {
      setIsProcessingLogin(true);
      clearAuthError();

      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
        await establishSessionFromUser(credential.user);
      } catch (err) {
        console.error("Email signup failed", err);
        setAuthError(err instanceof Error ? err.message : "Sign up failed");
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
