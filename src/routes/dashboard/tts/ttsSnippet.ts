import type { RequestSpec } from "@/lib/apiSnippet";
import type { TtsProvider, TtsResponseFormat } from "@/types/tts";

export interface TtsSnippetValues {
  text: string;
  provider?: TtsProvider;
  model?: string;
  voice?: string;
  language?: string;
  saveToLibrary: boolean;
  assistantId?: string;
}

export function buildTtsSpec(values: TtsSnippetValues, format: TtsResponseFormat): RequestSpec {
  const body: Record<string, unknown> = { text: values.text };
  if (values.assistantId) body.assistant_id = values.assistantId;
  if (values.provider) body.provider = values.provider;
  if (values.model?.trim()) body.model = values.model.trim();
  if (values.voice?.trim()) body.voice = values.voice.trim();
  if (values.language?.trim()) body.language = values.language.trim();
  body.save_to_library = values.saveToLibrary;
  body.response_format = format;
  return {
    id: format === "json" ? "tts.synthesize.json" : "tts.synthesize.audio",
    title: "Synthesize speech",
    method: "POST",
    path: "/api/tts/synthesize",
    body,
    response: format === "audio" ? "binary" : undefined,
  };
}
