/** Server-Sent Events frames: `data:` lines separated by a blank line. Pure, so it can be tested without a stream. */

export const SSE_DONE = "[DONE]";

/** Splits complete frames off the buffer; `rest` is the unfinished tail to prepend to the next chunk. */
export function parseSseChunk(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? "";
  return { events: parts.filter((part) => part.trim().length > 0), rest };
}

/** The text delta of one frame, or `""` for anything that is not a chat delta. */
export function deltaOf(event: string): string {
  const payload = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
  if (!payload || payload === SSE_DONE) return "";
  try {
    const parsed = JSON.parse(payload) as { choices?: { delta?: { content?: unknown } }[] };
    const content = parsed.choices?.[0]?.delta?.content;
    return typeof content === "string" ? content : "";
  } catch {
    return "";
  }
}
