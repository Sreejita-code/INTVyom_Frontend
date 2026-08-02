export interface TrunkItem {
  trunk_id?: string;
  _id?: string;
  external_trunk_id?: string;
  trunk_name: string;
  trunk_type: "twilio" | "exotel";
  trunk_created_at?: string;
  createdAt?: string;
  trunk_config?: {
    exotel_number?: string;
  };
  passthrough_mode?: boolean;
  passthrough_webhook_url?: string;
}

export interface TrunkDetail {
  _id: string;
  user_id: string;
  external_trunk_id: string;
  trunk_name: string;
  trunk_type: "twilio" | "exotel";
  trunk_config: {
    address?: string;
    numbers?: string[];
    username?: string;
    password?: string;
    exotel_number?: string;
  };
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
