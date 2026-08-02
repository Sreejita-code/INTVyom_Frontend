import {
  AnalyticsFilters,
  AssistantBreakdownItem,
  DashboardMetrics,
  PhoneBreakdownItem,
  PlatformBillableItem,
  ServiceBreakdownItem,
  TimeSeriesPoint,
} from "@/types/analytics";

const ANALYTICS_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/analytics`;

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const parseString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
};

const isWebCallLabel = (value: string) => /web\s*call/i.test(value);

const toCanonicalPhoneNumber = (rawValue: string) => {
  const normalizedRaw = rawValue.trim();
  if (!normalizedRaw) return "Unknown";

  if (isWebCallLabel(normalizedRaw)) {
    return "Web Call";
  }

  const cleaned = normalizedRaw.replace(/[=\s()-]/g, "");
  const digitsOnly = cleaned.replace(/\D/g, "");

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return `+91${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 14 && digitsOnly.startsWith("0091")) {
    return `+91${digitsOnly.slice(4)}`;
  }

  if (cleaned.startsWith("+") && digitsOnly.length > 0) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length > 0) {
    return cleaned;
  }

  return normalizedRaw;
};

const extractDataNode = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === "object") return root.data as Record<string, unknown>;
  return root;
};

const extractArray = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const node = payload as Record<string, unknown>;
  const candidateKeys = ["items", "results", "rows", "list", "data", "breakdown", "series", "calls"];

  for (const key of candidateKeys) {
    if (Array.isArray(node[key])) return node[key] as unknown[];
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) return value as unknown[];
  }

  return [];
};

export const buildAnalyticsQueryParams = (
  filters: AnalyticsFilters,
  options: { includeGranularity?: boolean; includeAssistantId?: boolean } = {}
) => {
  const query = new URLSearchParams({
    user_id: filters.userId,
    start_date: filters.startDate.toISOString(),
    end_date: filters.endDate.toISOString(),
  });

  if (options.includeGranularity) {
    query.set("granularity", filters.granularity);
  }

  if (options.includeAssistantId && filters.assistantId) {
    query.set("assistant_id", filters.assistantId);
  }

  return query;
};

export const getDefaultAnalyticsDateRange = (now = new Date()) => {
  const endDate = new Date(now);
  const startDate = new Date(now);

  // Use UTC boundaries to avoid timezone drift between client and API.
  startDate.setUTCDate(startDate.getUTCDate() - 30);
  startDate.setUTCHours(0, 0, 0, 0);

  return { startDate, endDate };
};

const requestAnalytics = async (path: string, query: URLSearchParams) => {
  const response = await fetch(`${ANALYTICS_BASE}${path}?${query.toString()}`);
  const json = await response.json();

  if (!response.ok) {
    const message =
      (json && (json.error || json.message)) || `Failed to fetch analytics (${response.status})`;
    throw new Error(message);
  }

  return json;
};

export const condenseDashboardMetricsResponse = (payload: unknown): DashboardMetrics => {
  const data = extractDataNode(payload);

  return {
    totalCalls: parseNumber(data.total_calls ?? data.totalCalls ?? data.calls_total),
    totalDurationMinutes: parseNumber(
      data.total_duration_minutes ?? data.totalDurationMinutes ?? data.duration_minutes_total
    ),
    totalDurationHours: parseNumber(
      data.total_duration_hours ?? data.totalDurationHours ?? data.duration_hours_total
    ),
    avgDurationMinutes: parseNumber(
      data.avg_duration_minutes ??
        data.average_duration_minutes ??
        data.avgDurationMinutes ??
        data.averageCallDurationMinutes
    ),
    callsToday: parseNumber(data.calls_today ?? data.callsToday),
    callsThisWeek: parseNumber(data.calls_this_week ?? data.callsThisWeek),
    callsThisMonth: parseNumber(data.calls_this_month ?? data.callsThisMonth),
  };
};

export const condenseAssistantBreakdownResponse = (payload: unknown): AssistantBreakdownItem[] => {
  const data = extractDataNode(payload);
  const rows = extractArray(data);

  return rows.map((row, index) => {
    const item = (row || {}) as Record<string, unknown>;
    const assistantId = parseString(item.assistant_id ?? item.assistantId ?? item._id ?? `assistant-${index}`);
    const assistantName = parseString(
      item.assistant_name ?? item.assistantName ?? item.name ?? `Assistant ${index + 1}`,
      `Assistant ${index + 1}`
    );

    return {
      assistantId,
      assistantName,
      callCount: parseNumber(item.call_count ?? item.calls ?? item.total_calls ?? item.count),
    };
  });
};

export const condensePhoneBreakdownResponse = (payload: unknown): PhoneBreakdownItem[] => {
  const data = extractDataNode(payload);
  const rows = extractArray(data);
  const merged = new Map<
    string,
    {
      phoneNumber: string;
      callCount: number;
      totalDurationMinutes: number;
      totalDurationHours: number;
      avgDurationMinutes: number;
    }
  >();

  for (const row of rows) {
    const item = (row || {}) as Record<string, unknown>;
    const rawPhone = parseString(item.phone_number ?? item.phoneNumber ?? item.to_number ?? item.number, "Unknown");
    const canonicalPhone = toCanonicalPhoneNumber(rawPhone);
    const callCount = parseNumber(item.call_count ?? item.calls ?? item.total_calls ?? item.count);
    const totalDurationMinutes = parseNumber(
      item.total_duration_minutes ?? item.totalDurationMinutes ?? item.duration_minutes_total
    );
    const totalDurationHours = parseNumber(item.total_duration_hours ?? item.totalDurationHours ?? item.duration_hours_total);

    const existing = merged.get(canonicalPhone);
    if (!existing) {
      merged.set(canonicalPhone, {
        phoneNumber: canonicalPhone,
        callCount,
        totalDurationMinutes,
        totalDurationHours,
        avgDurationMinutes: 0,
      });
      continue;
    }

    existing.callCount += callCount;
    existing.totalDurationMinutes += totalDurationMinutes;
    existing.totalDurationHours += totalDurationHours;
  }

  return Array.from(merged.values()).map((item) => ({
    ...item,
    avgDurationMinutes: item.callCount > 0 ? item.totalDurationMinutes / item.callCount : 0,
  }));
};

export const condenseTimeSeriesResponse = (payload: unknown): TimeSeriesPoint[] => {
  const data = extractDataNode(payload);
  const rows = extractArray(data);

  return rows.map((row, index) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      bucket: parseString(
        item.bucket ?? item.time_bucket ?? item.time ?? item.date ?? item.timestamp,
        `Bucket ${index + 1}`
      ),
      callCount: parseNumber(item.call_count ?? item.calls ?? item.total_calls ?? item.count),
    };
  });
};

export const condenseServiceBreakdownResponse = (payload: unknown): ServiceBreakdownItem[] => {
  const data = extractDataNode(payload);
  const rows = extractArray(data);

  return rows.map((row, index) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      service: parseString(item.service ?? item.provider ?? item.service_name ?? `Service ${index + 1}`),
      callCount: parseNumber(item.call_count ?? item.calls ?? item.total_calls ?? item.count),
    };
  });
};

export const condensePlatformBillableResponse = (payload: unknown): PlatformBillableItem[] => {
  const data = extractDataNode(payload);
  const rows = extractArray(data.platform_wise_minutes || data);

  return rows.map((row, index) => {
    const item = (row || {}) as Record<string, unknown>;
    return {
      platformNumber: parseString(item.platform_number ?? `Platform ${index + 1}`),
      totalBillableMinutes: parseNumber(item.total_billable_minutes ?? 0),
    };
  });
};

export async function callDashboardMetricsEndpoint(filters: AnalyticsFilters): Promise<unknown> {
  const query = buildAnalyticsQueryParams(filters);
  return requestAnalytics("/dashboard", query);
}

export async function callCallsByAssistantEndpoint(filters: AnalyticsFilters): Promise<unknown> {
  const query = buildAnalyticsQueryParams(filters);
  return requestAnalytics("/calls/by-assistant", query);
}

export async function callCallsByPhoneNumberEndpoint(filters: AnalyticsFilters): Promise<unknown> {
  const query = buildAnalyticsQueryParams(filters, { includeAssistantId: true });
  return requestAnalytics("/calls/by-phone-number", query);
}

export async function callCallsByTimeEndpoint(filters: AnalyticsFilters): Promise<unknown> {
  const query = buildAnalyticsQueryParams(filters, { includeGranularity: true, includeAssistantId: true });
  return requestAnalytics("/calls/by-time", query);
}

export async function callCallsByServiceEndpoint(filters: AnalyticsFilters): Promise<unknown> {
  const query = buildAnalyticsQueryParams(filters);
  return requestAnalytics("/calls/by-service", query);
}

export async function callPlatformBillableMinutesEndpoint(filters: AnalyticsFilters): Promise<unknown> {
  const query = new URLSearchParams({
    user_id: filters.userId,
  });
  if (filters.startDate) query.set("start_date", filters.startDate.toISOString());
  if (filters.endDate) query.set("end_date", filters.endDate.toISOString());

  const url = `${import.meta.env.VITE_BACKEND_URL}/api/assistant/platform-billable-minutes?${query.toString()}`;
  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || json.message || "Failed to load billable minutes");
  }

  return json;
}

export async function getDashboardMetrics(filters: AnalyticsFilters): Promise<DashboardMetrics> {
  const payload = await callDashboardMetricsEndpoint(filters);
  return condenseDashboardMetricsResponse(payload);
}

export async function getCallsByAssistant(filters: AnalyticsFilters): Promise<AssistantBreakdownItem[]> {
  const payload = await callCallsByAssistantEndpoint(filters);
  return condenseAssistantBreakdownResponse(payload);
}

export async function getCallsByPhoneNumber(filters: AnalyticsFilters): Promise<PhoneBreakdownItem[]> {
  const payload = await callCallsByPhoneNumberEndpoint(filters);
  return condensePhoneBreakdownResponse(payload);
}

export async function getCallsByTime(filters: AnalyticsFilters): Promise<TimeSeriesPoint[]> {
  const payload = await callCallsByTimeEndpoint(filters);
  return condenseTimeSeriesResponse(payload);
}

export async function getCallsByService(filters: AnalyticsFilters): Promise<ServiceBreakdownItem[]> {
  const payload = await callCallsByServiceEndpoint(filters);
  return condenseServiceBreakdownResponse(payload);
}

export async function getPlatformBillableMinutes(filters: AnalyticsFilters): Promise<PlatformBillableItem[]> {
  const payload = await callPlatformBillableMinutesEndpoint(filters);
  return condensePlatformBillableResponse(payload);
}
