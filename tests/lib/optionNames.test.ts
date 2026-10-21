import { describe, expect, it } from "vitest";

import { friendlyLanguage, friendlySpeaker } from "@/lib/optionNames";
import { SARVAM_V4_FLASH_SPEAKERS } from "@/routes/dashboard/assistant/sarvamSpeakers";

describe("friendlySpeaker", () => {
  it("spells a v4-flash id as voice, language, use", () => {
    expect(friendlySpeaker("shubh_hi_customer")).toEqual({ label: "Shubh · Hindi · Customer support", language: "Hindi" });
    expect(friendlySpeaker("ishita_enhi_customer_expressive").label).toBe(
      "Ishita · Hinglish · Customer support, expressive",
    );
  });

  it("only capitalises a v3 speaker, which is a bare first name", () => {
    expect(friendlySpeaker("shubh")).toEqual({ label: "Shubh" });
  });

  it("falls back to the id's own words for a language or style it has never seen", () => {
    expect(friendlySpeaker("zoya_xx_deep_voice").label).toBe("Zoya · XX · Deep Voice");
  });

  it("names every speaker in the roster without leaving a raw id behind", () => {
    for (const id of SARVAM_V4_FLASH_SPEAKERS) {
      const { label, language } = friendlySpeaker(id);
      expect(label, id).not.toContain("_");
      expect(language, id).toBeTruthy();
      expect(label, id).toMatch(/^[A-Z]/);
    }
  });
});

describe("friendlyLanguage", () => {
  it("names the code in every alphabet the providers use", () => {
    expect(friendlyLanguage("hi-IN")).toBe("Hindi (India)");
    expect(friendlyLanguage("hi")).toBe("Hindi");
    expect(friendlyLanguage("hin")).toBe("Hindi");
  });

  it("returns a code it cannot name as it is", () => {
    expect(friendlyLanguage("unknown")).toBe("unknown");
  });
});
