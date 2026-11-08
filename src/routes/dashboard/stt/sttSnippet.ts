import type { RequestSpec } from "@/lib/apiSnippet";
import type { SttProvider } from "@/types/stt";

export interface SttSnippetValues {
  provider?: SttProvider;
  model?: string;
  language?: string;
  assistantId?: string;
  /** Name of the file the snippet reads. The recording is saved under the extension of its format. */
  filename?: string;
}

export function buildSttSpec(values: SttSnippetValues): RequestSpec {
  return {
    id: "stt.transcribe",
    title: "Transcribe audio",
    method: "POST",
    path: "/api/stt/transcribe",
    form: {
      fields: {
        provider: values.provider || undefined,
        model: values.model?.trim() || undefined,
        language: values.language?.trim() || undefined,
        assistant_id: values.assistantId || undefined,
      },
      file: { field: "file", filename: values.filename ?? "recording.wav" },
    },
  };
}
