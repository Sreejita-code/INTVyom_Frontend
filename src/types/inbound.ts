export interface InboundItem {
  inbound_id: string;
  phone_number: string;
  phone_number_normalized: string;
  assistant_id: string | null;
  assistant_name: string | null;
  // Optional caller-context lookup. Null means the number routes with no webhook call.
  inbound_context_strategy_id: string | null;
  inbound_context_strategy_name: string | null;
  service: string;
  created_at?: string;
  updated_at?: string;
}

export interface InboundAssistantOption {
  assistant_id: string;
  name: string;
}
