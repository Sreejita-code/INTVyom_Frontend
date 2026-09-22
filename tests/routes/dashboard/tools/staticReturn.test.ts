import { describe, expect, it } from "vitest";

import { parseStaticReturn, staticReturnText } from "@/routes/dashboard/tools/staticReturn";

describe("static return value", () => {
  it("shows a stored object as formatted JSON instead of [object Object]", () => {
    expect(staticReturnText({ status: "ok", eta: 3 })).toBe('{\n  "status": "ok",\n  "eta": 3\n}');
  });

  it("shows a stored string as typed", () => {
    expect(staticReturnText("Order confirmed")).toBe("Order confirmed");
    expect(staticReturnText(undefined)).toBe("");
  });

  it("sends object and array text as JSON", () => {
    expect(parseStaticReturn('{"status": "ok"}')).toEqual({ value: { status: "ok" } });
    expect(parseStaticReturn("[1, 2]")).toEqual({ value: [1, 2] });
  });

  it("keeps plain text a string, even when it looks like a number", () => {
    expect(parseStaticReturn("Order confirmed")).toEqual({ value: "Order confirmed" });
    expect(parseStaticReturn("42")).toEqual({ value: "42" });
  });

  it("refuses broken JSON rather than saving it as text", () => {
    expect(parseStaticReturn('{"status": ')).toHaveProperty("error");
  });
});
