import { describe, expect, it } from "vitest";
import { urlHost } from "@/lib/formatUrl";

/**
 * List rows have room for a hostname, not a full endpoint. The full value
 * still lives in the detail pane and in the row's tooltip, so this only has
 * to be readable — never lossy in a way that hides which host is called.
 */
describe("urlHost", () => {
  it("keeps only the host of a full webhook URL", () => {
    expect(urlHost("https://hirebot-api.indusnettechnologies.com/api/v1/context?x=1")).toBe(
      "hirebot-api.indusnettechnologies.com",
    );
  });

  it("keeps a non-default port, which changes which service is called", () => {
    expect(urlHost("http://localhost:8080/hook")).toBe("localhost:8080");
  });

  it("returns the original string when it does not parse as a URL", () => {
    expect(urlHost("not a url")).toBe("not a url");
  });

  it("returns an empty string for a missing value", () => {
    expect(urlHost(undefined)).toBe("");
    expect(urlHost("")).toBe("");
  });
})
