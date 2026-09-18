/** What a successful `POST /api/meeting-call/join` tells us about the bot we just dispatched. */
export interface MeetingJoinResult {
  roomName: string;
  platform: string;
  meetingUrl: string;
  agentDispatchId: string;
  connectorDispatchId: string;
}
