import { Volume2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssistantDetail, TtsProvider } from "@/types/assistant";
import { FieldRow } from "./FieldRow";
import { ProviderFields } from "./ProviderFields";
import { StageSection, TRIGGER_ONE_LINE } from "./StageSection";
import { TTS_PROVIDERS, findProvider } from "./providerCatalog";

interface TtsSectionProps {
  ttsModel: TtsProvider;
  ttsConfig: AssistantDetail["assistant_tts_config"];
  onProviderChange: (provider: TtsProvider) => void;
  onConfigChange: (config: Record<string, any>) => void;
  step: number;
}

/**
 * The voice — the reply becomes speech. Not rendered in realtime mode, where the model speaks its
 * own audio and the voice is a field on the model instead.
 *
 * Speaking rate is spelled differently by every vendor (Cartesia `speed`, Sarvam `pace`,
 * ElevenLabs nested in voice settings, Mistral not at all), so the field specs carry that
 * difference rather than the UI pretending they are one knob.
 */
export function TtsSection({ ttsModel, ttsConfig, onProviderChange, onConfigChange, step }: TtsSectionProps) {
  const spec = findProvider(TTS_PROVIDERS, ttsModel);
  const config = (ttsConfig ?? {}) as Record<string, any>;

  const voiceLabel = ttsModel === "sarvam" ? config.speaker : config.voice_id;
  const rate = ttsModel === "sarvam" ? config.pace : ttsModel === "elevenlabs" ? config.voice_settings?.speed : config.speed;

  const summary = [
    spec?.label ?? ttsModel,
    ttsModel === "elevenlabs" ? config.model || "eleven_v3" : undefined,
    voiceLabel || "no voice set",
    rate !== undefined && rate !== 1 ? `${rate}×` : undefined,
  ].filter(Boolean) as string[];

  const visible = spec?.fields.filter((f) => !f.advanced) ?? [];
  const advanced = spec?.fields.filter((f) => f.advanced) ?? [];

  return (
    <StageSection
      step={step}
      title="Voice"
      blurb="The reply becomes speech. This is the voice the caller actually hears, and the only stage they judge on sound."
      icon={Volume2}
      summary={summary}
      last
      advancedCount={advanced.length}
      advanced={
        advanced.length > 0 ? (
          <ProviderFields fields={advanced} config={config} onChange={onConfigChange} />
        ) : undefined
      }
    >
      <FieldRow
        label="Provider"
        help={`${spec?.tagline} The API key comes from your Integrations page.`}
        control={
          <Select value={ttsModel} onValueChange={(v) => onProviderChange(v as TtsProvider)}>
            <SelectTrigger aria-label="Provider" className={TRIGGER_ONE_LINE}>
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
              {TTS_PROVIDERS.map((provider) => (
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

      <ProviderFields fields={visible} config={config} onChange={onConfigChange} />
    </StageSection>
  );
}
