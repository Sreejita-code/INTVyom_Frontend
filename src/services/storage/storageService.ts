import { AuthUser } from "@/types/auth";

const AUTH_KEY = "intvyom_auth";

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

const ONBOARDING_KEY = "intvyom_onboarding_dismissed";

export function isOnboardingDismissed(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function dismissOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
}
