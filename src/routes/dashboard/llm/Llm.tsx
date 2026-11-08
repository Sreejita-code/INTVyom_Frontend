import { useRef, useState } from "react";

import { EndpointReference } from "@/components/common/EndpointReference";
import { PlaygroundShell } from "@/components/common/PlaygroundShell";
import { SnippetPanel } from "@/components/common/SnippetPanel";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { condenseApiError, type ApiError } from "@/lib/apiError";
import { API_KEY_PLACEHOLDER, renderSnippet, type SnippetLanguage } from "@/lib/apiSnippet";
import { deltaOf, parseSseChunk, SSE_DONE } from "@/lib/sseEvents";
import { callChatEndpoint, callChatStreamEndpoint, condenseChatResponse } from "@/services/llm/llmService";
import type { ChatMessage, LlmRequest, LlmResult } from "@/types/llm";
import { buildLlmSpec } from "./llmSnippet";
import { LLM_REFERENCE } from "./llmReference";
import { LlmForm, type LlmFormValues } from "./LlmForm";
import { EMPTY_LLM_VALUES } from "./llmRules";
import { LlmResultView, type StreamState } from "./LlmResult";

const backendUrl = () => import.meta.env.VITE_BACKEND_URL || "https://<your-backend>";
const NETWORK_ERROR: ApiError = { status: 0, message: "Network error. The request did not reach the server.", suggestions: {} };

const toRequest = (values: LlmFormValues): LlmRequest => ({
  messages: values.messages.filter((message) => message.content.trim() !== ""),
  provider: values.provider || undefined,
  model: values.model.trim() || undefined,
  temperature: values.temperature === "" ? undefined : Number(values.temperature),
  maxTokens: values.maxTokens === "" ? undefined : Number(values.maxTokens),
  assistantId: values.assistantId || undefined,
});

export default function Llm() {
  const [values, setValues] = useState<LlmFormValues>(EMPTY_LLM_VALUES);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LlmResult | null>(null);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const controller = useRef<AbortController | null>(null);
  const reader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const { copied, copy } = useCopyToClipboard(1500);

  const update = (next: Partial<LlmFormValues>) => setValues((prev) => ({ ...prev, ...next }));

  const readStream = async (body: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    const source = body.getReader();
    reader.current = source;
    let buffer = "";
    let text = "";
    const events: string[] = [];
    try {
      for (;;) {
        const { value, done } = await source.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          events.push(event);
          if (event.includes(SSE_DONE)) {
            setStream({ text, events: [...events], status: "finished" });
            return;
          }
          text += deltaOf(event);
          setStream({ text, events: [...events], status: "streaming" });
        }
      }
      setStream({ text, events: [...events], status: "finished" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(NETWORK_ERROR);
    }
  };

  const send = async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    setResult(null);
    setStream(null);
    const request = toRequest(values);
    try {
      if (values.stream) {
        const res = await callChatStreamEndpoint({ request: { ...request }, providerKey: values.providerKey || undefined, signal: abort.signal });
        if (!res.ok) {
          setError(condenseApiError(res.json, res.status));
        } else if (res.response?.body) {
          setStream({ text: "", events: [], status: "streaming" });
          await readStream(res.response.body);
        }
      } else {
        const res = await callChatEndpoint({ request, providerKey: values.providerKey || undefined, signal: abort.signal });
        if (!res.ok) setError(condenseApiError(res.json, res.status));
        else setResult(condenseChatResponse(res.json));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(NETWORK_ERROR);
    } finally {
      if (controller.current === abort) setBusy(false);
    }
  };

  const stop = () => {
    controller.current?.abort();
    reader.current?.cancel().catch(() => undefined);
    setStream((prev) => (prev ? { ...prev, status: "stopped" } : prev));
    setBusy(false);
  };

  const sample: ChatMessage[] = values.messages.some((m) => m.content.trim()) ? values.messages : [{ role: "user", content: "What services do you offer?" }];
  const spec = buildLlmSpec(
    {
      messages: sample,
      provider: values.provider || undefined,
      model: values.model,
      temperature: values.temperature === "" ? undefined : Number(values.temperature),
      maxTokens: values.maxTokens === "" ? undefined : Number(values.maxTokens),
      assistantId: values.assistantId || undefined,
    },
    values.stream,
  );
  const options = { baseUrl: backendUrl(), apiKey: API_KEY_PLACEHOLDER };

  return (
    <PlaygroundShell
      title="LLM chat"
      purpose="Send a conversation to a model and read the reply, with usage and cost."
      method="POST"
      path="/api/llm/chat"
      tabs={{
        try: (
          <div className="grid gap-8 lg:grid-cols-2">
            <LlmForm values={values} onChange={update} onSend={send} onStop={stop} busy={busy} />
            <div>
              <LlmResultView result={result} stream={stream} error={error} />
            </div>
          </div>
        ),
        code: (
          <SnippetPanel
            spec={spec}
            options={options}
            language={language}
            onLanguageChange={setLanguage}
            copied={copied}
            onCopy={() => copy(renderSnippet(language, spec, options))}
          />
        ),
        reference: <EndpointReference reference={LLM_REFERENCE} />,
      }}
    />
  );
}
