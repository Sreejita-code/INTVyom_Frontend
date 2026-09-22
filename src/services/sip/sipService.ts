import { TrunkItem } from "@/types/sip";
import { ServiceResponse } from "@/types/http";
import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";

const SIP_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/sip`;

export async function callListTrunksEndpoint(): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${SIP_BASE}/list`);
  return { ok: res.ok, json: await readJson(res) };
}

export const condenseListTrunksResponse = (json: unknown): TrunkItem[] => {
  if (Array.isArray(json)) return json as TrunkItem[];
  if (!json || typeof json !== "object") return [];
  const data = (json as Record<string, unknown>).data;
  return Array.isArray(data) ? (data as TrunkItem[]) : [];
};

export async function callGetTrunkDetailsEndpoint(args: {
  trunkId: string;
}): Promise<unknown> {
  const res = await authedFetch(`${SIP_BASE}/details/${args.trunkId}`);
  if (!res.ok) throw new Error("Details route not found or failed");
  return readJson(res);
}

export const condenseTrunkDetailsResponse = (json: unknown): unknown => {
  if (!json || typeof json !== "object") return null;
  const node = json as Record<string, unknown>;
  return node.trunk ?? node.data ?? null;
};

export async function callCreateOutboundTrunkEndpoint(payload: unknown): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${SIP_BASE}/create-outbound-trunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await readJson(res) };
}

export async function callDeleteTrunkEndpoint(args: {
  trunkId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${SIP_BASE}/delete/${args.trunkId}`, { method: "DELETE" });
  return { ok: res.ok, json: await readJson(res) };
}
