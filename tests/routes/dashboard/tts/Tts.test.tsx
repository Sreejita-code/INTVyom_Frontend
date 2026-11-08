import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Tts from "@/routes/dashboard/tts";
import * as ttsService from "@/services/tts/ttsService";

const renderTts = (search = "") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/dashboard/tts${search}`]}>
        <Tts />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const typeText = (value: string) =>
  fireEvent.change(screen.getByLabelText("Text to speak"), { target: { value } });

const sendButton = () => screen.getByRole("button", { name: "Generate speech" });

describe("TTS page", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:tts") }));
  });
  afterEach(() => vi.restoreAllMocks());

  it("blocks sending empty text and says why (AC-8)", () => {
    renderTts();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText("Enter some text to speak.")).toBeInTheDocument();
  });

  it("shows a live character count and blocks text over 5000 (AC-8)", () => {
    renderTts();
    typeText("hello");
    expect(screen.getByText("5 / 5000")).toBeInTheDocument();
    typeText("x".repeat(5001));
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText(/5000 characters or fewer/)).toBeInTheDocument();
  });

  it("warns when save to library is switched on, and not before (AC-25)", () => {
    renderTts();
    expect(screen.queryByText(/may store this audio/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Save to Audio Library" }));
    expect(screen.getByText(/may store this audio in your Audio Library/)).toBeInTheDocument();
  });

  it("json format shows usage, and a null cost reads as not reported (AC-9)", async () => {
    vi.spyOn(ttsService, "callSynthesizeEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        data: {
          audio_base64: btoa("RIFFxxxx"),
          media_type: "audio/wav",
          provider: "cartesia",
          model: "sonic-3",
          usage: { characters_count: 31, audio_duration_seconds: 2, estimated_cost_usd: null, pricing_complete: false },
        },
      },
    });
    renderTts("?tab=try");
    fireEvent.click(screen.getByRole("radio", { name: /JSON/ }));
    typeText("hello");
    fireEvent.click(sendButton());
    expect(await screen.findByText("31")).toBeInTheDocument();
    expect(screen.getByText("Not reported")).toBeInTheDocument();
    expect(screen.getByText(/Cost is partial/)).toBeInTheDocument();
  });

  it("audio format without readable headers says usage needs the json format (AC-9)", async () => {
    vi.spyOn(ttsService, "callSynthesizeEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      blob: new Blob([new Uint8Array(4)], { type: "audio/wav" }),
      headers: new Headers({ "Content-Type": "audio/wav" }),
    });
    renderTts();
    typeText("hello");
    fireEvent.click(sendButton());
    expect(await screen.findByText(/Usage is only available with the JSON format/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download audio" })).toHaveAttribute("download", "speech.wav");
  });

  it("shows the server error with its suggestions and keeps the text (AC-12)", async () => {
    vi.spyOn(ttsService, "callSynthesizeEndpoint").mockResolvedValue({
      ok: false,
      status: 422,
      json: { error: "Speaker not supported", suggestions: { tts: "Try: cartesia" } },
    });
    renderTts();
    typeText("hello");
    fireEvent.click(sendButton());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Speaker not supported");
    expect(alert).toHaveTextContent("Try: cartesia");
    expect(screen.getByLabelText("Text to speak")).toHaveValue("hello");
  });

  it("writes nothing to browser storage when it sends (AC-10)", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(ttsService, "callSynthesizeEndpoint").mockResolvedValue({ ok: false, status: 502, json: { error: "down" } });
    renderTts();
    typeText("hello");
    fireEvent.click(sendButton());
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(setItem).not.toHaveBeenCalled();
  });
});
