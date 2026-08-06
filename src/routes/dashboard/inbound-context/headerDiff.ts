import { StrategyConfig } from "@/types/inboundContext";

/** What the API returns in place of a secret header value. */
export const MASK = "****";

export interface HeaderRow {
  /** Stable key for React lists; survives renaming the header key. */
  id: string;
  key: string;
  value: string;
  /** Empty for a row the user added — nothing to delete or compare against. */
  originalKey: string;
  originalValue: string;
  /** The stored value is a secret the API masked — the real one is not in the browser. */
  masked: boolean;
  /** The user typed a new value (or hit Replace on a masked row). */
  dirty: boolean;
  removed: boolean;
}

let rowCounter = 0;
const nextRowId = () => `hdr-${(rowCounter += 1)}`;

/** Build editor rows from a strategy's stored config. */
export const rowsFromHeaders = (headers?: Record<string, string>): HeaderRow[] =>
  Object.entries(headers || {}).map(([key, value]) => ({
    id: nextRowId(),
    key,
    value: value === MASK ? "" : value,
    originalKey: key,
    originalValue: value === MASK ? "" : value,
    masked: value === MASK,
    dirty: false,
    removed: false,
  }));

export const emptyHeaderRow = (): HeaderRow => ({
  id: nextRowId(),
  key: "",
  value: "",
  originalKey: "",
  originalValue: "",
  masked: false,
  dirty: false,
  removed: false,
});

/**
 * Only the headers that actually changed. The API merges `headers` key by key and treats a
 * null value as "delete this key", so an untouched header must simply be absent from the
 * patch — including the masked ones, whose real value never reaches the browser. That is
 * what stops a fetch-edit-save round trip from overwriting a secret with the mask.
 *
 * Returns undefined when nothing changed, so the caller can leave `headers` off entirely.
 */
export const buildHeaderPatch = (rows: HeaderRow[]): Record<string, string | null> | undefined => {
  const patch: Record<string, string | null> = {};

  for (const row of rows) {
    const key = row.key.trim();

    if (row.removed) {
      // A row that was only ever added locally never reached the server.
      if (row.originalKey) patch[row.originalKey] = null;
      continue;
    }

    if (!key) continue;

    // Renaming a header is a delete plus an add.
    const renamed = Boolean(row.originalKey) && key !== row.originalKey;
    if (renamed) patch[row.originalKey] = null;

    // A masked row the user did not replace still compares equal (both sides empty), so it
    // falls out here and keeps whatever the server has.
    if (!renamed && row.value === row.originalValue) continue;

    patch[key] = row.value;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
};

/**
 * Partial `strategy_config` carrying only what changed. Top-level keys replace outright;
 * headers must be a diff. Returns undefined when the whole config is untouched.
 */
export const buildConfigPatch = (args: {
  url: string;
  originalUrl: string;
  timeoutSeconds: string;
  originalTimeoutSeconds?: number;
  rows: HeaderRow[];
}): Partial<StrategyConfig> | undefined => {
  const patch: Record<string, unknown> = {};

  if (args.url.trim() !== args.originalUrl) patch.url = args.url.trim();

  const timeout = args.timeoutSeconds.trim();
  if (timeout && Number(timeout) !== args.originalTimeoutSeconds) patch.timeout_seconds = Number(timeout);

  const headers = buildHeaderPatch(args.rows);
  if (headers) patch.headers = headers;

  return Object.keys(patch).length > 0 ? (patch as Partial<StrategyConfig>) : undefined;
};
