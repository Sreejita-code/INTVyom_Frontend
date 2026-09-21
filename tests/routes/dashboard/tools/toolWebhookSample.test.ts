import { describe, expect, it } from "vitest";
import { toolWebhookSample } from "@/routes/dashboard/tools/toolWebhookSample";
import { ToolParameter } from "@/types/tool";

const param = (overrides: Partial<ToolParameter>): ToolParameter => ({
  name: "value",
  type: "string",
  description: "",
  required: false,
  ...overrides,
});

describe("toolWebhookSample", () => {
  it("gives each type a shaped example", () => {
    expect(
      toolWebhookSample([
        param({ name: "city", type: "string" }),
        param({ name: "count", type: "number" }),
        param({ name: "urgent", type: "boolean" }),
        param({ name: "extra", type: "object" }),
        param({ name: "tags", type: "array" }),
      ]),
    ).toEqual({ city: "example", count: 42, urgent: true, extra: {}, tags: [] });
  });

  it("prefers a saved allowed value over the type example", () => {
    expect(toolWebhookSample([param({ name: "size", enum: ["small", "large"] })])).toEqual({ size: "small" });
  });

  it("prefers the value being typed over the saved one", () => {
    expect(
      toolWebhookSample([param({ name: "size", enum: ["small"], _enumString: " medium , huge " })]),
    ).toEqual({ size: "medium" });
  });

  it("skips unnamed rows and returns an empty object for no parameters", () => {
    expect(toolWebhookSample([param({ name: "  " }), param({ name: "kept" })])).toEqual({ kept: "example" });
    expect(toolWebhookSample([])).toEqual({});
  });
});
