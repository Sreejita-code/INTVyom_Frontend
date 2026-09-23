/**
 * The allow-listed, non-secret keys the API returns in `trunk_config` on create, list and
 * details. The Twilio `username`/`password` are never returned, so they are not modelled here.
 */
export interface TrunkConfigSummary {
  address?: string;
  numbers?: string[];
  exotel_number?: string;
  sip_host?: string;
  sip_port?: number;
  sip_domain?: string;
}

export interface TrunkItem {
  trunk_id?: string;
  _id?: string;
  external_trunk_id?: string;
  trunk_name: string;
  trunk_type: "twilio" | "exotel";
  trunk_created_at?: string;
  createdAt?: string;
  trunk_config?: TrunkConfigSummary;
  passthrough_mode?: boolean;
  passthrough_webhook_url?: string;
}

export interface TrunkDetail {
  _id: string;
  user_id?: string;
  external_trunk_id: string;
  trunk_name: string;
  trunk_type: "twilio" | "exotel";
  trunk_config?: TrunkConfigSummary;
  passthrough_mode: boolean;
  passthrough_webhook_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExotelNumber {
  trunk_id: string;
  number: string;
  name: string;
}
