import { StrategyItem } from "@/types/inboundContext";
import { ServiceResponse } from "@/types/http";

const INBOUND_CONTEXT_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/inbound-context-strategy`;

export async function callListStrategiesEndpoint(userId: string): Promise<unknown> {
  const res = await fetch(`${INBOUND_CONTEXT_BASE}/list?user_id=${userId}`);
  return res.json();
}

export const condenseListStrategiesResponse = (json: unknown): StrategyItem[] => {
  let data: unknown[] = [];
  if (Array.isArray(json)) data = json;
  else if (json && typeof json === "object" && Array.isArray((json as Record<string, unknown>).data)) {
    data = (json as Record<string, unknown>).data as unknown[];
  }

  return data.map((st) => {
    const raw = (st || {}) as Record<string, unknown>;
    return {
      ...raw,
      strategy_id: String(raw.strategy_id || raw.external_strategy_id || raw.id || raw._id),
      name: String(raw.name || raw.strategy_name || "Unnamed Strategy"),
      type: String(raw.type || raw.strategy_type || "webhook"),
    } as StrategyItem;
  });
};

export async function callCreateStrategyEndpoint(payload: unknown): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_CONTEXT_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callUpdateStrategyEndpoint(
  strategyId: string,
  payload: unknown
): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_CONTEXT_BASE}/update/${strategyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callDeleteStrategyEndpoint(args: {
  userId: string;
  strategyId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${INBOUND_CONTEXT_BASE}/delete/${args.strategyId}?user_id=${args.userId}`, {
    method: "DELETE",
  });
  return { ok: res.ok, json: await res.json() };
}
