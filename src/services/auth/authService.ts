import { AuthLoginPayload, AuthSignupPayload } from "@/types/auth";

const AUTH_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

export interface ApiKeyData {
  api_key: string;
  user_id: string;
}

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

export async function callGetApiKeysEndpoint(userName: string): Promise<unknown> {
  const res = await fetch(`${AUTH_BASE}/get_api?user_name=${encodeURIComponent(userName)}`);
  return res.json();
}

export const condenseGetApiKeysResponse = (json: unknown): ApiKeyData[] => {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const node = json as Record<string, unknown>;
    if (node.api_key) return [node as unknown as ApiKeyData];
  }
  return [];
};
