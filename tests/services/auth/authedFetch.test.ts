import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// The stored user is read straight from this map, so the real localStorage is never touched.
const store = vi.hoisted(() => ({ current: null as string | null }));

vi.mock("@/services/storage/storageService", () => ({
  getStoredUser: () => (store.current ? JSON.parse(store.current) : null),
  clearUser: () => {
    store.current = null;
  },
}));

import { authedFetch } from "@/services/auth/authedFetch";

const storedUser = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ user_id: "u1", user_name: "A", api_key: "key-123", ...overrides });

const headersOf = (call: unknown[]) => new Headers((call[1] as RequestInit | undefined)?.headers);

describe("authedFetch", () => {
  const fetchMock = vi.fn();
  const assign = vi.fn();

  beforeEach(() => {
    store.current = storedUser();
    fetchMock.mockReset();
    assign.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { pathname: "/dashboard", assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches the stored key as a Bearer token", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true });

    await authedFetch("http://backend/api/assistant/list");

    expect(headersOf(fetchMock.mock.calls[0]).get("Authorization")).toBe("Bearer key-123");
  });


  it("sends no header when the account has no key", async () => {
    store.current = storedUser({ api_key: null });
    fetchMock.mockResolvedValue({ status: 200, ok: true });

    await authedFetch("http://backend/api/x");

    expect(headersOf(fetchMock.mock.calls[0]).has("Authorization")).toBe(false);
  });

  it("clears the session and returns to login on 401", async () => {
    fetchMock.mockResolvedValue({ status: 401, ok: false });

    await authedFetch("http://backend/api/assistant/list");

    expect(store.current).toBeNull();
    expect(assign).toHaveBeenCalledWith("/auth");
  });

  it("does not redirect when the login screen itself answers 401", async () => {
    vi.stubGlobal("location", { pathname: "/auth", assign });
    fetchMock.mockResolvedValue({ status: 401, ok: false });

    await authedFetch("http://backend/api/auth/login");

    expect(assign).not.toHaveBeenCalled();
  });
});
