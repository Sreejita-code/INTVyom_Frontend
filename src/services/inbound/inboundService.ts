import { ServiceResponse } from "@/types/http";
import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";

const INBOUND_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/inbound`;

export async function callListInboundMappingsEndpoint(): Promise<unknown> {
  const res = await authedFetch(`${INBOUND_BASE}/list`);
  return readJson(res);
}

export const condenseListInboundMappingsResponse = (json: unknown): unknown[] => {
  if (!json || typeof json !== "object") return [];
  const data = (json as Record<string, unknown>).data;
  return Array.isArray(data) ? data : [];
};

export async function callAssignInboundEndpoint(payload: unknown): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${INBOUND_BASE}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await readJson(res) };
}

export async function callUpdateInboundMappingEndpoint(
  inboundId: string,
  payload: unknown
): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${INBOUND_BASE}/update/${inboundId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await readJson(res) };
}

export async function callDetachInboundEndpoint(args: {
  inboundId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${INBOUND_BASE}/detach/${args.inboundId}`, {
    method: "POST",
  });
  return { ok: res.ok, json: await readJson(res) };
}

export async function callDeleteInboundMappingEndpoint(args: {
  inboundId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${INBOUND_BASE}/delete/${args.inboundId}`, {
    method: "DELETE",
  });
  return { ok: res.ok, json: await readJson(res) };
}
