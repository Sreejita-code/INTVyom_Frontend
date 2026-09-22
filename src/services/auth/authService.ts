import { AuthLoginPayload, AuthSignupPayload, AuthUser } from "@/types/auth";
import { readJson } from "@/lib/readJson";

const AUTH_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

export async function callLoginEndpoint(payload: AuthLoginPayload): Promise<unknown> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await readJson(res);

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

  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(data.error || data.message || "Authentication failed");
  }

  return data;
}

/**
 * The session to store from a login or signup response. The backend names the id `id` and
 * returns `api_key: null` when upstream key issuance failed at signup.
 */
export const condenseAuthResponse = (json: unknown): AuthUser => {
  const user = (json as { user?: Record<string, unknown> } | null)?.user;
  if (!user || typeof user.id !== "string") throw new Error("Unexpected response from the server");
  return {
    user_id: user.id,
    user_name: String(user.user_name ?? ""),
    user_email: typeof user.user_email === "string" ? user.user_email : undefined,
    api_key: typeof user.api_key === "string" && user.api_key ? user.api_key : null,
  };
};
