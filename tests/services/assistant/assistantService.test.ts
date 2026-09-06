import { describe, expect, it } from "vitest";

import { condenseCallLogsResponse } from "@/services/assistant/assistantService";

const sampleLog = {
  room_name: "08837cd9-0822-4442-a066-edaef7c56408_0a6d53d3",
  to_number: "+918697421450",
  started_at: "2026-09-06T10:39:58.168000Z",
  call_duration_minutes: 0.47148476666666667,
  recording_path: "https://example.com/rec.ogg",
  transcripts: [{ speaker: "assistant", text: "Hi", timestamp: "2026-09-06T10:40:24.833000Z" }],
  usage: {
    estimated_cost_usd: "0.01456901990049749552238805970",
    pricing_complete: true,
    usage_finalized: true,
    unpriced_model_usage: [],
    model_usage: [
      {
        type: "llm_usage",
        provider: "openai",
        model: "gpt-5.6-luna",
        input_tokens: 10123,
        output_tokens: 143,
        estimated_cost_usd: "0.00037300",
      },
      {
        type: "tts_usage",
        provider: "sarvam",
        model: "bulbul:v3",
        characters_count: 282,
        audio_duration: 16.536,
        estimated_cost_usd: "0.01010149253731343283582089552",
      },
      {
        type: "stt_usage",
        provider: "sarvam",
        model: "saaras:v3",
        audio_duration: 41.15,
        estimated_cost_usd: "0.004094527363184062686567164177",
      },
    ],
  },
};

describe("condenseCallLogsResponse", () => {
  it("extracts the estimated total and LLM / TTS / STT lines", () => {
    const page = condenseCallLogsResponse({
      success: true,
      data: {
        logs: [sampleLog],
        pagination: { total_pages: 3, total: 12 },
      },
    });

    expect(page.totalPages).toBe(3);
    expect(page.total).toBe(12);
    expect(page.logs).toHaveLength(1);

    const log = page.logs[0];
    expect(log.to_number).toBe("+918697421450");
    expect(log.usage).not.toBeNull();
    expect(log.usage?.usageFinalized).toBe(true);
    expect(log.usage?.pricingComplete).toBe(true);
    expect(log.usage?.estimatedCostUsd).toBeCloseTo(0.0145690199);
    expect(log.usage?.lines.map((line) => line.type)).toEqual(["llm", "tts", "stt"]);
    expect(log.usage?.lines[0]).toMatchObject({
      provider: "openai",
      model: "gpt-5.6-luna",
      inputTokens: 10123,
      outputTokens: 143,
    });
    expect(log.usage?.lines[1].charactersCount).toBe(282);
    expect(log.usage?.lines[2].audioDuration).toBeCloseTo(41.15);
  });

  it("treats missing usage as null and flags incomplete pricing", () => {
    const page = condenseCallLogsResponse({
      data: {
        logs: [
          { started_at: "2026-09-06T10:00:00.000Z" },
          {
            started_at: "2026-09-06T10:01:00.000Z",
            usage: {
              estimated_cost_usd: "0.01",
              pricing_complete: false,
              usage_finalized: true,
              unpriced_model_usage: [{ type: "llm_usage" }],
              model_usage: [],
            },
          },
        ],
      },
    });

    expect(page.logs[0].usage).toBeNull();
    expect(page.logs[1].usage?.pricingComplete).toBe(false);
  });

  it("returns an empty page when the envelope is missing", () => {
    expect(condenseCallLogsResponse(null)).toEqual({ logs: [], totalPages: 1, total: 0 });
  });
});
