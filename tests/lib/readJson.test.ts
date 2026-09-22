import { describe, expect, it } from "vitest";

import { readJson } from "@/lib/readJson";

describe("readJson", () => {
  it("returns the parsed body", async () => {
    expect(await readJson(Response.json({ success: true, data: [1] }))).toEqual({ success: true, data: [1] });
  });

  it("turns a non-JSON error page into the error envelope", async () => {
    const res = new Response("<html>Bad Gateway</html>", { status: 502, statusText: "Bad Gateway" });

    expect(await readJson(res)).toEqual({ error: "The server answered 502 Bad Gateway." });
  });

  it("treats an empty body as an empty object", async () => {
    expect(await readJson(new Response(null, { status: 204 }))).toEqual({});
  });

  it("throws when a success response is not JSON, so the page does not read it as empty", async () => {
    const res = new Response("<!doctype html><html></html>", { status: 200 });

    await expect(readJson(res)).rejects.toThrow(/unexpected response/i);
  });
});
