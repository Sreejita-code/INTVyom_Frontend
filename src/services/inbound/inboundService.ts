import { ServiceResponse } from "@/types/http";

const INBOUND_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/inbound`;

export async function callListInboundMappingsEndpoint(userId: string): Promise<unknown> {
  const res = await fetch(`${INBOUND_BASE}/list?user_id=${userId}`);
  return res.json();
}

export const condenseListInboundMappingsResponse = (json: unknown): unknown[] => {
  if (!json || typeof json !== "object") return [];
  const data = (json as Record<string, unknown>).data;
  return Array.isArray(data) ? data : [];
};

export async function callAssignInboundEndpoint(payload: unknown): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_BASE}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callUpdateInboundMappingEndpoint(
  inboundId: string,
  payload: unknown
): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_BASE}/update/${inboundId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callDetachInboundEndpoint(args: {
  userId: string;
  inboundId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_BASE}/detach/${args.inboundId}?user_id=${args.userId}`, {
    method: "POST",
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callDeleteInboundMappingEndpoint(args: {
  userId: string;
  inboundId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_BASE}/delete/${args.inboundId}?user_id=${args.userId}`, {
    method: "DELETE",
  });
  return { ok: res.ok, json: await res.json() };
}
