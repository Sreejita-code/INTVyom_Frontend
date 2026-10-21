import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfigField } from "@/routes/dashboard/assistant/ConfigField";
import { SARVAM_V4_FLASH_SPEAKERS } from "@/routes/dashboard/assistant/sarvamSpeakers";
import {
  SARVAM_BULBUL_V3_SPEAKERS,
  TTS_PROVIDERS,
  findProvider,
  ttsFieldsFor,
} from "@/routes/dashboard/assistant/providerCatalog";

const speakerField = (model: string) =>
  ttsFieldsFor(findProvider(TTS_PROVIDERS, "sarvam"), { model }).find((f) => f.key === "speaker")!;

describe("Sarvam speaker options", () => {
  it("keeps every raw id as the value the API receives, for both rosters", () => {
    expect(speakerField("bulbul:v4-flash").options?.map((o) => o.value).sort()).toEqual([...SARVAM_V4_FLASH_SPEAKERS].sort());
    expect(speakerField("bulbul:v3").options?.map((o) => o.value).sort()).toEqual([...SARVAM_BULBUL_V3_SPEAKERS].sort());
  });

  it("shows a name, not the id, and keeps the id as the hint", () => {
    const option = speakerField("bulbul:v4-flash").options?.find((o) => o.value === "shubh_hi_customer");
    expect(option).toMatchObject({ label: "Shubh · Hindi · Customer support", hint: "shubh_hi_customer", group: "Hindi" });
  });

  it("lists one language together, so a group heading is never repeated", () => {
    const groups = speakerField("bulbul:v4-flash").options?.map((o) => o.group) ?? [];
    const headings = groups.filter((g, i) => g !== groups[i - 1]);
    expect(new Set(headings).size).toBe(headings.length);
  });

  it("renders the chosen speaker by name in the closed select", () => {
    render(<ConfigField spec={speakerField("bulbul:v4-flash")} value="shubh_hi_customer" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Speaker" })).toHaveTextContent("Shubh · Hindi · Customer support");
  });
});
