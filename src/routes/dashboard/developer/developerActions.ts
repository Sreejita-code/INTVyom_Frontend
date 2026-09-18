import { RequestSpec } from "@/lib/apiSnippet";

/**
 * The documented request for each action, with example values standing in for real ids.
 *
 * These are the reference copies. The live copies — the ones built from what is actually on
 * screen — live next to the buttons that fire them (assistant, make-call, call-logs).
 */

const EXAMPLE_ASSISTANT_ID = "<assistant_id>";
const EXAMPLE_TRUNK_ID = "<trunk_id>";
const EXAMPLE_NUMBER = "+919876543210";
const EXAMPLE_MEETING_URL = "https://meet.google.com/abc-defg-hij";
const EXAMPLE_METADATA = { customer: { name: "John Doe", plan: "Enterprise" }, agent_name: "Sarah" };

const PLACEHOLDER_NOTE =
  "Keys in metadata fill the {{placeholders}} in the assistant's prompt and start instruction. Nest a value and you reference it with a dot.";

export interface DeveloperAction {
  /** Short label for the card. */
  name: string;
  /** One line on when you would call it. */
  summary: string;
  buildSpec: (userId: string) => RequestSpec;
}

export const developerActions: DeveloperAction[] = [
  {
    name: "Create an assistant",
    summary: "Define the voice, model, and prompt. The response carries the assistant_id.",
    buildSpec: (userId) => ({
      id: "assistant.create",
      title: "Create an assistant",
      note: "Keep the assistant_id from the response — every call endpoint needs it.",
      method: "POST",
      path: "/api/assistant/create",
      body: {
        user_id: userId,
        assistant_name: "Support agent",
        assistant_description: "Handles renewals",
        assistant_prompt: "You are {{agent_name}} from Acme. The customer is {{customer.name}}.",
        assistant_start_instruction: "Hi {{customer.name}}, this is {{agent_name}}.",
      },
    }),
  },
  {
    name: "Update an assistant",
    summary: "Patch one or more fields. Only what you send is merged.",
    buildSpec: (userId) => ({
      id: "assistant.update",
      title: "Update an assistant",
      note: "An explicit null clears a field; omitting it leaves the stored value alone.",
      method: "PATCH",
      path: `/api/assistant/update/${EXAMPLE_ASSISTANT_ID}`,
      body: { user_id: userId, assistant_prompt: "You are {{agent_name}} from Acme." },
    }),
  },
  {
    name: "Start a web call",
    summary: "Mint a LiveKit room token so a browser can talk to the assistant.",
    buildSpec: (userId) => ({
      id: "webCall.getToken",
      title: "Start a web call",
      note: `${PLACEHOLDER_NOTE} Pass text_only: true for a text chat instead of voice.`,
      method: "POST",
      path: "/api/web-call/get-token",
      body: {
        user_id: userId,
        assistant_id: EXAMPLE_ASSISTANT_ID,
        text_only: false,
        metadata: EXAMPLE_METADATA,
      },
    }),
  },
  {
    name: "Start an outbound call",
    summary: "Queue a phone call from an assistant over one of your SIP trunks.",
    buildSpec: (userId) => ({
      id: "call.outbound",
      title: "Start an outbound call",
      note: `${PLACEHOLDER_NOTE} The response carries a queue id you can poll.`,
      method: "POST",
      path: "/api/call/outbound",
      body: {
        user_id: userId,
        assistant_id: EXAMPLE_ASSISTANT_ID,
        trunk_id: EXAMPLE_TRUNK_ID,
        to_number: EXAMPLE_NUMBER,
        metadata: EXAMPLE_METADATA,
      },
    }),
  },
  {
    name: "Check a call's queue status",
    summary: "Poll until the queued call reports dispatched or failed.",
    buildSpec: (userId) => ({
      id: "call.queueStatus",
      title: "Check a call's queue status",
      method: "GET",
      path: "/api/call/queue/<queue_id>",
      query: { user_id: userId },
    }),
  },
  {
    name: "Start a passthrough call",
    summary: "Dial a number over a trunk with no assistant attached.",
    buildSpec: (userId) => ({
      id: "passthroughCall.outbound",
      title: "Start a passthrough call",
      note: "There is no assistant on a passthrough call, so metadata only tags the call record.",
      method: "POST",
      path: "/api/passthrough-call/passthrough-outbound",
      body: {
        user_id: userId,
        trunk_id: EXAMPLE_TRUNK_ID,
        to_number: EXAMPLE_NUMBER,
        metadata: { campaign: "renewals" },
      },
    }),
  },
  {
    name: "Join a Google Meet call",
    summary: "Send the assistant into a meeting as a bot participant.",
    buildSpec: (userId) => ({
      id: "meetingCall.join",
      title: "Join a Google Meet call",
      note: "The LiveKit connector service and the agent worker must both be running, or nothing joins the meeting. " + PLACEHOLDER_NOTE,
      method: "POST",
      path: "/api/meeting-call/join",
      body: {
        user_id: userId,
        assistant_id: EXAMPLE_ASSISTANT_ID,
        meeting_url: EXAMPLE_MEETING_URL,
        platform: "google_meet",
        bot_display_name: "Meeting Assistant",
        metadata: EXAMPLE_METADATA,
      },
    }),
  },
  {
    name: "List call logs",
    summary: "Read past calls for an assistant, with transcripts and usage.",
    buildSpec: (userId) => ({
      id: "assistant.callLogs",
      title: "List an assistant's call logs",
      note: "Dates are ISO timestamps; limit is capped at 100 upstream.",
      method: "GET",
      path: `/api/assistant/call-logs/${EXAMPLE_ASSISTANT_ID}`,
      query: {
        user_id: userId,
        page: 1,
        limit: 50,
        sort_by: "started_at",
        sort_order: "desc",
      },
    }),
  },
];
