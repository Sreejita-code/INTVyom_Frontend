import { IntegrationData, ResyncData } from "@/types/integration";

const INTEGRATION_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/integration`;

export async function callGetIntegrationEndpoint(args: {
  userId: string;
  serviceName: string;
}): Promise<{ success: boolean; data?: IntegrationData }> {
  const response = await fetch(
    `${INTEGRATION_BASE}/get?user_id=${args.userId}&service_name=${args.serviceName}`
  );
  return response.json();
}

export async function callStoreIntegrationEndpoint(payload: {
  user_id: string;
  service_name: string;
  api_key: string;
}): Promise<{ success: boolean; message?: string; error?: string; resync?: { status: string } }> {
  const response = await fetch(`${INTEGRATION_BASE}/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function callResyncIntegrationEndpoint(payload: {
  user_id: string;
  service_name: string;
}): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${INTEGRATION_BASE}/resync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function callResyncStatusEndpoint(args: {
  userId: string;
  serviceName: string;
}): Promise<{ ok: boolean; json: { success: boolean; data?: ResyncData } }> {
  const res = await fetch(
    `${INTEGRATION_BASE}/resync-status?user_id=${args.userId}&service_name=${args.serviceName}`
  );
  return { ok: res.ok, json: await res.json() };
}
