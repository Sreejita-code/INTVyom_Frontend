import { Mic } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssistantDetail, AssistantMode, SttProvider } from "@/types/assistant";
import { FieldRow } from "./FieldRow";
import { ProviderFields } from "./ProviderFields";
import { StageSection, TRIGGER_ONE_LINE } from "./StageSection";
import { PIPELINE_DEGRADES_STT, FieldSpec, STT_PROVIDERS, findProvider, sttOptionsFor } from "./providerCatalog";

interface SttSectionProps {
  mode: AssistantMode;
  sttModel: SttProvider;
  sttConfig: AssistantDetail["assistant_stt_config"];
  onProviderChange: (provider: SttProvider) => void;
  onConfigChange: (config: Record<string, any>) => void;
  step: number;
  last?: boolean;
  /** Pipeline: this is a side tap off the model, not a stage in front of it. */
  nested?: boolean;
}

/**
 * The transcriber.
 *
 * Its role changes with the mode, and so does how it is drawn. In `cascade` it is the first stage
 * of the chain and the only thing the text model ever sees. In `pipeline` it is a parallel tap: the
 * realtime model hears the caller's audio directly, and this only decides what gets written into
 * the transcript. In `realtime` it does not run at all and the caller does not render it.
 *
 * Cross-field traps (a key term on a model that ignores key terms, a language pinned under
 * auto-detect) are surfaced on the field itself rather than left to fail silently on the call.
 */
export function SttSection({
  mode,
  sttModel,
  sttConfig,
  onProviderChange,
  onConfigChange,
  step,
  last,
  nested,
}: SttSectionProps) {
  const spec = findProvider(STT_PROVIDERS, sttModel);
  const providers = sttOptionsFor(mode, sttModel);

  const config = (sttConfig ?? {}) as Record<string, any>;
  const sttModelId = config.model ?? spec?.fields.find((f) => f.key === "model")?.fallback;

  const inertReasonFor = (field: FieldSpec): string | undefined => {
    if (sttModel === "deepgram") {
      if (field.key === "keyterm" && sttModelId === "nova-2") {
        return "nova-2 uses a different keyword mechanism and ignores this.";
      }
      if (field.key === "enable_diarization" && String(sttModelId).startsWith("flux")) {
        return "Flux models drop speaker labels — switch to a nova model to use them.";
      }
    }
    if (sttModel === "openai") {
      if (field.key === "language" && config.detect_language) {
        return "Auto-detect is on, so this language is ignored.";
      }
      if (field.key === "prompt" && sttModelId !== "whisper-1") {
        return "Only whisper-1 reads the prompt. This model accepts it and does nothing with it.";
      }
    }
    return undefined;
  };

  const summary = [
    spec?.label ?? sttModel,
    sttModelId,
    sttModel === "sarvam" && (config.language === "unknown" || !config.language) ? "auto-detect" : config.language,
    sttModel === "elevenlabs" ? (config.language_code ? config.language_code : "auto-detect") : undefined,
    sttModel === "openai" && config.detect_language ? "auto-detect" : undefined,
    sttModel === "sarvam" ? config.mode : undefined,
  ].filter(Boolean) as string[];

  // The picker no longer offers these in pipeline mode, so reaching either branch means the value
  // was saved earlier — by an older build of this editor, or by the API directly. The value is kept
  // and shown rather than rewritten, so it stays repairable; these messages say what it is doing.
  //
  // The two cases are deliberately not merged. Upstream logs a warning for cartesia/deepgram/
  // elevenlabs because no parallel-tap implementation exists and the engine you picked genuinely
  // does not run. It stays silent for openai because the realtime model already transcribes with
  // the same vendor and the same gpt-4o-mini-transcribe, so nothing is lost and nothing extra is
  // billed. Pushing a mode switch for the openai case would be advice to change modes for no gain.
  const warn =
    mode === "pipeline" && PIPELINE_DEGRADES_STT.includes(sttModel)
      ? `This assistant is saved with ${spec?.label}, which only runs in cascade mode. Pipeline keeps the setting but transcribes with the conversational model instead. Pick Sarvam or Native here, or switch the assistant to cascade to use ${spec?.label} for real.`
      : undefined;

  const note =
    mode === "pipeline" && sttModel === "openai"
      ? "This assistant is saved with OpenAI. In pipeline mode the realtime model already transcribes with OpenAI's own model, so this collapses to that rather than opening a second connection — nothing is lost and nothing extra is billed."
      : undefined;

  const visible = spec?.fields.filter((f) => !f.advanced) ?? [];
  const advanced = spec?.fields.filter((f) => f.advanced) ?? [];

  return (
    <StageSection
      step={step}
      last={last}
      nested={nested}
      title={nested ? "Transcript tap" : "Speech to text"}
      blurb={
        nested
          ? "The model above hears the caller's audio directly. This runs alongside it and decides what the saved transcript says — it does not change what the model understands."
          : "The caller's audio becomes text. In cascade this text is the only thing the model sees, so its accuracy sets the ceiling for the whole call."
      }
      icon={Mic}
      summary={summary}
      warn={warn}
      note={note}
      advancedCount={advanced.length}
      advanced={
        advanced.length > 0 ? (
          <ProviderFields
            fields={advanced}
            config={config}
            onChange={onConfigChange}
            inertReasonFor={inertReasonFor}
          />
        ) : undefined
      }
    >
      <FieldRow
        label="Provider"
        help={
          <>
            {spec?.tagline}
            {spec?.value !== "native" && " The API key comes from your Integrations page."}
          </>
        }
        control={
          <Select value={sttModel} onValueChange={(v) => onProviderChange(v as SttProvider)}>
            <SelectTrigger aria-label="Provider" className={TRIGGER_ONE_LINE}>
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
              {providers.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  <span className="flex flex-col gap-0.5 py-0.5">
                    <span className="text-sm">{provider.label}</span>
                    <span data-tagline className="text-xs leading-5 text-muted-foreground">
                      {provider.tagline}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {visible.length > 0 && (
        <ProviderFields
          fields={visible}
          config={config}
          onChange={onConfigChange}
          inertReasonFor={inertReasonFor}
        />
      )}
    </StageSection>
  );
}
