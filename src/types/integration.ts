export interface IntegrationData {
  service_type: string;
  service_name: string;
  api_key: string;
}

export interface ResyncData {
  status: "running" | "completed" | "error" | "interrupted";
  total?: number;
  processed?: number;
  succeeded?: number;
  failed?: { assistant_id: string; error: string }[];
  error?: string;
}
