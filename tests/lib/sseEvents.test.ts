import { describe, expect, it } from "vitest";
import { deltaOf, parseSseChunk, SSE_DONE } from "@/lib/sseEvents";

describe("parseSseChunk", () => {
  it("returns complete events and keeps the partial tail", () => {
    const { events, rest } = parseSseChunk('data: {"a":1}\n\ndata: {"b"');
    expect(events).toEqual(['data: {"a":1}']);
    expect(rest).toBe('data: {"b"');
  });

  it("joins a frame split across chunks", () => {
    const first = parseSseChunk('data: {"choices":[{"delta":{"content":"We"}}]}\n\ndata: {"cho');
    const second = parseSseChunk(first.rest + 'ices":[{"delta":{"content":" offer"}}]}\n\n');
    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(1);
    expect(deltaOf(second.events[0])).toBe(" offer");
  });
});

describe("deltaOf", () => {
  it("reads choices[0].delta.content", () => {
    expect(deltaOf('data: {"choices":[{"delta":{"content":"We"}}]}')).toBe("We");
  });

  it("returns empty text for unknown shapes, so raw events still show", () => {
    expect(deltaOf('data: {"usage":{"total_tokens":4}}')).toBe("");
    expect(deltaOf("data: not json")).toBe("");
  });

  it("exposes the end marker", () => {
    expect(SSE_DONE).toBe("[DONE]");
    expect(deltaOf("data: [DONE]")).toBe("");
  });
});
