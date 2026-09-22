import { describe, expect, it } from "vitest";

import { condenseAuthResponse } from "@/services/auth/authService";

describe("condenseAuthResponse", () => {
  it("maps the login user onto the stored session shape", () => {
    const json = {
      message: "Login successful",
      user: { id: "u1", user_name: "asha", user_email: "asha@example.com", api_key: "lvk_abc" },
    };

    expect(condenseAuthResponse(json)).toEqual({
      user_id: "u1",
      user_name: "asha",
      user_email: "asha@example.com",
      api_key: "lvk_abc",
    });
  });

  it("keeps a missing key as null so the caller can refuse the session", () => {
    const json = { user: { id: "u1", user_name: "asha", user_email: "asha@example.com", api_key: null } };

    expect(condenseAuthResponse(json).api_key).toBeNull();
  });

  it("rejects a response without a user", () => {
    expect(() => condenseAuthResponse({ message: "ok" })).toThrow();
  });
});
