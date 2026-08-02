export type AuthState = {
  // In-memory only, never persisted (localStorage/cookie) — see decisions.md
  // "Token transport" for why. Lost on page reload; tryRestoreSession()
  // recovers it from the httpOnly refresh cookie on app bootstrap.
  accessToken: string | null;
  // Whether the initial tryRestoreSession() attempt has completed (success
  // or failure) — guards read isAuthenticated() only after this is true,
  // via the app initializer blocking bootstrap until it resolves.
  bootstrapped: boolean;
};

export const initialAuthState: AuthState = {
  accessToken: null,
  bootstrapped: false,
};
