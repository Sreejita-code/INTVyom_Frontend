import { describe, expect, it } from "vitest";

import { navItems } from "@/routes/dashboard/navItems";

describe("standalone playground navigation (AC-1)", () => {
  it("lists STT, LLM and TTS under Developers", () => {
    const developers = navItems.filter((item) => item.section === "Developers").map((item) => item.path);
    expect(developers).toEqual(
      expect.arrayContaining(["/dashboard/stt", "/dashboard/llm", "/dashboard/tts"]),
    );
  });

  it("gives each entry a label and a helper line", () => {
    const entries = navItems.filter((item) => ["/dashboard/stt", "/dashboard/llm", "/dashboard/tts"].includes(item.path));
    expect(entries.map((item) => item.label)).toEqual(["Speech to Text", "LLM Chat", "Text to Speech"]);
    for (const item of entries) expect(item.helper.length).toBeGreaterThan(0);
  });
});
