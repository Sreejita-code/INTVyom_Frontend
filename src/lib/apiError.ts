/** A failed response, normalised. `suggestions` is keyed by slot, never an array. */
export interface ApiError {
  status: number;
  message: string;
  suggestions: Record<string, string>;
}

export function condenseApiError(json: unknown, status: number): ApiError {
  const node = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const suggestions: Record<string, string> = {};
  const raw = node.suggestions;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string") suggestions[key] = value;
    }
  }
  const message = typeof node.error === "string" && node.error ? node.error : `The request failed (${status}).`;
  return { status, message, suggestions };
}
