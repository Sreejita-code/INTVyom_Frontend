import { ToolSummary } from "@/types/tool";
import { ServiceResponse } from "@/types/http";
import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";

const TOOL_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/tool`;

export async function callListToolsEndpoint(): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${TOOL_BASE}/list`);
  return { ok: res.ok, json: await readJson(res) };
}

export const condenseListToolsResponse = (json: unknown): ToolSummary[] => {
  if (!json || typeof json !== "object") return [];
  return Array.isArray((json as Record<string, unknown>).data)
    ? ((json as Record<string, unknown>).data as ToolSummary[])
    : [];
};

export async function callGetToolDetailsEndpoint(args: {
  toolId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await authedFetch(`${TOOL_BASE}/details/${args.toolId}`);
  return { ok: res.ok, json: await readJson(res) };
}

export async function callDeleteToolEndpoint(args: {
  toolId: string;
}): Promise<unknown> {
  const res = await authedFetch(`${TOOL_BASE}/delete/${args.toolId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return readJson(res);
}

export async function callCreateToolEndpoint(payload: unknown): Promise<unknown> {
  const res = await authedFetch(`${TOOL_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || json.message || "Operation failed");
  return json;
}

export async function callUpdateToolEndpoint(toolId: string, payload: unknown): Promise<unknown> {
  const res = await authedFetch(`${TOOL_BASE}/update/${toolId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || json.message || "Operation failed");
  return json;
}

export async function callToggleToolAttachmentEndpoint(args: {
  assistantId: string;
  toolIds: string[];
  attach: boolean;
}): Promise<unknown> {
  const endpoint = args.attach ? "attach" : "detach";
  const res = await authedFetch(`${TOOL_BASE}/${endpoint}/${args.assistantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool_ids: args.toolIds }),
  });

  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || json.message || `Failed to ${endpoint} tool`);
  return json;
}
