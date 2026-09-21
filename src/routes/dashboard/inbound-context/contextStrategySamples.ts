/**
 * The two halves of the context-strategy contract, as shown beside the endpoint URL field.
 *
 * Transcribed from `api/inbound-context-strategy/index.md`. The response sample is deliberately
 * flat: its shape *is* the placeholder path, so `plan` here is `{{plan}}` in a prompt.
 */

export const CONTEXT_STRATEGY_REQUEST_SAMPLE = {
  assistant_id: "550e8400-e29b-41d4-a716-446655440000",
  assistant_name: "Support Bot",
  room_name: "550e8400_abc123",
  strategy_id: "f0f6d398-f9d9-4a7b-bc8e-4f24f57ec2de",
  strategy_name: "CRM lookup",
  strategy_type: "webhook",
  call_type: "inbound",
  service: "exotel",
  inbound_id: "9c2ad915-7d8a-4949-b8df-5fd0da91b4e6",
  caller_number: "+919876543210",
  inbound_number: "918044319240",
};

export const CONTEXT_STRATEGY_RESPONSE_SAMPLE = {
  customer_name: "John Doe",
  ticket_id: "TCK-1234",
  plan: "Enterprise",
};
