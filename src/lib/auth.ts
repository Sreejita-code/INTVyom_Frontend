const AUTH_KEY = "intvyom_auth";

export interface AuthUser {
  user_id: string;
  user_name: string;
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(AUTH_KEY);
}
