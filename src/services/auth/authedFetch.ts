/**
 * `fetch` with the stored API key attached as `Authorization: Bearer <api_key>`.
 *
 * Identity comes from the bearer key, not from a `user_id` in the payload. Every service that
 * talks to an authenticated `/api` route goes through here so the header is set in one place and a
 * `401` is handled once. Login and signup deliberately use plain `fetch` — they are how the key is
 * obtained, and their `401` means "wrong password", not "session expired".
 */
import { clearUser, getStoredUser } from "@/services/storage/storageService";

let redirecting = false;

/** An invalid or expired key: drop the session and send the user back to the login screen. */
function handleUnauthorized() {
  clearUser();
  if (redirecting || window.location.pathname === "/auth") return;
  redirecting = true;
  window.location.assign("/auth");
}

export async function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const key = getStoredUser()?.api_key;
  if (key) headers.set("Authorization", `Bearer ${key}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) handleUnauthorized();
  return res;
}
