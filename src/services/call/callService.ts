import { ServiceResponse } from "@/types/http";

const CALL_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/call`;

export async function callOutboundEndpoint(payload: {
  user_id: string;
  assistant_id: string;
  trunk_id: string;
  to_number: string;
  /** Fills the `{{placeholders}}` in the assistant's prompt and opening line. Omit when empty. */
  metadata?: Record<string, unknown>;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${CALL_BASE}/outbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

/** Dispatch progress for a queued outbound call: pending → dispatching → dispatched, or failed. */
export async function callQueueStatusEndpoint(
  queueId: string,
  userId: string,
): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${CALL_BASE}/queue/${encodeURIComponent(queueId)}?user_id=${encodeURIComponent(userId)}`);
  return { ok: res.ok, json: await res.json() };
}

/** First string found at any of these paths. The backend nests queue fields inconsistently. */
const pluck = (json: unknown, paths: string[][]): string => {
  for (const path of paths) {
    let node: unknown = json;
    for (const key of path) {
      if (!node || typeof node !== "object") { node = undefined; break; }
      node = (node as Record<string, unknown>)[key];
    }
    if (typeof node === "string") return node;
  }
  return "";
};

/** The `queue_id` the outbound response carries, wherever the backend happens to nest it. */
export const condenseOutboundQueueId = (json: unknown): string =>
  pluck(json, [["queue_id"], ["data", "queue_id"], ["data", "data", "queue_id"]]);

/** The queue lifecycle status: pending, dispatching, dispatched, or failed. */
export const condenseQueueStatus = (json: unknown): string =>
  pluck(json, [["status"], ["data", "status"], ["data", "queue_status"], ["queue_status"]]);
