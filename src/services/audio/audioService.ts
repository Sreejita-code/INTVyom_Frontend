import { AudioItem } from "@/types/audio";
import { ServiceResponse } from "@/types/http";

const AUDIO_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/audio`;

export async function callListAudiosEndpoint(args: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(
    `${AUDIO_BASE}/list?user_id=${args.userId}&page=${args.page ?? 1}&limit=${args.limit ?? 50}`
  );
  return { ok: res.ok, json: await res.json() };
}

export const condenseListAudiosResponse = (json: unknown): AudioItem[] => {
  if (!json || typeof json !== "object") return [];
  const node = json as Record<string, unknown>;
  const audios = node.data && typeof node.data === "object"
    ? (node.data as Record<string, unknown>).audios
    : undefined;
  return Array.isArray(audios) ? (audios as AudioItem[]) : [];
};

export async function callDeleteAudioEndpoint(args: {
  userId: string;
  audioId: string;
}): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${AUDIO_BASE}/${args.audioId}?user_id=${args.userId}`, {
    method: "DELETE",
  });
  return { ok: res.ok, json: await res.json() };
}

export async function callUploadAudioEndpoint(formData: FormData): Promise<ServiceResponse<unknown>> {
  const res = await fetch(`${AUDIO_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  return { ok: res.ok, json: await res.json() };
}
