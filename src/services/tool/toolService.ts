import { ToolSummary } from "@/types/tool";
import { ServiceResponse } from "@/types/http";

const TOOL_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/tool`;

export async function callListToolsEndpoint(userId: string): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${TOOL_BASE}/list?user_id=${userId}`);
  return { ok: res.ok, json: await res.json() };
}

export const condenseListToolsResponse = (json: unknown): ToolSummary[] => {
  if (!json || typeof json !== "object") return [];
  return Array.isArray((json as Record<string, unknown>).data)
    ? ((json as Record<string, unknown>).data as ToolSummary[])
    : [];
};

export async function callGetToolDetailsEndpoint(args: {
  userId: string;
  toolId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${TOOL_BASE}/details/${args.toolId}?user_id=${args.userId}`);
  return { ok: res.ok, json: await res.json() };
}

export async function callDeleteToolEndpoint(args: {
  userId: string;
  toolId: string;
}): Promise<unknown> {
  const res = await fetch(`${TOOL_BASE}/delete/${args.toolId}?user_id=${args.userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  return res.json();
}

export async function callCreateToolEndpoint(payload: unknown): Promise<unknown> {
  const res = await fetch(`${TOOL_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Operation failed");
  return json;
}

export async function callUpdateToolEndpoint(toolId: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${TOOL_BASE}/update/${toolId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Operation failed");
  return json;
}

export async function callToggleToolAttachmentEndpoint(args: {
  userId: string;
  assistantId: string;
  toolIds: string[];
  attach: boolean;
}): Promise<unknown> {
  const endpoint = args.attach ? "attach" : "detach";
  const res = await fetch(`${TOOL_BASE}/${endpoint}/${args.assistantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: args.userId, tool_ids: args.toolIds }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || `Failed to ${endpoint} tool`);
  return json;
}
