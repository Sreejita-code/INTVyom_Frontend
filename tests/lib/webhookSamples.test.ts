import { describe, expect, it } from "vitest";

import { END_CALL_WEBHOOK_SAMPLES } from "@/lib/webhookSamples";

type Entry = { type: string; estimated_cost_usd?: string };
interface Usage {
  mode: string;
  estimated_cost_usd: string;
  model_usage: Entry[];
}
const usageOf = (id: string) =>
  (END_CALL_WEBHOOK_SAMPLES.find((s) => s.id === id)?.value as { data: { usage?: Usage } }).data.usage as Usage;

describe("end-call webhook samples", () => {
  it("covers every mode plus a call nobody answered", () => {
    expect(END_CALL_WEBHOOK_SAMPLES.map((s) => s.id)).toEqual(["cascade", "realtime", "duplex", "no-answer"]);
  });

  it.each(["cascade", "realtime", "duplex"])("%s: entry costs add up to the call total", (id) => {
    const usage = usageOf(id);
    const sum = usage.model_usage.reduce((n, e) => n + Number(e.estimated_cost_usd), 0);
    expect(sum).toBeCloseTo(Number(usage.estimated_cost_usd), 6);
  });

  it("duplex splits voice and backend into two typed entries", () => {
    const usage = usageOf("duplex");
    expect(usage.mode).toBe("duplex");
    expect(usage.model_usage.map((e) => e.type)).toEqual(["voice_llm_usage", "backend_llm_usage"]);
  });

  it("a call nobody answered has no usage block", () => {
    expect((END_CALL_WEBHOOK_SAMPLES[3].value as { data: object }).data).not.toHaveProperty("usage");
  });
});
