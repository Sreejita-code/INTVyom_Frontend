import { AuthLoginPayload, AuthSignupPayload } from "@/types/auth";

const AUTH_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

export async function callLoginEndpoint(payload: AuthLoginPayload): Promise<unknown> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Authentication failed");
  }

  return data;
}

export async function callSignupEndpoint(payload: AuthSignupPayload): Promise<unknown> {
  const res = await fetch(`${AUTH_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Authentication failed");
  }

  return data;
}
