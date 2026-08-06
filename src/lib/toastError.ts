/**
 * Toast props for a failed API call. The backend error envelope is always
 * `{ error: message }`, and for the inbound endpoints that message already carries the
 * flattened upstream validation text (e.g. "strategy_config.url: url must use http or
 * https"), so the one field is worth showing verbatim.
 */
export const toastError = (json: unknown, fallback: string) => ({
  variant: "destructive" as const,
  title: "Error",
  description: (json as { error?: string })?.error || fallback,
});
