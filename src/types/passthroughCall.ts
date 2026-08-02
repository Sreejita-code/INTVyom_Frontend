export interface CallRecord {
  room_name?: string;
  queue_id?: string;
  assistant_id?: string | null;
  assistant_name?: string | null;
  is_passthrough?: boolean;
  to_number?: string;
  call_status?: string;
  call_status_reason?: string | null;
  answered_at?: string | null;
  recording_path?: string | null;
  recording_egress_id?: string;
  started_at?: string;
  ended_at?: string;
  call_duration_minutes?: number;
  billable_duration_minutes?: number;
}

export interface PassthroughCallInitiation {
  roomToken: string;
}
