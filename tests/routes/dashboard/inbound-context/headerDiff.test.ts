import { describe, expect, it } from "vitest";
import {
  MASK,
  buildConfigPatch,
  buildHeaderPatch,
  emptyHeaderRow,
  rowsFromHeaders,
} from "@/routes/dashboard/inbound-context/headerDiff";

const stored = () =>
  rowsFromHeaders({ Authorization: MASK, "X-Tenant-Id": "acme" });

describe("buildHeaderPatch", () => {
  it("sends nothing when the stored headers are untouched", () => {
    expect(buildHeaderPatch(stored())).toBeUndefined();
  });

  it("never echoes a masked value back", () => {
    const rows = stored();
    rows[1] = { ...rows[1], value: "globex", dirty: true };

    const patch = buildHeaderPatch(rows);
    expect(patch).toEqual({ "X-Tenant-Id": "globex" });
    expect(JSON.stringify(patch)).not.toContain(MASK);
  });

  it("sends a replaced secret with its new value", () => {
    const rows = stored();
    rows[0] = { ...rows[0], value: "Bearer rotated", dirty: true };

    expect(buildHeaderPatch(rows)).toEqual({ Authorization: "Bearer rotated" });
  });

  it("sends a removed header as null", () => {
    const rows = stored();
    rows[1] = { ...rows[1], removed: true };

    expect(buildHeaderPatch(rows)).toEqual({ "X-Tenant-Id": null });
  });

  it("sends an added header and ignores blank rows", () => {
    const rows = [
      ...stored(),
      { ...emptyHeaderRow(), key: "X-Region", value: "in", dirty: true },
      emptyHeaderRow(),
    ];

    expect(buildHeaderPatch(rows)).toEqual({ "X-Region": "in" });
  });

  it("ignores a row that was added and removed before saving", () => {
    const rows = [{ ...emptyHeaderRow(), key: "X-Temp", removed: true }];

    expect(buildHeaderPatch(rows)).toBeUndefined();
  });

  it("treats a rename as a delete plus an add", () => {
    const rows = stored();
    rows[1] = { ...rows[1], key: "X-Account-Id" };

    expect(buildHeaderPatch(rows)).toEqual({
      "X-Tenant-Id": null,
      "X-Account-Id": "acme",
    });
  });
});

describe("buildConfigPatch", () => {
  const base = {
    originalUrl: "https://crm.example.com/ctx",
    originalTimeoutSeconds: 2,
    rows: stored(),
  };

  it("returns undefined when nothing changed", () => {
    expect(
      buildConfigPatch({ ...base, url: base.originalUrl, timeoutSeconds: "2" })
    ).toBeUndefined();
  });

  it("sends only the timeout when only the timeout changed", () => {
    expect(
      buildConfigPatch({ ...base, url: base.originalUrl, timeoutSeconds: "3.5" })
    ).toEqual({ timeout_seconds: 3.5 });
  });

  it("sends only the url when only the url changed", () => {
    expect(
      buildConfigPatch({ ...base, url: "https://crm.example.com/v2", timeoutSeconds: "2" })
    ).toEqual({ url: "https://crm.example.com/v2" });
  });

  it("combines url, timeout and header changes", () => {
    const rows = stored();
    rows[1] = { ...rows[1], removed: true };

    expect(
      buildConfigPatch({
        ...base,
        rows,
        url: "https://crm.example.com/v2",
        timeoutSeconds: "5",
      })
    ).toEqual({
      url: "https://crm.example.com/v2",
      timeout_seconds: 5,
      headers: { "X-Tenant-Id": null },
    });
  });
});
