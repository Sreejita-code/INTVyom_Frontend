import { CallRecord } from "@/types/passthroughCall";

const PASSTHROUGH_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/passthrough-call`;

export async function callCallRecordsEndpoint(params: URLSearchParams): Promise<unknown> {
  const res = await fetch(`${PASSTHROUGH_BASE}/call-records?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to fetch records");
  }
  return json;
}

export const condenseCallRecordsResponse = (json: unknown): {
  records: CallRecord[];
  total: number;
} => {
  if (!json || typeof json !== "object") return { records: [], total: 0 };

  const data = (json as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return { records: [], total: 0 };

  const node = data as Record<string, unknown>;
  const records = Array.isArray(node.records) ? (node.records as CallRecord[]) : [];
  const pagination = node.pagination && typeof node.pagination === "object"
    ? (node.pagination as Record<string, unknown>)
    : {};
  const total = typeof pagination.total === "number" ? pagination.total : records.length;

  return { records, total };
};

export async function callPassthroughOutboundEndpoint(payload: unknown): Promise<unknown> {
  const res = await fetch(`${PASSTHROUGH_BASE}/passthrough-outbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to initiate call");
  }
  return json;
}

export const condensePassthroughOutboundResponse = (json: unknown): { roomToken: string } => {
  if (!json || typeof json !== "object") return { roomToken: "" };
  const node = json as Record<string, unknown>;
  const data = node.data && typeof node.data === "object" ? (node.data as Record<string, unknown>) : {};
  return { roomToken: (data.room_token as string) ?? (node.room_token as string) ?? "" };
};
