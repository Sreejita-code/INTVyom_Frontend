import { describe, expect, it } from "vitest";

import { MetadataRow, metadataFrom, rowsForPlaceholders } from "@/lib/callMetadata";

describe("rowsForPlaceholders", () => {
  it("makes one row per placeholder, in prompt order", () => {
    const rows = rowsForPlaceholders(
      [{ path: "name", optional: false }, { path: "note", optional: true }],
      [],
    );
    expect(rows).toEqual([
      { key: "name", value: "", fromPrompt: true, optional: false },
      { key: "note", value: "", fromPrompt: true, optional: true },
    ]);
  });

  it("keeps values already typed when the prompt is re-read", () => {
    const existing: MetadataRow[] = [{ key: "name", value: "John", fromPrompt: true }];
    const rows = rowsForPlaceholders([{ path: "name", optional: false }], existing);
    expect(rows[0].value).toBe("John");
  });

  it("keeps hand-added keys after switching assistants, and drops stale prompted ones", () => {
    const existing: MetadataRow[] = [
      { key: "old_var", value: "x", fromPrompt: true },
      { key: "my_own", value: "y" },
    ];
    const rows = rowsForPlaceholders([{ path: "new_var", optional: false }], existing);
    expect(rows.map((r) => r.key)).toEqual(["new_var", "my_own"]);
  });
});

describe("metadataFrom", () => {
  it("nests dotted row keys and drops empty values", () => {
    const rows: MetadataRow[] = [
      { key: "customer.name", value: "John" },
      { key: "agent_name", value: "Sarah" },
      { key: "unset", value: "" },
    ];
    expect(metadataFrom(rows, "", false)).toEqual({ customer: { name: "John" }, agent_name: "Sarah" });
  });

  it("sends nothing when every row is blank, so the request omits metadata entirely", () => {
    expect(metadataFrom([{ key: "name", value: "" }], "", false)).toBeUndefined();
  });

  it("uses the raw JSON when that mode is on, ignoring the rows", () => {
    const rows: MetadataRow[] = [{ key: "name", value: "ignored" }];
    expect(metadataFrom(rows, '{"customer": {"plan": "Enterprise"}}', true)).toEqual({
      customer: { plan: "Enterprise" },
    });
  });

  it("returns undefined for unparseable or non-object JSON", () => {
    expect(metadataFrom([], "{ nope", true)).toBeUndefined();
    // An array has no keys for a placeholder to read, so it is not usable metadata.
    expect(metadataFrom([], "[1, 2]", true)).toBeUndefined();
    expect(metadataFrom([], "   ", true)).toBeUndefined();
  });
});
