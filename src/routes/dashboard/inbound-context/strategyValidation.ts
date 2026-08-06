export interface ValidationResult {
  ok: boolean;
  message?: string;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
];

/**
 * Cheap pre-flight for the webhook URL. The API does the authoritative check (it resolves
 * DNS and rejects any non-public address); this only catches the obviously doomed cases
 * before a request leaves the browser.
 */
export const validateWebhookUrl = (raw: string): ValidationResult => {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Webhook URL is required" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, message: "Enter a full URL, including https://" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, message: "URL must use http or https" };
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    return {
      ok: false,
      message: `The host '${parsed.hostname}' is not reachable from the call worker. Use a publicly resolvable address.`,
    };
  }

  return { ok: true };
};

/** Plain http still works, but the caller's number and your auth header travel in cleartext. */
export const isInsecureUrl = (raw: string): boolean => raw.trim().toLowerCase().startsWith("http://");

/** The API accepts 0.5 to 10.0 seconds; the timeout blocks the start of the call. */
export const validateTimeoutSeconds = (raw: string): ValidationResult => {
  const value = raw.trim();
  if (!value) return { ok: true };

  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return { ok: false, message: "Timeout must be a number" };
  if (seconds < 0.5 || seconds > 10) return { ok: false, message: "Timeout must be between 0.5 and 10 seconds" };

  return { ok: true };
};
