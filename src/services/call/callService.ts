import { ServiceResponse } from "@/types/http";

const CALL_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/call`;

export async function callOutboundEndpoint(payload: {
  user_id: string;
  assistant_id: string;
  trunk_id: string;
  to_number: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${CALL_BASE}/outbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}
