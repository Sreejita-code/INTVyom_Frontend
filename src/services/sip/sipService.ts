import { TrunkItem } from "@/types/sip";
import { ServiceResponse } from "@/types/http";

const SIP_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/sip`;

export async function callListTrunksEndpoint(userId: string): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${SIP_BASE}/list?user_id=${userId}`);
  return { ok: res.ok, json: await res.json() };
}

export const condenseListTrunksResponse = (json: unknown): TrunkItem[] => {
  if (Array.isArray(json)) return json as TrunkItem[];
  if (!json || typeof json !== "object") return [];
  const data = (json as Record<string, unknown>).data;
  return Array.isArray(data) ? (data as TrunkItem[]) : [];
};

export async function callGetTrunkDetailsEndpoint(args: {
  userId: string;
  trunkId: string;
}): Promise<unknown> {
  const res = await fetch(`${SIP_BASE}/details/${args.trunkId}?user_id=${args.userId}`);
  if (!res.ok) throw new Error("Details route not found or failed");
  return res.json();
}

export const condenseTrunkDetailsResponse = (json: unknown): unknown => {
  if (!json || typeof json !== "object") return null;
  const node = json as Record<string, unknown>;
  return node.trunk ?? node.data ?? null;
};

export async function callCreateOutboundTrunkEndpoint(payload: unknown): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${SIP_BASE}/create-outbound-trunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callDeleteTrunkEndpoint(args: {
  userId: string;
  trunkId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${SIP_BASE}/delete/${args.trunkId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: args.userId }),
  });
  return { ok: res.ok, json: await res.json() };
}
