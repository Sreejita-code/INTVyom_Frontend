import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Stt from "@/routes/dashboard/stt";
import * as sttService from "@/services/stt/sttService";
import * as assistantService from "@/services/assistant/assistantService";

const renderStt = (search = "?tab=try") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/dashboard/stt${search}`]}>
        <Stt />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const chooseFile = (file: File) =>
  fireEvent.change(screen.getByLabelText("Audio file"), {
    target: { files: [file] },
  });

const wav = (size = 1024) => {
  const file = new File(["x"], "clip.wav", { type: "audio/wav" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("STT page", () => {
  it("lets the user replay an accepted file and releases its preview URL (AC-3)", () => {
    const createObjectURL = vi.fn(() => "blob:audio-preview");
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });

    const view = renderStt();
    chooseFile(wav());

    expect(screen.getByLabelText("Audio preview")).toHaveAttribute(
      "src",
      "blob:audio-preview",
    );
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:audio-preview");
  });

  beforeEach(() => {
    vi.spyOn(assistantService, "callListAssistantsEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      json: { data: [] },
    } as never);
    vi.spyOn(sttService, "callTranscribeEndpoint").mockResolvedValue({
      ok: true,
      status: 200,
      json: {
        data: {
          text: "Hello world",
          language: null,
          duration_seconds: 2.4,
          provider: "sarvam",
          model: null,
          usage: {
            audio_duration_seconds: null,
            estimated_cost_usd: 0.000239,
            pricing_complete: true,
          },
        },
      },
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("rejects a file over 25 MB before any request (AC-3)", () => {
    renderStt();
    chooseFile(wav(26 * 1024 * 1024));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This file is over the 25 MB limit.",
    );
    expect(screen.getByRole("button", { name: "Transcribe" })).toBeDisabled();
    expect(sttService.callTranscribeEndpoint).not.toHaveBeenCalled();
  });

  it("rejects a file type the API does not take (AC-3)", () => {
    renderStt();
    chooseFile(new File(["x"], "notes.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a wav, mp3, ogg, webm or m4a file.",
    );
  });

  it("explains a denied microphone and keeps file upload usable (AC-18)", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("denied"), { name: "NotAllowedError" }),
          ),
      },
    });
    renderStt();
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(
      await screen.findByText(/Microphone access is blocked/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Audio file")).toBeInTheDocument();
  });

  it("says recording is unavailable when the browser has no microphone API (AC-18)", () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    renderStt();
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(screen.getByText(/cannot record audio here/)).toBeInTheDocument();
  });

  it("sends only the options that are set and shows the transcript and usage (AC-4, AC-5)", async () => {
    renderStt();
    chooseFile(wav());
    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "hi-IN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    expect(await screen.findByText("Hello world")).toBeInTheDocument();
    const sent = vi.mocked(sttService.callTranscribeEndpoint).mock.calls[0][0]
      .request;
    expect(sent.language).toBe("hi-IN");
    expect(sent.provider).toBeUndefined();
    expect(sent.model).toBeUndefined();
    expect(screen.getByText("Not reported")).toBeInTheDocument();
  });

  it("shows a 413 with its message and keeps the file so the user can retry (AC-12)", async () => {
    vi.mocked(sttService.callTranscribeEndpoint).mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: { error: "Audio file is too large" },
    });
    renderStt();
    chooseFile(wav());
    fireEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Audio file is too large",
      ),
    );
    expect(screen.getByRole("button", { name: "Transcribe" })).toBeEnabled();
  });

  it("shows an empty state before the first call (AC-17)", () => {
    renderStt();
    expect(
      screen.getByText("Your transcript and its usage will appear here."),
    ).toBeInTheDocument();
  });

  it("suggests the provider's model and language codes and still accepts free text (AC-24)", () => {
    renderStt();
    fireEvent.click(
      screen.getByRole("button", { name: "Browse Model suggestions" }),
    );
    fireEvent.click(screen.getByRole("option", { name: /saaras:v3/i }));
    expect(screen.getByLabelText("Model")).toHaveValue("saaras:v3");
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "future-model" },
    });
    expect(screen.getByLabelText("Model")).toHaveValue("future-model");

    fireEvent.click(
      screen.getByRole("button", { name: "Browse Language suggestions" }),
    );
    expect(
      screen.getByRole("option", { name: /Hindi.*hi-IN/i }),
    ).toBeInTheDocument();
  });

  it("returns focus to Transcribe after Cancel (AC-20)", () => {
    vi.spyOn(sttService, "callTranscribeEndpoint").mockImplementation(
      () => new Promise(() => undefined),
    );
    renderStt();
    chooseFile(wav());
    fireEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Transcribe" })).toHaveFocus();
  });

  it("writes nothing to browser storage when it sends (AC-10)", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(sttService, "callTranscribeEndpoint").mockResolvedValue({
      ok: false,
      status: 502,
      json: { error: "down" },
    } as never);
    renderStt();
    chooseFile(wav());
    fireEvent.click(screen.getByRole("button", { name: "Transcribe" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps the primary action with audio and progressively discloses optional settings (AC-26, AC-27)", () => {
    renderStt();
    const audio = screen.getByRole("group", { name: "Audio input" });
    expect(audio).toContainElement(
      screen.getByRole("button", { name: "Transcribe" }),
    );
    expect(
      screen.queryByLabelText("Provider API key (optional)"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Optional configuration" }),
    );
    const key = screen.getByLabelText("Provider API key (optional)");
    fireEvent.change(key, { target: { value: "temporary-key" } });
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
    renderStt();
    expect(screen.getByRole("region", { name: "Result" })).toHaveTextContent(
      "Your transcript and its usage will appear here.",
    );
  });
});
