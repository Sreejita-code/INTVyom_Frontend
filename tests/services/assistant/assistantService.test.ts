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

  it("carries direction, platform, and outcome fields when present", () => {
    const page = condenseCallLogsResponse({
      data: {
        logs: [
          {
            ...sampleLog,
            call_type: "outbound",
            call_service: "exotel",
            platform_number: "+918044319240",
            is_passthrough: false,
            call_status: "completed",
            call_status_reason: null,
            sip_status_code: null,
            sip_status_text: null,
            answered_at: "2026-09-06T10:40:15.259000Z",
            ended_at: "2026-09-06T10:40:43.548000Z",
          },
        ],
        pagination: { total_pages: 1, total: 1 },
      },
    });

    expect(page.logs[0]).toMatchObject({
      call_type: "outbound",
      call_service: "exotel",
      platform_number: "+918044319240",
      is_passthrough: false,
      call_status: "completed",
      answered_at: "2026-09-06T10:40:15.259000Z",
      ended_at: "2026-09-06T10:40:43.548000Z",
    });
  });

  it("keeps failure reason and SIP detail, tolerates missing direction fields", () => {
    const page = condenseCallLogsResponse({
      data: {
        logs: [
          {
            started_at: "2026-09-06T10:00:00.000Z",
            to_number: "+15550200000",
            call_status: "busy",
            call_status_reason: "SIP 486 Busy Here",
            sip_status_code: 486,
            sip_status_text: "Busy Here",
            answered_at: null,
          },
          { started_at: "2026-09-06T10:01:00.000Z" },
        ],
        pagination: { total_pages: 1, total: 2 },
      },
    });

    expect(page.logs[0]).toMatchObject({
      call_status: "busy",
      call_status_reason: "SIP 486 Busy Here",
      sip_status_code: 486,
      sip_status_text: "Busy Here",
    });
    expect(page.logs[1].call_status).toBeUndefined();
    expect(page.logs[1].platform_number).toBeNull();
    expect(page.logs[1].sip_status_code).toBeNull();
  });
});

describe("duplex usage lines", () => {
  it("reads the session seconds GPT-Live is billed on", () => {
    const page = condenseCallLogsResponse({
      data: {
        logs: [
          {
            started_at: "2026-10-20T10:00:00Z",
            usage: { model_usage: [{ type: "llm_usage", provider: "openai", model: "gpt-live-1", session_duration: 61.5 }] },
          },
        ],
      },
    });

    expect(page.logs[0].usage?.lines[0]).toMatchObject({ model: "gpt-live-1", sessionDuration: 61.5 });
  });
});

describe("duplex usage entries from upstream 1.7.0", () => {
  const usage = (model_usage: unknown[], unpriced: unknown[] = []) =>
    condenseCallLogsResponse({
      data: { logs: [{ started_at: "2026-10-21T10:00:00Z", usage: { model_usage, unpriced_model_usage: unpriced } }] },
    }).logs[0].usage;

  it("tells GPT-Live and its backend model apart while keeping both as LLM lines", () => {
    const lines = usage([
      { type: "voice_llm_usage", provider: "openai", model: "gpt-live-1", session_duration: 120, estimated_cost_usd: "0.1000" },
      { type: "backend_llm_usage", provider: "openai", model: "gpt-6-luna", input_tokens: 1000, output_tokens: 300, estimated_cost_usd: "0.00025" },
    ])?.lines;

    expect(lines?.[0]).toMatchObject({ type: "llm", role: "voice", sessionDuration: 120, estimatedCostUsd: 0.1 });
    expect(lines?.[1]).toMatchObject({ type: "llm", role: "backend", inputTokens: 1000, estimatedCostUsd: 0.00025 });
  });

  it("leaves a duplex call recorded before 1.7.0 as two plain LLM lines", () => {
    const lines = usage([
      { type: "llm_usage", provider: "openai", model: "gpt-live-1", session_duration: 60 },
      { type: "llm_usage", provider: "openai", model: "gpt-6-luna", input_tokens: 10 },
    ])?.lines;
    expect(lines?.map((l) => l.role)).toEqual([undefined, undefined]);
  });

  it("reports an entry with no rate as unpriced, not as zero", () => {
    const u = usage(
      [{ type: "backend_llm_usage", provider: "openai", model: "gpt-9", input_tokens: 5 }],
      [{ type: "backend_llm_usage", model: "gpt-9" }],
    );
    expect(u?.lines[0].estimatedCostUsd).toBeNull();
    expect(u?.pricingComplete).toBe(false);
  });
});
