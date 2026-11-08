import { describe, expect, it } from "vitest";
import { condenseApiError } from "@/lib/apiError";

describe("condenseApiError", () => {
  it("reads the error string and the status", () => {
    expect(condenseApiError({ error: "Assistant not found" }, 404)).toEqual({
      status: 404,
      message: "Assistant not found",
      suggestions: {},
    });
  });

  it("keeps suggestions as an object keyed by slot", () => {
    const err = condenseApiError(
      { error: "bad", suggestions: { llm: "Try: openai", llm_notes: "Gemini is not supported" } },
      400,
    );
    expect(err.suggestions).toEqual({ llm: "Try: openai", llm_notes: "Gemini is not supported" });
  });

  it("ignores a suggestions array rather than guessing its keys", () => {
    expect(condenseApiError({ error: "bad", suggestions: ["x"] }, 400).suggestions).toEqual({});
  });

  it("always returns a message, even for an empty body", () => {
    expect(condenseApiError({}, 502).message).toBe("The request failed (502).");
    expect(condenseApiError(null, 500).message).toBe("The request failed (500).");
  });
});
