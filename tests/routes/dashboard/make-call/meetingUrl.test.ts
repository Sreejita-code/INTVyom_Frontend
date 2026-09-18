import { describe, expect, it } from "vitest";

import { validateMeetingUrl } from "@/routes/dashboard/make-call/meetingUrl";

describe("validateMeetingUrl", () => {
  it("accepts a Google Meet link, ignoring surrounding whitespace", () => {
    expect(validateMeetingUrl("https://meet.google.com/abc-defg-hij")).toEqual({ ok: true });
    expect(validateMeetingUrl("  https://meet.google.com/abc-defg-hij  ")).toEqual({ ok: true });
  });

  it("rejects an empty value", () => {
    const result = validateMeetingUrl("   ");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Meeting URL is required");
  });

  it.each([
    ["the bare host", "https://meet.google.com/"],
    ["another platform", "https://zoom.us/j/1234567890"],
    ["plain http", "http://meet.google.com/abc-defg-hij"],
    ["a wrong-length code", "https://meet.google.com/abc-def-hij"],
    ["digits in the code", "https://meet.google.com/abc-def1-hij"],
    ["a trailing query", "https://meet.google.com/abc-defg-hij?hs=1"],
  ])("rejects %s", (_label, url) => {
    const result = validateMeetingUrl(url);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("meet.google.com");
  });
});
