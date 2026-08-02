import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAssistantList } from "@/routes/dashboard/assistant/useAssistantList";

const mockToast = vi.fn();
const mockCallList = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/assistant/assistantService", () => ({
  callListAssistantsEndpoint: (...args: unknown[]) => mockCallList(...args),
  // The hook passes the raw payload straight through, so the condense step is
  // the identity here — page assembly is what these tests are about.
  condenseListAssistantsResponse: (json: unknown) => json,
}));

const assistant = (name: string) => ({ assistant_id: name, assistant_name: name });

/** A full page is 15 items — anything shorter tells the hook there is no next page. */
const fullPage = (prefix: string) => Array.from({ length: 15 }, (_, i) => assistant(`${prefix}-${i}`));

describe("useAssistantList", () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockCallList.mockReset();
  });

  it("loads the first page for the given user", async () => {
    mockCallList.mockResolvedValue({ ok: true, json: [assistant("Alpha"), assistant("Beta")] });

    const { result } = renderHook(() => useAssistantList("user-1"));

    await waitFor(() => expect(result.current.listLoading).toBe(false));
    expect(mockCallList).toHaveBeenCalledWith({ userId: "user-1", page: 1, limit: 15 });
    expect(result.current.filteredAssistants).toHaveLength(2);
  });

  it("does not call the API without a user, and stops loading", async () => {
    const { result } = renderHook(() => useAssistantList(undefined));

    await waitFor(() => expect(result.current.listLoading).toBe(false));
    expect(mockCallList).not.toHaveBeenCalled();
  });

  it("filters by name, case-insensitively", async () => {
    mockCallList.mockResolvedValue({ ok: true, json: [assistant("Support Bot"), assistant("Sales Bot")] });

    const { result } = renderHook(() => useAssistantList("user-1"));
    await waitFor(() => expect(result.current.filteredAssistants).toHaveLength(2));

    act(() => result.current.setSearchQuery("SUPPORT"));

    expect(result.current.filteredAssistants).toHaveLength(1);
    expect(result.current.filteredAssistants[0].assistant_name).toBe("Support Bot");
  });

  it("refresh() resets to page 1 and replaces the list rather than appending", async () => {
    mockCallList.mockResolvedValue({ ok: true, json: fullPage("a") });

    const { result } = renderHook(() => useAssistantList("user-1"));
    await waitFor(() => expect(result.current.filteredAssistants).toHaveLength(15));

    mockCallList.mockResolvedValue({ ok: true, json: [assistant("only-one")] });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.page).toBe(1);
    expect(result.current.filteredAssistants).toHaveLength(1);
  });

  it("toasts and empties the list when the first page fails", async () => {
    mockCallList.mockResolvedValue({ ok: false, json: { error: "nope" } });

    const { result } = renderHook(() => useAssistantList("user-1"));

    await waitFor(() => expect(result.current.listLoading).toBe(false));
    expect(result.current.filteredAssistants).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive", description: "nope" }),
    );
  });
});
