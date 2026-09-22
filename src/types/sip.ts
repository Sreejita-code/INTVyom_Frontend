/**
 * The non-secret half of a trunk's config. The API deliberately withholds the Twilio
 * `username`/`password` (and never documents them in a list response), so they are not modelled
 * here — a trunk read from the API has no credential fields to show.
 */
export interface TrunkConfigSummary {
  address?: string;
  numbers?: string[];
  exotel_number?: string;
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
  /** Present only when the deployment returns the non-secret keys; never carries credentials. */
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
