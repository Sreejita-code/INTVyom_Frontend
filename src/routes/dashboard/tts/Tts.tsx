import { useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import { PlaygroundShell } from "@/components/common/PlaygroundShell";
import { PlaygroundResult } from "@/components/common/PlaygroundResult";
import { PlaygroundWorkbench } from "@/components/common/PlaygroundWorkbench";
import { EndpointReference } from "@/components/common/EndpointReference";
import { SnippetPanel } from "@/components/common/SnippetPanel";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { condenseApiError, type ApiError } from "@/lib/apiError";
import {
  API_KEY_PLACEHOLDER,
  renderSnippet,
  type SnippetLanguage,
} from "@/lib/apiSnippet";
import {
  callSynthesizeEndpoint,
  condenseSynthesizeAudioResponse,
  condenseSynthesizeJsonResponse,
} from "@/services/tts/ttsService";
import type { TtsResult } from "@/types/tts";
import { buildTtsSpec } from "./ttsSnippet";
import { TTS_REFERENCE } from "./ttsReference";
import { TtsForm, TtsFormValues } from "./TtsForm";
import { EMPTY_TTS_VALUES } from "./ttsRules";
import { TtsResultView } from "./TtsResult";

const SAMPLE = "Hello! Welcome to our platform.";
const backendUrl = () =>
  import.meta.env.VITE_BACKEND_URL || "https://<your-backend>";
const NETWORK_ERROR: ApiError = {
  status: 0,
  message: "Network error. The request did not reach the server.",
  suggestions: {},
};

export default function Tts() {
  const [values, setValues] = useState<TtsFormValues>(EMPTY_TTS_VALUES);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TtsResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const controller = useRef<AbortController | null>(null);
  const { copied, copy } = useCopyToClipboard(1500);

  const update = (next: Partial<TtsFormValues>) =>
    setValues((prev) => ({ ...prev, ...next }));

  const send = async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    try {
      const res = await callSynthesizeEndpoint({
        request: {
          text: values.text,
          provider: values.provider || undefined,
          model: values.model.trim() || undefined,
          voice: values.voice.trim() || undefined,
          language: values.language.trim() || undefined,
          saveToLibrary: values.saveToLibrary,
          responseFormat: values.format,
          assistantId: values.assistantId || undefined,
        },
        providerKey: values.providerKey || undefined,
        signal: abort.signal,
      });
      if (!res.ok) {
        setResult(null);
        setError(condenseApiError(res.json, res.status));
      } else if (values.format === "json") {
        setResult(condenseSynthesizeJsonResponse(res.json));
      } else if (res.blob && res.headers) {
        setResult(condenseSynthesizeAudioResponse(res.blob, res.headers));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(NETWORK_ERROR);
    } finally {
      if (controller.current === abort) setBusy(false);
    }
  };

  const cancel = () => {
    controller.current?.abort();
    setBusy(false);
  };

  const spec = buildTtsSpec(
    {
      text: values.text || SAMPLE,
      provider: values.provider || undefined,
      model: values.model,
      voice: values.voice,
      language: values.language,
      saveToLibrary: values.saveToLibrary,
      assistantId: values.assistantId || undefined,
    },
    values.format,
  );
  const options = { baseUrl: backendUrl(), apiKey: API_KEY_PLACEHOLDER };

  return (
    <PlaygroundShell
      title="Text to speech"
      purpose="Turn text into speech with your key, then copy the request into your code."
      method="POST"
      path="/api/tts/synthesize"
      icon={AudioLines}
      tabs={{
        try: (
          <PlaygroundWorkbench
            request={
              <TtsForm
                values={values}
                onChange={update}
                onSend={send}
                onCancel={cancel}
                busy={busy}
              />
            }
            result={
              <PlaygroundResult>
                <div aria-live="polite">
                  <TtsResultView
                    result={result}
                    error={error}
                    onUseSample={() => update({ text: SAMPLE })}
                  />
                </div>
              </PlaygroundResult>
            }
          />
        ),
        code: (
          <div className="space-y-3">
            <SnippetPanel
              spec={spec}
              options={options}
              language={language}
              onLanguageChange={setLanguage}
              copied={copied}
              onCopy={() => copy(renderSnippet(language, spec, options))}
            />
          </div>
        ),
        reference: <EndpointReference reference={TTS_REFERENCE} />,
      }}
    />
  );
}
