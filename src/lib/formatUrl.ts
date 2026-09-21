/**
 * The host of a URL, for list rows and chips that have no room for the full
 * endpoint. Returns the input unchanged when it does not parse, so a
 * half-typed or non-HTTP value is still shown rather than swallowed.
 *
 * Always pair with the full URL somewhere reachable — a tooltip or the detail
 * pane. This is a summary, not a replacement.
 */
export function urlHost(value?: string | null): string {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}
