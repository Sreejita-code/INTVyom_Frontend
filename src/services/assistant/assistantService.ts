import { AssistantCallLogsPage, AssistantItem, AssistantMode, AssistantSummary } from "@/types/assistant";
import { CallLog, CallTranscript, CallUsage, CallUsageLine } from "@/types/callLog";
import { ServiceResponse } from "@/types/http";
import { parseUsd } from "@/lib/formatUsd";
import { authedFetch } from "@/services/auth/authedFetch";

const ASSISTANT_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/assistant`;

export async function callListAssistantsEndpoint(args: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<ServiceResponse<unknown>> {
  const query = new URLSearchParams({ user_id: args.userId });
  if (args.page != null) query.set("page", String(args.page));
  if (args.limit != null) query.set("limit", String(args.limit));
  const res = await authedFetch(`${ASSISTANT_BASE}/list?${query.toString()}`);
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
  const res = await authedFetch(`${ASSISTANT_BASE}/details/${args.assistantId}?user_id=${args.userId}`);
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
  const res = await authedFetch(`${ASSISTANT_BASE}/delete/${args.assistantId}?user_id=${args.userId}`, {
    method: "DELETE",
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || "Failed to delete assistant");
  return json;
}

export async function callCreateAssistantEndpoint(payload: unknown): Promise<unknown> {
  const res = await authedFetch(`${ASSISTANT_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    // Enhanced error handling with validation details
    if (json.validation_errors) {
      const errorMessages = Object.entries(json.validation_errors)
        .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
        .join("; ");
      throw new Error(`Validation failed - ${errorMessages}`);
    }
    throw new Error(json.error || json.message || "Operation failed");
  }
  return json;
}

export async function callUpdateAssistantEndpoint(assistantId: string, payload: unknown): Promise<unknown> {
  const res = await authedFetch(`${ASSISTANT_BASE}/update/${assistantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    // Enhanced error handling with validation details
    if (json.validation_errors) {
      const errorMessages = Object.entries(json.validation_errors)
        .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
        .join("; ");
      throw new Error(`Validation failed - ${errorMessages}`);
    }
    throw new Error(json.error || json.message || "Operation failed");
  }
  return json;
}

export interface AssistantCallLogsQuery {
  userId: string;
  assistantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * The query string for the call-logs endpoint. Exported so the developer snippet on the page can
 * show the same dates the request uses — a picked day means the whole day, not midnight.
 */
export function buildAssistantCallLogsQuery(args: AssistantCallLogsQuery): Record<string, string> {
  const query: Record<string, string> = {
    user_id: args.userId,
    page: String(args.page),
    limit: String(args.limit),
    sort_by: args.sortBy,
    sort_order: args.sortOrder,
  };

  if (args.startDate) {
    const start = new Date(args.startDate);
    start.setHours(0, 0, 0, 0);
    query.start_date = start.toISOString();
  }
  if (args.endDate) {
    const end = new Date(args.endDate);
    end.setHours(23, 59, 59, 999);
    query.end_date = end.toISOString();
  }

  return query;
}

export async function callGetAssistantCallLogsEndpoint(args: AssistantCallLogsQuery): Promise<unknown> {
  const queryParams = new URLSearchParams(buildAssistantCallLogsQuery(args));

  const res = await authedFetch(`${ASSISTANT_BASE}/call-logs/${args.assistantId}?${queryParams.toString()}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.message || "Failed to fetch logs");
  }

  return json;
}

const asFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const condenseUsageLine = (raw: unknown): CallUsageLine | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const typeRaw = asString(row.type);
  return {
    type: typeRaw.replace(/_usage$/, "") || "other",
    provider: asString(row.provider),
    model: asString(row.model),
    estimatedCostUsd: parseUsd(row.estimated_cost_usd),
    inputTokens: asFiniteNumber(row.input_tokens),
    outputTokens: asFiniteNumber(row.output_tokens),
    charactersCount: asFiniteNumber(row.characters_count),
    audioDuration: asFiniteNumber(row.audio_duration),
  };
};

const condenseCallUsage = (raw: unknown): CallUsage | null => {
  if (!raw || typeof raw !== "object") return null;
  const node = raw as Record<string, unknown>;
  const unpriced = Array.isArray(node.unpriced_model_usage) ? node.unpriced_model_usage : [];
  const lines = Array.isArray(node.model_usage)
    ? node.model_usage.map(condenseUsageLine).filter((line): line is CallUsageLine => line !== null)
    : [];
  return {
    estimatedCostUsd: parseUsd(node.estimated_cost_usd),
    pricingComplete: node.pricing_complete === true && unpriced.length === 0,
    usageFinalized: node.usage_finalized === true,
    lines,
  };
};

const condenseCallLog = (raw: unknown): CallLog | null => {
  if (!raw || typeof raw !== "object") return null;
  const node = raw as Record<string, unknown>;
  if (typeof node.started_at !== "string") return null;

  const transcripts = Array.isArray(node.transcripts)
    ? node.transcripts.filter(
        (item): item is CallTranscript => !!item && typeof item === "object",
      )
    : undefined;

  const metadata =
    node.metadata && typeof node.metadata === "object" && !Array.isArray(node.metadata)
      ? (node.metadata as Record<string, unknown>)
      : undefined;

  const reasonRaw = node.call_status_reason;
  const sipTextRaw = node.sip_status_text;
  const answeredRaw = node.answered_at;
  const endedRaw = node.ended_at;

  return {
    started_at: node.started_at,
    to_number: typeof node.to_number === "string" ? node.to_number : undefined,
    platform_number: typeof node.platform_number === "string" ? node.platform_number : null,
    call_type: typeof node.call_type === "string" ? node.call_type : undefined,
    call_service: typeof node.call_service === "string" ? node.call_service : null,
    is_passthrough: node.is_passthrough === true,
    call_status: typeof node.call_status === "string" ? node.call_status : undefined,
    call_status_reason: typeof reasonRaw === "string" ? reasonRaw : null,
    sip_status_code: asFiniteNumber(node.sip_status_code) ?? null,
    sip_status_text: typeof sipTextRaw === "string" ? sipTextRaw : null,
    answered_at: typeof answeredRaw === "string" ? answeredRaw : null,
    ended_at: typeof endedRaw === "string" ? endedRaw : null,
    call_duration_minutes: asFiniteNumber(node.call_duration_minutes),
    recording_path: typeof node.recording_path === "string" ? node.recording_path : null,
    transcripts,
    metadata,
    usage: condenseCallUsage(node.usage),
  };
};

export const condenseCallLogsResponse = (json: unknown): AssistantCallLogsPage => {
  if (!json || typeof json !== "object") return { logs: [], totalPages: 1, total: 0 };
  const node = json as Record<string, unknown>;
  if (!node.data || typeof node.data !== "object") return { logs: [], totalPages: 1, total: 0 };

  const data = node.data as Record<string, unknown>;
  const pagination = data.pagination && typeof data.pagination === "object"
    ? (data.pagination as Record<string, unknown>)
    : {};

  return {
    logs: Array.isArray(data.logs)
      ? data.logs.map(condenseCallLog).filter((log): log is CallLog => log !== null)
      : [],
    totalPages: typeof pagination.total_pages === "number" ? pagination.total_pages : 1,
    total: typeof pagination.total === "number" ? pagination.total : 0,
  };
};
