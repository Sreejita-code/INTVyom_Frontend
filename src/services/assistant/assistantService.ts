import { AssistantItem, AssistantMode, AssistantSummary } from "@/types/assistant";
import { ServiceResponse } from "@/types/http";

const ASSISTANT_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/assistant`;

export async function callListAssistantsEndpoint(args: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<ServiceResponse<unknown>> {
  const query = new URLSearchParams({ user_id: args.userId });
  if (args.page != null) query.set("page", String(args.page));
  if (args.limit != null) query.set("limit", String(args.limit));
  const res = await fetch(`${ASSISTANT_BASE}/list?${query.toString()}`);
  return { ok: res.ok, json: await res.json() };
}

export const condenseListAssistantsResponse = (json: unknown): AssistantSummary[] => {
  if (!json) return [];

  const node = json as Record<string, unknown>;
  const data = node.data && typeof node.data === "object" ? (node.data as Record<string, unknown>) : null;

  let list: AssistantItem[] | undefined;
  if (Array.isArray(data?.assistants)) list = data.assistants as AssistantItem[];
  else if (Array.isArray(data?.logs)) list = data.logs as AssistantItem[];
  else if (Array.isArray(data)) list = data as AssistantItem[];
  else if (Array.isArray(node.assistants)) list = node.assistants as AssistantItem[];
  else if (Array.isArray(json)) list = json as AssistantItem[];

  return (list ?? []).map((item) => {
    const raw = (item || {}) as Record<string, unknown>;
    const mode: AssistantMode =
      raw.assistant_mode === "realtime"
        ? "realtime"
        : raw.assistant_mode === "cascade"
          ? "cascade"
          : "pipeline";
    return {
      ...item,
      assistant_id: String(raw.assistant_id || raw.external_assistant_id || raw._id || raw.id || ""),
      assistant_name: String(raw.assistant_name || raw.name || "Unnamed Assistant"),
      assistant_mode: mode,
    };
  });
};

export async function callGetAssistantDetailsEndpoint(args: {
  userId: string;
  assistantId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${ASSISTANT_BASE}/details/${args.assistantId}?user_id=${args.userId}`);
  return { ok: res.ok, json: await res.json() };
}

export const condenseAssistantDetailsResponse = (json: unknown): unknown => {
  if (!json || typeof json !== "object") return null;
  const node = json as Record<string, unknown>;
  return node.data ?? null;
};

export async function callDeleteAssistantEndpoint(args: {
  userId: string;
  assistantId: string;
}): Promise<unknown> {
  const res = await fetch(`${ASSISTANT_BASE}/delete/${args.assistantId}?user_id=${args.userId}`, {
    method: "DELETE",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Failed to delete assistant");
  return json;
}

export async function callCreateAssistantEndpoint(payload: unknown): Promise<unknown> {
  const res = await fetch(`${ASSISTANT_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Operation failed");
  return json;
}

export async function callUpdateAssistantEndpoint(assistantId: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${ASSISTANT_BASE}/update/${assistantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Operation failed");
  return json;
}

export async function callGetAssistantCallLogsEndpoint(args: {
  userId: string;
  assistantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<unknown> {
  const queryParams = new URLSearchParams({
    user_id: args.userId,
    page: String(args.page),
    limit: String(args.limit),
    sort_by: args.sortBy,
    sort_order: args.sortOrder,
  });

  if (args.startDate) {
    const start = new Date(args.startDate);
    start.setHours(0, 0, 0, 0);
    queryParams.append("start_date", start.toISOString());
  }
  if (args.endDate) {
    const end = new Date(args.endDate);
    end.setHours(23, 59, 59, 999);
    queryParams.append("end_date", end.toISOString());
  }

  const res = await fetch(`${ASSISTANT_BASE}/call-logs/${args.assistantId}?${queryParams.toString()}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.message || "Failed to fetch logs");
  }

  return json;
}

export const condenseCallLogsResponse = (json: unknown) => {
  if (!json || typeof json !== "object") return { logs: [], totalPages: 1, total: 0 };
  const node = json as Record<string, unknown>;
  if (!node.data || typeof node.data !== "object") return { logs: [], totalPages: 1, total: 0 };

  const data = node.data as Record<string, unknown>;
  const pagination = data.pagination && typeof data.pagination === "object"
    ? (data.pagination as Record<string, unknown>)
    : {};

  return {
    logs: Array.isArray(data.logs) ? data.logs : [],
    totalPages: typeof pagination.total_pages === "number" ? pagination.total_pages : 1,
    total: typeof pagination.total === "number" ? pagination.total : 0,
  };
};
