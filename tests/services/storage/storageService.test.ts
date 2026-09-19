import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  dismissOnboarding,
  isOnboardingDismissed,
} from "@/services/storage/storageService";

describe("onboarding storage", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is not dismissed by default", () => {
    expect(isOnboardingDismissed()).toBe(false);
  });

  it("stays dismissed once dismissed", () => {
    dismissOnboarding();
    expect(isOnboardingDismissed()).toBe(true);
  });
});
