import { applyAccessibilityPreferences, applyTheme, getSavedTheme } from "@/lib/theme";

export type AuthRole = "student" | "teacher";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
const TOKEN_KEY = "codexa_token";
const USER_KEY = "codexa_user";

export interface AuthUser {
  email: string;
  role: AuthRole;
  name?: string | null;
  degree?: string | null;
  bio?: string;
  theme?: "light" | "dark" | "system";
  student_id?: string | null;
  department?: string | null;
  designation?: string | null;
  semester?: string | null;
  settings?: Record<string, unknown>;
}

interface AuthResponse {
  token?: string;
  access_token?: string;
  user?: AuthUser;
  message?: string;
  error?: string;
}

const parseResponse = async (response: Response): Promise<AuthResponse> => {
  const text = await response.text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    return { error: text || "Unexpected response from server" };
  }
};

const extractToken = (data: AuthResponse): string | undefined => {
  return data.token || data.access_token;
};

const saveAuthState = (token: string, user: AuthUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  applyTheme(user.theme ?? getSavedTheme());
  applyUserAccessibility(user);
};

const applyUserAccessibility = (user: AuthUser) => {
  const settings = user.settings as {
    appearance?: {
      compact_layout?: boolean;
      reduced_motion?: boolean;
      font_size?: "small" | "default" | "large";
    };
  } | undefined;
  const appearance = settings?.appearance;
  if (appearance) {
    applyAccessibilityPreferences(
      appearance.reduced_motion ?? false,
      appearance.font_size ?? "default",
      appearance.compact_layout ?? false,
    );
  }
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(getToken());

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const verifySession = async (): Promise<AuthUser> => {
  const token = getToken();
  if (!token) {
    throw new Error("No active session.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }
    throw new Error(data.error || "Unable to verify your session.");
  }

  if (!data.user || !["teacher", "student"].includes(data.user.role)) {
    logout();
    throw new Error("Server returned an invalid user role.");
  }

  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  applyTheme(data.user.theme ?? getSavedTheme());
  applyUserAccessibility(data.user);
  return data.user;
};

export const login = async (email: string, password: string, role: AuthRole) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.message || "Unable to login. Please try again.");
  }

  const token = extractToken(data);
  if (!token) {
    throw new Error("Server did not return a valid authentication token.");
  }

  if (!data.user || data.user.role !== role) {
    throw new Error("Server returned a user for a different portal.");
  }

  const user = data.user;
  saveAuthState(token, user);
  return { token, user };
};

export const registerUser = async (email: string, password: string, role: AuthRole) => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data.error || data.message || "Unable to register. Please try again.");
  }

  const token = extractToken(data);
  if (!token) {
    throw new Error("Server did not return a valid authentication token.");
  }

  if (!data.user || data.user.role !== role) {
    throw new Error("Server returned a user for a different portal.");
  }

  const user = data.user;
  saveAuthState(token, user);
  return { token, user };
};
