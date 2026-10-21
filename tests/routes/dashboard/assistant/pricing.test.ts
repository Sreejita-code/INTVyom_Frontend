import { describe, expect, it } from "vitest";

import {
  DUPLEX_BACKEND_MODELS,
  GEMINI_LIVE_MODELS,
  OPENAI_CASCADE_MODELS,
  OPENAI_REALTIME_MODELS,
  STT_PROVIDERS,
  TTS_PROVIDERS,
} from "@/routes/dashboard/assistant/providerCatalog";
import { TEXT_PRICES } from "@/routes/dashboard/assistant/pricing";

/**
 * A model that is offered without a price is a hole in the "glimpse of cost" the editor promises,
 * so adding a model to a catalog list fails here until its price is added to `pricing.ts`.
 */
describe("every offered model has a list price", () => {
  const unpriced = (options: { value: string; price?: unknown }[]) => options.filter((o) => !o.price).map((o) => o.value);

  it.each([
    ["cascade", OPENAI_CASCADE_MODELS],
    ["realtime", OPENAI_REALTIME_MODELS],
    ["gemini live", GEMINI_LIVE_MODELS],
    ["duplex backend", DUPLEX_BACKEND_MODELS],
  ])("%s models", (_name, options) => {
    expect(unpriced(options)).toEqual([]);
  });

  it("STT and TTS model selects", () => {
    const missing: string[] = [];
    for (const provider of [...STT_PROVIDERS, ...TTS_PROVIDERS]) {
      for (const option of provider.fields.find((f) => f.key === "model")?.options ?? []) {
        if (!option.price) missing.push(`${provider.value}:${option.value}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("TTS providers without a model select carry the price themselves", () => {
    for (const provider of TTS_PROVIDERS) {
      const hasModelSelect = provider.fields.some((f) => f.key === "model");
      expect(hasModelSelect || provider.price).toBeTruthy();
    }
  });
});

describe("price formatting", () => {
  it("keeps sub-cent rates exact and whole dollars bare", () => {
    expect(TEXT_PRICES["gpt-4.1-nano"].detail).toBe("Input $0.10 · cached input $0.025 · output $0.40 per 1M tokens");
    expect(TEXT_PRICES["gpt-4.1"].headline).toBe("$2 / $8");
  });

  it("grades by output price within the text models", () => {
    expect(TEXT_PRICES["gpt-6-luna"].tier).toBe(1);
    expect(TEXT_PRICES["gpt-4.1-mini"].tier).toBe(2);
    expect(TEXT_PRICES["gpt-5.4"].tier).toBe(3);
    expect(TEXT_PRICES["gpt-5.5"].tier).toBe(4);
  });

  it("never prices the retired models, which cannot be chosen", () => {
    expect(TEXT_PRICES["gpt-5.1"]).toBeUndefined();
    expect(TEXT_PRICES["gpt-5.4-nano"]).toBeUndefined();
  });
});
