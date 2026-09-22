import { IntegrationData, ResyncData } from "@/types/integration";
import { authedFetch } from "@/services/auth/authedFetch";
import { readJson } from "@/lib/readJson";

const INTEGRATION_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/integration`;

export async function callGetIntegrationEndpoint(args: {
  serviceName: string;
}): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await authedFetch(
    `${INTEGRATION_BASE}/get?service_name=${encodeURIComponent(args.serviceName)}`
  );
  return { ok: res.ok, status: res.status, json: await readJson(res) };
}

/**
 * The stored integration with its key reduced to a preview. `GET /get` still returns the full
 * provider key; only the last four characters are kept.
 */
export const condenseIntegrationResponse = (json: unknown): IntegrationData | null => {
  const data = (json as { data?: Record<string, unknown> } | null)?.data;
  if (!data || typeof data.service_name !== "string") return null;
  const preview =
    typeof data.api_key_preview === "string"
      ? data.api_key_preview
      : typeof data.api_key === "string"
        ? `***${data.api_key.slice(-4)}`
        : "";
  return {
    service_type: String(data.service_type ?? ""),
    service_name: data.service_name,
    api_key_preview: preview,
  };
};

export async function callStoreIntegrationEndpoint(payload: {
  service_name: string;
  api_key: string;
}): Promise<{ success: boolean; message?: string; error?: string; resync?: { status: string } }> {
  const response = await authedFetch(`${INTEGRATION_BASE}/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(response);
}

export async function callResyncIntegrationEndpoint(payload: {
  service_name: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await authedFetch(`${INTEGRATION_BASE}/resync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function callResyncStatusEndpoint(args: {
  serviceName: string;
}): Promise<{ ok: boolean; status: number; json: { success?: boolean; data?: ResyncData; error?: string } }> {
  const res = await authedFetch(
    `${INTEGRATION_BASE}/resync-status?service_name=${encodeURIComponent(args.serviceName)}`
  );
  return { ok: res.ok, status: res.status, json: await readJson(res) };
}
