import { describe, expect, it } from "vitest";

import { condenseListAudiosResponse } from "@/services/audio/audioService";

describe("condenseListAudiosResponse", () => {
  const item = { audio_id: "a1", audio_name: "Hello" };

  it("reads the bare array the contract documents", () => {
    expect(condenseListAudiosResponse({ data: [item] })).toEqual([item]);
  });

  it("still reads the { audios } envelope", () => {
    expect(condenseListAudiosResponse({ data: { audios: [item] } })).toEqual([item]);
  });

  it("answers an empty list for anything else", () => {
    expect(condenseListAudiosResponse(null)).toEqual([]);
    expect(condenseListAudiosResponse({ data: {} })).toEqual([]);
  });
});
