import { Placeholder, expandDottedKeys } from "./placeholders";

export interface MetadataRow {
  key: string;
  value: string;
  /** Came from a `{{placeholder}}` in the assistant's prompt, so its key is not editable. */
  fromPrompt?: boolean;
  optional?: boolean;
}

/** Rows for the placeholders a prompt asks for, keeping anything the user has already typed. */
export function rowsForPlaceholders(placeholders: Placeholder[], existing: MetadataRow[]): MetadataRow[] {
  const typed = new Map(existing.map((row) => [row.key, row.value]));
  const prompted = placeholders.map((p) => ({
    key: p.path,
    value: typed.get(p.path) ?? "",
    fromPrompt: true,
    optional: p.optional,
  }));
  const promptedKeys = new Set(prompted.map((row) => row.key));
  // Keys the user added by hand survive an assistant switch — they cost nothing to send.
  const custom = existing.filter((row) => !row.fromPrompt && !promptedKeys.has(row.key));
  return [...prompted, ...custom];
}

/**
 * The object to send as `metadata`, or `undefined` when there is nothing to send.
 *
 * Returns `undefined` for unparseable raw JSON too, so callers must check the raw text themselves
 * before treating "nothing to send" as success.
 */
export function metadataFrom(
  rows: MetadataRow[],
  rawJson: string,
  useRaw: boolean,
): Record<string, unknown> | undefined {
  if (useRaw) {
    const text = rawJson.trim();
    if (!text) return undefined;
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  const built = expandDottedKeys(Object.fromEntries(rows.map((row) => [row.key, row.value])));
  return Object.keys(built).length > 0 ? built : undefined;
}
