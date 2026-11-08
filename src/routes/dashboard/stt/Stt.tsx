import { useState } from "react";

import { EndpointReference } from "@/components/common/EndpointReference";
import { PlaygroundShell } from "@/components/common/PlaygroundShell";
import { SnippetPanel } from "@/components/common/SnippetPanel";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { condenseApiError, type ApiError } from "@/lib/apiError";
import { API_KEY_PLACEHOLDER, renderSnippet, type SnippetLanguage } from "@/lib/apiSnippet";
import { callTranscribeEndpoint, condenseTranscribeResponse } from "@/services/stt/sttService";
import type { SttResult } from "@/types/stt";
import { STT_REFERENCE } from "./sttReference";
import { buildSttSpec } from "./sttSnippet";
import { SttForm, type SttFormValues } from "./SttForm";
import { audioFileError, EMPTY_STT_VALUES } from "./sttRules";
import { SttResultView } from "./SttResult";

const backendUrl = () => import.meta.env.VITE_BACKEND_URL || "https://<your-backend>";
const NETWORK_ERROR: ApiError = { status: 0, message: "Network error. The request did not reach the server.", suggestions: {} };

export default function Stt() {
  const [values, setValues] = useState<SttFormValues>(EMPTY_STT_VALUES);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SttResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const { copied, copy } = useCopyToClipboard(1500);

  const update = (next: Partial<SttFormValues>) => setValues((prev) => ({ ...prev, ...next }));

  const chooseFile = (file: File) => {
    const reason = audioFileError(file);
    setFileError(reason);
    update({ file: reason ? null : file });
  };

  const send = async () => {
    if (!values.file) return;
    const abort = new AbortController();
    setController(abort);
    setBusy(true);
    setError(null);
    try {
      const res = await callTranscribeEndpoint({
        request: {
          file: values.file,
          provider: values.provider || undefined,
          model: values.model.trim() || undefined,
          language: values.language.trim() || undefined,
          assistantId: values.assistantId || undefined,
        },
        providerKey: values.providerKey || undefined,
        signal: abort.signal,
      });
      if (!res.ok) {
        setResult(null);
        setError(condenseApiError(res.json, res.status));
      } else {
        setResult(condenseTranscribeResponse(res.json));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
      setController(null);
    }
  };

  const cancel = () => {
    controller?.abort();
    setBusy(false);
  };

  const spec = buildSttSpec({
    provider: values.provider || undefined,
    model: values.model,
    language: values.language,
    assistantId: values.assistantId || undefined,
    filename: values.file?.name,
  });
  const options = { baseUrl: backendUrl(), apiKey: API_KEY_PLACEHOLDER };

  return (
    <PlaygroundShell
      title="Speech to text"
      purpose="Record your voice or upload a file, then read the transcript and its cost."
      method="POST"
      path="/api/stt/transcribe"
      tabs={{
        try: (
          <div className="grid gap-8 lg:grid-cols-2">
            <SttForm
              values={values}
              fileError={fileError}
              onChange={update}
              onFile={chooseFile}
              onSend={send}
              onCancel={cancel}
              busy={busy}
            />
            <div>
              <SttResultView result={result} error={error} />
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
        reference: <EndpointReference reference={STT_REFERENCE} />,
      }}
    />
  );
}
