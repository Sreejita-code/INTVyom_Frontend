import { describe, expect, it } from "vitest";

import { expandDottedKeys, extractPlaceholders } from "@/lib/placeholders";

describe("extractPlaceholders", () => {
  it("finds flat, nested and array-index paths in first-seen order", () => {
    const found = extractPlaceholders("Hi {{name}}, you are on {{customer.plan}} with tag {{tags.0}}.");
    expect(found.map((p) => p.path)).toEqual(["name", "customer.plan", "tags.0"]);
  });

  it("dedupes across both templates and tolerates whitespace inside the braces", () => {
    const found = extractPlaceholders("You are {{ agent_name }}.", "Hi, this is {{agent_name}}.");
    expect(found.map((p) => p.path)).toEqual(["agent_name"]);
  });

  it("skips {{call.*}} — the platform supplies those and a user cannot set them", () => {
    const found = extractPlaceholders("From {{call.to_number}} about {{ticket_id}}.");
    expect(found.map((p) => p.path)).toEqual(["ticket_id"]);
  });

  it("marks a path used only inside a section block as optional", () => {
    const found = extractPlaceholders("Pulled up{{#customer_name}} for {{customer_name}}{{/customer_name}}.");
    // The bare use sits inside the block, so the value is genuinely optional.
    expect(found).toEqual([{ path: "customer_name", optional: true }]);
  });

  it("is not optional once the same path is also used outside a block", () => {
    const found = extractPlaceholders("Hello {{name}}.{{#name}} Good to see you.{{/name}}");
    expect(found).toEqual([{ path: "name", optional: false }]);
  });

  it("returns nothing for a prompt with no placeholders", () => {
    expect(extractPlaceholders("You are a helpful agent.", undefined, null)).toEqual([]);
  });
});

describe("expandDottedKeys", () => {
  it("nests dotted keys and leaves flat ones alone", () => {
    expect(expandDottedKeys({ name: "John", "customer.plan": "Enterprise", "agent.name": "Sarah" })).toEqual({
      name: "John",
      customer: { plan: "Enterprise" },
      agent: { name: "Sarah" },
    });
  });

  it("merges sibling paths under one parent", () => {
    expect(expandDottedKeys({ "customer.name": "John", "customer.plan": "Enterprise" })).toEqual({
      customer: { name: "John", plan: "Enterprise" },
    });
  });

  it("drops blank values and blank keys", () => {
    expect(expandDottedKeys({ name: "", "  ": "x", plan: "Pro" })).toEqual({ plan: "Pro" });
  });

  it("keeps an earlier scalar rather than replacing it with an object", () => {
    expect(expandDottedKeys({ customer: "John", "customer.plan": "Enterprise" })).toEqual({ customer: "John" });
  });
});
