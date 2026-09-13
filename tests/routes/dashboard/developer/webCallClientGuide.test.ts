import { describe, expect, it } from "vitest";

import {
  WEB_CALL_CLIENT_STEPS,
  AGENT_TEXT_TOPIC,
  USER_TEXT_TOPIC,
} from "@/routes/dashboard/developer/webCallClientGuide";

describe("WEB_CALL_CLIENT_STEPS", () => {
  it("exposes three samples with unique ids", () => {
    expect(WEB_CALL_CLIENT_STEPS).toHaveLength(3);
    const ids = WEB_CALL_CLIENT_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of WEB_CALL_CLIENT_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.code.trim().length).toBeGreaterThan(0);
    }
  });

  it("reads the agent's words from lk.transcription, never from lk.chat", () => {
    // The upstream docs claim agent replies arrive on lk.chat. They do not — the agent registers
    // lk.chat for input and publishes its own text on lk.transcription. Following the docs gives a
    // silent, empty transcript, so this is the one detail the samples must not drift on.
    for (const step of WEB_CALL_CLIENT_STEPS) {
      expect(step.code).toContain(AGENT_TEXT_TOPIC);
      expect(step.code).not.toMatch(/registerTextStreamHandler\(\s*["']lk\.chat["']/);
    }
  });

  it("sends the user's typed message on lk.chat", () => {
    const chat = WEB_CALL_CLIENT_STEPS.find((step) => step.id === "vanilla");
    expect(chat?.code).toContain(`topic: "${USER_TEXT_TOPIC}"`);
  });

  it("echoes the user's own message in the text sample", () => {
    // Nothing streams a typed message back: lk.transcription carries the agent only. Render just
    // the stream and the developer types into a chat that never shows what they said.
    const text = WEB_CALL_CLIENT_STEPS.find((step) => step.id === "react-text");
    expect(text?.code).toMatch(/setLines\(\(prev\) => \[\.\.\.prev, \{[^}]*speaker: "you"/);
  });

  it("checks the response before reading data.token", () => {
    // A realtime assistant rejects text_only with a 400 and data is undefined; without the guard
    // the reader gets a TypeError instead of the backend's message.
    for (const step of WEB_CALL_CLIENT_STEPS) {
      expect(step.code).toContain("if (!res.ok)");
    }
  });

  it("names the LiveKit server URL, which the token endpoint does not return", () => {
    for (const step of WEB_CALL_CLIENT_STEPS) {
      expect(step.code).toContain("LIVEKIT_URL");
      expect(step.code).toContain("/api/web-call/get-token");
    }
  });
});
