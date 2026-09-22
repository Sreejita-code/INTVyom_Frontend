import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Integrations from "@/routes/dashboard/integrations/Integrations";

const toastError = vi.fn();
const getIntegration = vi.fn();

vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));
vi.mock("@/services/storage/storageService", () => ({
  getStoredUser: () => ({ user_id: "u1", user_name: "A", api_key: "key-1" }),
}));
vi.mock("@/services/integration/integrationService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/integration/integrationService")>()),
  callGetIntegrationEndpoint: (...a: unknown[]) => getIntegration(...a),
  callResyncStatusEndpoint: async () => ({ ok: false, status: 404, json: { error: "No job" } }),
}));

const notFound = { ok: false, status: 404, json: { error: "Integration not found" } };

describe("Integrations page", () => {
  beforeEach(() => {
    toastError.mockReset();
    getIntegration.mockReset();
  });

  it("shows only the last four characters of a stored provider key", async () => {
    getIntegration.mockImplementation(async ({ serviceName }: { serviceName: string }) =>
      serviceName === "openai"
        ? { ok: true, status: 200, json: { success: true, data: { service_type: "llm", service_name: "openai", api_key: "sk-live-abcdef1234" } } }
        : notFound,
    );

    render(<Integrations />);

    expect(await screen.findByText(/key ending 1234/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("sk-live");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("says which providers could not be checked instead of calling them disconnected", async () => {
    getIntegration.mockImplementation(async ({ serviceName }: { serviceName: string }) =>
      serviceName === "deepgram" ? { ok: false, status: 500, json: { error: "boom" } } : notFound,
    );

    render(<Integrations />);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/couldn't check deepgram/i)));
  });
});
