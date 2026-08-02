const WEB_CALL_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/web-call`;

export async function callGetWebCallTokenEndpoint(args: {
  userId: string;
  assistantId: string;
  textOnly?: boolean;
}): Promise<unknown> {
  const res = await fetch(`${WEB_CALL_BASE}/get-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: args.userId,
      assistant_id: args.assistantId,
      ...(args.textOnly ? { text_only: true } : {}),
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || "Failed to generate token");
  }
  return json;
}

export const condenseWebCallTokenResponse = (json: unknown): string => {
  if (!json || typeof json !== "object") return "";
  const node = json as Record<string, unknown>;
  const data = node.data && typeof node.data === "object" ? (node.data as Record<string, unknown>) : {};
  return typeof data.token === "string" ? data.token : "";
};
