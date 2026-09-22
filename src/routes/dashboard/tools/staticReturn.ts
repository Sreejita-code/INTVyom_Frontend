/**
 * A static-return tool's `value` is any JSON value. It is edited as text: text that opens with
 * `{` or `[` is JSON, anything else is sent as a plain string.
 */
export const staticReturnText = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
};

export const parseStaticReturn = (text: string): { value: unknown } | { error: string } => {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return { value: text };
  try {
    return { value: JSON.parse(trimmed) };
  } catch {
    return { error: "The value starts like JSON but does not parse. Fix it, or remove the leading { or [." };
  }
};
