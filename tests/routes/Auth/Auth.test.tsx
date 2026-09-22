import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Auth from "@/routes/Auth/Auth";
import { getStoredUser } from "@/services/storage/storageService";

const mockToast = vi.fn();
const mockSignup = vi.fn();
const mockLogin = vi.fn();

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

vi.mock("@/services/auth/authService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/auth/authService")>()),
  callSignupEndpoint: (...args: unknown[]) => mockSignup(...args),
  callLoginEndpoint: (...args: unknown[]) => mockLogin(...args),
}));

const renderAuth = () =>
  render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );

const signUp = async () => {
  fireEvent.click(screen.getByText(/don't have an account/i));
  fireEvent.change(await screen.findByLabelText(/organisation/i), { target: { value: "Acme" } });
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "asha" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "asha@example.com" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
};

describe("Auth page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockToast.mockReset();
    mockSignup.mockReset();
    mockLogin.mockReset();
  });

  it("signs a new user straight in when the backend issued a key", async () => {
    mockSignup.mockResolvedValue({ user: { id: "u1", user_name: "asha", api_key: "lvk_abc" } });

    renderAuth();
    await signUp();

    expect(await screen.findByText("dashboard")).toBeInTheDocument();
    expect(getStoredUser()?.api_key).toBe("lvk_abc");
  });

  it("does not start a session when signup returned no API key", async () => {
    mockSignup.mockResolvedValue({ user: { id: "u1", user_name: "asha", api_key: null } });

    renderAuth();
    await signUp();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })),
    );
    expect(mockToast.mock.calls[0][0].description).toMatch(/sign in/i);
    expect(getStoredUser()).toBeNull();
    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^login$/i })).toBeInTheDocument();
  });
});
