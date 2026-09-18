import { MeetingJoinResult } from "@/types/meetingCall";
import { ServiceResponse } from "@/types/http";

const MEETING_CALL_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/meeting-call`;

/**
 * Sends an assistant into a meeting as a bot participant.
 *
 * The LiveKit connector service and the agent worker both have to be running for the bot to
 * actually appear in the meeting — this endpoint only dispatches them.
 */
export async function callJoinMeetingEndpoint(payload: {
  user_id: string;
  assistant_id: string;
  meeting_url: string;
  /** Defaults to `google_meet` on the backend; the only platform documented today. */
  platform?: string;
  /** Name the bot shows under in the meeting's participant list. */
  bot_display_name?: string;
  /** Fills the `{{placeholders}}` in the assistant's prompt, exactly as on an outbound call. */
  metadata?: Record<string, unknown>;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${MEETING_CALL_BASE}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

const str = (node: Record<string, unknown>, key: string): string =>
  typeof node[key] === "string" ? (node[key] as string) : "";

const nested = (node: Record<string, unknown>, key: string): Record<string, unknown> =>
  node[key] && typeof node[key] === "object" ? (node[key] as Record<string, unknown>) : {};

/** The room and the two dispatches the join response carries, with missing fields as "". */
export const condenseMeetingJoinResponse = (json: unknown): MeetingJoinResult => {
  const node = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const data = nested(node, "data");
  return {
    roomName: str(data, "room_name"),
    platform: str(data, "platform"),
    meetingUrl: str(data, "meeting_url"),
    agentDispatchId: str(nested(data, "agent_dispatch"), "id"),
    connectorDispatchId: str(nested(data, "connector_dispatch"), "id"),
  };
};
