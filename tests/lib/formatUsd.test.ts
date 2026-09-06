import { describe, expect, it } from "vitest";

import { formatUsd, parseUsd } from "@/lib/formatUsd";

describe("parseUsd", () => {
  it("reads numbers and decimal strings", () => {
    expect(parseUsd(0.000373)).toBe(0.000373);
    expect(parseUsd("0.01456901990049749552238805970")).toBeCloseTo(0.0145690199);
  });

  it("returns null for missing or invalid values", () => {
    expect(parseUsd(null)).toBeNull();
    expect(parseUsd("")).toBeNull();
    expect(parseUsd("n/a")).toBeNull();
    expect(parseUsd(Number.NaN)).toBeNull();
  });
});

describe("formatUsd", () => {
  it("keeps tiny LLM costs visible", () => {
    expect(formatUsd("0.00037300")).toBe("$0.000373");
  });

  it("trims long backend strings without dropping cents", () => {
    expect(formatUsd("0.01010149253731343283582089552")).toBe("$0.010101");
  });

  it("uses two fraction digits for whole dollars", () => {
    expect(formatUsd(1)).toBe("$1.00");
  });

  it("returns null when there is no amount", () => {
    expect(formatUsd(undefined)).toBeNull();
  });
});
