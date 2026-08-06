import { describe, expect, it } from "vitest";
import {
  isInsecureUrl,
  validateTimeoutSeconds,
  validateWebhookUrl,
} from "@/routes/dashboard/inbound-context/strategyValidation";

describe("validateWebhookUrl", () => {
  it("accepts a public https endpoint", () => {
    expect(validateWebhookUrl("https://crm.example.com/ctx").ok).toBe(true);
  });

  it("accepts plain http, which the API also allows", () => {
    expect(validateWebhookUrl("http://crm.example.com/ctx").ok).toBe(true);
    expect(isInsecureUrl("http://crm.example.com/ctx")).toBe(true);
    expect(isInsecureUrl("https://crm.example.com/ctx")).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(validateWebhookUrl("   ").ok).toBe(false);
  });

  it("rejects something that is not a URL", () => {
    expect(validateWebhookUrl("crm.example.com/ctx").ok).toBe(false);
  });

  it("rejects a non-http scheme", () => {
    expect(validateWebhookUrl("ftp://crm.example.com/ctx").ok).toBe(false);
  });

  it.each([
    "https://localhost/ctx",
    "https://127.0.0.1/ctx",
    "https://10.0.0.5/ctx",
    "https://192.168.1.10/ctx",
    "https://172.16.0.1/ctx",
    "https://169.254.169.254/latest/meta-data/",
    "https://metadata.google.internal/ctx",
  ])("rejects the non-public host in %s", (url) => {
    expect(validateWebhookUrl(url).ok).toBe(false);
  });

  it("allows a public IP", () => {
    expect(validateWebhookUrl("https://203.0.113.10/ctx").ok).toBe(true);
  });
});

describe("validateTimeoutSeconds", () => {
  it("treats an empty value as unset", () => {
    expect(validateTimeoutSeconds("").ok).toBe(true);
  });

  it("accepts the documented range", () => {
    expect(validateTimeoutSeconds("0.5").ok).toBe(true);
    expect(validateTimeoutSeconds("10").ok).toBe(true);
  });

  it("rejects values outside the range", () => {
    expect(validateTimeoutSeconds("0.4").ok).toBe(false);
    expect(validateTimeoutSeconds("10.1").ok).toBe(false);
  });

  it("rejects a non-number", () => {
    expect(validateTimeoutSeconds("soon").ok).toBe(false);
  });
});
