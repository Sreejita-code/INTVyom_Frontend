/**
 * `{{...}}` placeholders in an assistant's prompt and start instruction.
 *
 * The platform fills these at call time from the outbound `metadata` object (or, inbound, from the
 * context-strategy webhook's response body). The payload's shape *is* the path, so `{{name}}` reads
 * a flat key and `{{customer.name}}` reads a nested one — this parser does not try to interpret
 * that, it just reports the paths a prompt asks for so the call form can offer to fill them.
 */

/** Section blocks `{{#key}}…{{/key}}` render their body only when `key` is present. */
const PLACEHOLDER = /\{\{\s*([#/]?)([\w.]+)\s*\}\}/g;

/** Platform-supplied fields. Always available, never filled by the user, so never prompted for. */
const RESERVED_PREFIX = "call.";

export interface Placeholder {
  /** The path as written, e.g. `customer.name`. */
  path: string;
  /** True when the prompt only ever uses it inside a `{{#path}}…{{/path}}` block, so it is optional. */
  optional: boolean;
}

/**
 * Every distinct placeholder a template asks the caller to supply, in the order they first appear.
 * `{{call.*}}` is excluded — the platform provides those and a user cannot set them.
 */
export function extractPlaceholders(...templates: (string | undefined | null)[]): Placeholder[] {
  const found = new Map<string, Placeholder>();

  for (const template of templates) {
    if (!template) continue;
    // Open `{{#key}}` blocks. A bare use inside one is still conditional — the whole point of
    // `{{#customer_name}} for {{customer_name}}{{/customer_name}}` is that the value may be absent.
    const openSections: string[] = [];

    for (const [, marker, path] of template.matchAll(PLACEHOLDER)) {
      if (marker === "/") {
        if (openSections[openSections.length - 1] === path) openSections.pop();
        continue;
      }
      if (marker === "#") {
        openSections.push(path);
      }
      if (path.startsWith(RESERVED_PREFIX)) continue;

      const conditional = marker === "#" || openSections.length > 0;
      const existing = found.get(path);
      if (!existing) {
        found.set(path, { path, optional: conditional });
      } else if (!conditional) {
        // Used bare, outside every block — the prompt expects this value unconditionally.
        existing.optional = false;
      }
    }
  }

  return [...found.values()];
}

/**
 * Turn flat dotted keys back into the nested object the placeholder paths imply, so a form row
 * labelled `customer.name` produces `{ customer: { name: … } }` — which is what `{{customer.name}}`
 * reads. Keys without a dot stay flat. Blank values are dropped.
 */
export function expandDottedKeys(entries: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entries)) {
    if (!key.trim() || value === "") continue;
    const parts = key.trim().split(".");
    let cursor = out;
    let blocked = false;

    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!(part in cursor)) {
        cursor[part] = {};
      } else if (typeof cursor[part] !== "object" || cursor[part] === null) {
        // Someone entered both `customer` and `customer.name`. Keep the earlier scalar rather than
        // silently replacing it with an object, and drop this entry.
        blocked = true;
        break;
      }
      cursor = cursor[part] as Record<string, unknown>;
    }

    if (!blocked) cursor[parts[parts.length - 1]] = value;
  }

  return out;
}
