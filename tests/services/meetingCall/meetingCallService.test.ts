import { describe, expect, it } from "vitest";

import { condenseMeetingJoinResponse } from "@/services/meetingCall/meetingCallService";

describe("condenseMeetingJoinResponse", () => {
  it("reads the documented success payload", () => {
    const json = {
      success: true,
      message: "Meeting call started successfully",
      data: {
        room_name: "meeting-room-xyz",
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        agent_dispatch: { id: "agent-dispatch-123" },
        connector_dispatch: { id: "connector-dispatch-456" },
      },
    };

    expect(condenseMeetingJoinResponse(json)).toEqual({
      roomName: "meeting-room-xyz",
      platform: "google_meet",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      agentDispatchId: "agent-dispatch-123",
      connectorDispatchId: "connector-dispatch-456",
    });
  });

  it("returns empty strings when the payload is missing or unshaped", () => {
    const empty = {
      roomName: "",
      platform: "",
      meetingUrl: "",
      agentDispatchId: "",
      connectorDispatchId: "",
    };
    expect(condenseMeetingJoinResponse({})).toEqual(empty);
    expect(condenseMeetingJoinResponse(null)).toEqual(empty);
    expect(condenseMeetingJoinResponse({ data: { room_name: 42 } })).toEqual(empty);
  });
});
