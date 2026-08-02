export interface AudioItem {
  audio_id: string;
  audio_name: string;
  transcript?: string;
  duration_seconds?: number;
  filename?: string;
  s3_url?: string;
  is_active?: boolean;
}
