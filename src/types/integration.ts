export interface IntegrationData {
  service_type: string;
  service_name: string;
  /** The full key is never kept in the browser. */
  api_key_last4: string;
}

export interface ResyncData {
  status: "running" | "completed" | "error" | "interrupted";
  total?: number;
  processed?: number;
  succeeded?: number;
  failed?: { assistant_id: string; error: string }[];
  error?: string;
}
