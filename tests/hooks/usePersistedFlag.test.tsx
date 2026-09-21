import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePersistedFlag } from "@/hooks/usePersistedFlag";

/** jsdom ships no localStorage here, so stub it the way storageService tests do. */
const stubStorage = (overrides: Partial<Storage> = {}) => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => delete store[key],
    clear: () => Object.keys(store).forEach((key) => delete store[key]),
    ...overrides,
  });
};

describe("usePersistedFlag", () => {
  beforeEach(() => stubStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("starts from the given default when nothing is stored", () => {
    const { result } = renderHook(() => usePersistedFlag("sidebar", true));
    expect(result.current[0]).toBe(true);
  });

  it("restores the stored value over the default", () => {
    localStorage.setItem("sidebar", "true");
    const { result } = renderHook(() => usePersistedFlag("sidebar", false));
    expect(result.current[0]).toBe(true);
  });

  it("persists a toggle so the next mount reads it back", () => {
    const { result } = renderHook(() => usePersistedFlag("sidebar"));
    act(() => result.current[1]());

    expect(result.current[0]).toBe(true);
    expect(renderHook(() => usePersistedFlag("sidebar")).result.current[0]).toBe(true);
  });

  it("still toggles in memory when storage is unavailable", () => {
    stubStorage({
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });

    const { result } = renderHook(() => usePersistedFlag("sidebar"));
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
