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

    const { result } = renderHook(() => useAssistantList(true));

    await waitFor(() => expect(result.current.listLoading).toBe(false));
    expect(mockCallList).toHaveBeenCalledWith({ page: 1, limit: 15 });
    expect(result.current.filteredAssistants).toHaveLength(2);
  });

  it("does not call the API without a user, and stops loading", async () => {
    const { result } = renderHook(() => useAssistantList(false));

    await waitFor(() => expect(result.current.listLoading).toBe(false));
    expect(mockCallList).not.toHaveBeenCalled();
  });

  it("searches by name on the server, so assistants on unloaded pages are found", async () => {
    mockCallList.mockResolvedValueOnce({ ok: true, json: fullPage("page1") });
    mockCallList.mockResolvedValueOnce({ ok: true, json: [assistant("Support Bot")] });

    const { result } = renderHook(() => useAssistantList(true));
    await waitFor(() => expect(result.current.filteredAssistants).toHaveLength(15));

    act(() => result.current.setSearchQuery("  support "));

    await waitFor(() =>
      expect(mockCallList).toHaveBeenLastCalledWith({ page: 1, limit: 15, assistantName: "support" }),
    );
    await waitFor(() => expect(result.current.filteredAssistants).toEqual([assistant("Support Bot")]));
  });

  it("refresh() resets to page 1 and replaces the list rather than appending", async () => {
    mockCallList.mockResolvedValue({ ok: true, json: fullPage("a") });

    const { result } = renderHook(() => useAssistantList(true));
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

    const { result } = renderHook(() => useAssistantList(true));

    await waitFor(() => expect(result.current.listLoading).toBe(false));
    expect(result.current.filteredAssistants).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive", description: "nope" }),
    );
  });

  it("ignores a slow response for a search the user has already replaced", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    mockCallList.mockResolvedValueOnce({ ok: true, json: fullPage("page1") });
    mockCallList.mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }));
    mockCallList.mockResolvedValueOnce({ ok: true, json: [assistant("ab match")] });

    const { result } = renderHook(() => useAssistantList(true));
    await waitFor(() => expect(result.current.filteredAssistants).toHaveLength(15));

    act(() => result.current.setSearchQuery("a"));
    await waitFor(() => expect(mockCallList).toHaveBeenCalledTimes(2));
    act(() => result.current.setSearchQuery("ab"));
    await waitFor(() => expect(result.current.filteredAssistants).toEqual([assistant("ab match")]));

    await act(async () => resolveOld({ ok: true, json: [assistant("stale a")] }));

    expect(result.current.filteredAssistants).toEqual([assistant("ab match")]);
  });
});
