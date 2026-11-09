import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Llm from "@/routes/dashboard/llm";
import * as llmService from "@/services/llm/llmService";

const renderLlm = (search = "?tab=try") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/dashboard/llm${search}`]}>
        <Llm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const typeMessage = (value: string) =>
  fireEvent.change(screen.getByLabelText("Message 1 content"), {
    target: { value },
  });

const send = () => screen.getByRole("button", { name: "Send" });

/** A body that delivers the given SSE chunks, then stays open until cancelled or closed. */
const sseBody = (chunks: string[], close: boolean) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      if (close) controller.close();
    },
  });
};

describe("LLM page", () => {
  afterEach(() => vi.restoreAllMocks());

  it("blocks sending when no message has content (AC-6)", () => {
    renderLlm();
    expect(send()).toBeDisabled();
    expect(
      screen.getByText("Add a message with some content."),
    ).toBeInTheDocument();
  });

  it("blocks temperature outside 0 to 2 (AC-6)", () => {
    renderLlm();
    typeMessage("hi");
    fireEvent.change(screen.getByLabelText("Temperature"), {
      target: { value: "3" },
    });
    expect(send()).toBeDisabled();
    expect(
      screen.getByText("Temperature must be between 0 and 2."),
    ).toBeInTheDocument();
  });

  it("shows the reply and usage with a partial-cost notice (AC-7)", async () => {
    vi.spyOn(llmService, "callChatEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        data: {
          message: { role: "assistant", content: "We offer voice AI." },
          provider: "openai",
          model: "gpt-5.4",
          usage: {
            prompt_tokens: 24,
            completion_tokens: null,
            total_tokens: 40,
            estimated_cost_usd: null,
            pricing_complete: false,
          },
        },
      },
    });
    renderLlm();
    typeMessage("hi");
    fireEvent.click(send());
    expect(await screen.findByText("We offer voice AI.")).toBeInTheDocument();
    expect(screen.getAllByText("Not reported").length).toBeGreaterThan(0);
    expect(screen.getByText(/Cost is partial/)).toBeInTheDocument();
  });

  it("streams text as it arrives and keeps the raw events (AC-7, AC-23)", async () => {
    vi.spyOn(llmService, "callChatStreamEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      response: new Response(
        sseBody(
          [
            'data: {"choices":[{"delta":{"content":"We"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" offer"}}]}\n\ndata: [DONE]\n\n',
          ],
          true,
        ),
      ),
    });
    renderLlm();
    typeMessage("hi");
    fireEvent.click(screen.getByRole("switch", { name: "Stream the reply" }));
    fireEvent.click(send());
    expect(
      await screen.findByText("We offer", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("Stream finished.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show raw events" }));
    expect(screen.getByText(/\[DONE\]/)).toBeInTheDocument();
  });

  it("Stop keeps the text received so far and marks it cut off (AC-7)", async () => {
    vi.spyOn(llmService, "callChatStreamEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      response: new Response(
        sseBody(
          ['data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n'],
          false,
        ),
      ),
    });
    renderLlm();
    typeMessage("hi");
    fireEvent.click(screen.getByRole("switch", { name: "Stream the reply" }));
    fireEvent.click(send());
    expect(await screen.findByText("Partial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(
        screen.getByText(/Stopped. The text above is cut off./),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Partial")).toBeInTheDocument();
  });

  it("suggests the openai chat models and still accepts free text (AC-24)", () => {
    renderLlm();
    fireEvent.click(
      screen.getByRole("button", { name: "Browse Model suggestions" }),
    );
    expect(screen.getByRole("option", { name: "gpt-4.1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "gpt-5.4" }));
    expect(screen.getByLabelText("Model")).toHaveValue("gpt-5.4");
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "future-model" },
    });
    expect(screen.getByLabelText("Model")).toHaveValue("future-model");
  });

  it("fills a starter conversation from the empty state (AC-17)", () => {
    renderLlm();
    fireEvent.click(
      screen.getByRole("button", { name: "Fill a sample conversation" }),
    );
    expect(screen.getByLabelText("Message 1 content")).toHaveValue(
      "You are a helpful customer assistant.",
    );
    expect(send()).toBeEnabled();
  });

  it("returns focus to Send after Stop takes effect (AC-20)", async () => {
    vi.spyOn(llmService, "callChatStreamEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      response: new Response(
        sseBody(
          ['data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n'],
          false,
        ),
      ),
    });
    renderLlm();
    typeMessage("hi");
    fireEvent.click(screen.getByRole("switch", { name: "Stream the reply" }));
    fireEvent.click(send());
    expect(await screen.findByText("Partial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(send()).toHaveFocus());
  });

  it("writes nothing to browser storage when it sends (AC-10)", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(llmService, "callChatEndpoint").mockResolvedValue({
      ok: false,
      status: 502,
      json: { error: "down" },
    });
    renderLlm();
    typeMessage("hi");
    fireEvent.click(send());
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps Send with the conversation and progressively discloses optional settings (AC-26, AC-27)", () => {
    renderLlm();
    const conversation = screen.getByRole("group", { name: "Conversation" });
    expect(conversation).toContainElement(send());
    expect(
      screen.queryByLabelText("Provider API key (optional)"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Optional configuration" }),
    );
    fireEvent.change(screen.getByLabelText("Provider API key (optional)"), {
      target: { value: "temporary-key" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Optional configuration" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Optional configuration" }),
    );
    expect(screen.getByLabelText("Provider API key (optional)")).toHaveValue(
      "temporary-key",
    );
  });

  it("labels the result as one compact workbench surface (AC-28, AC-29)", () => {
    renderLlm();
    expect(screen.getByRole("region", { name: "Result" })).toHaveTextContent(
      "The reply and its usage will appear here.",
    );
  });
});
