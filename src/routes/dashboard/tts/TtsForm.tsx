import { useEffect, useRef } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AssistantPicker } from "@/components/common/AssistantPicker";
import { OptionalConfiguration } from "@/components/common/OptionalConfiguration";
import { ProviderKeyField } from "@/components/common/ProviderKeyField";
import { SuggestionInput } from "@/components/common/SuggestionInput";
import { friendlyLanguage, friendlySpeaker } from "@/lib/optionNames";
import { TTS_PROVIDERS } from "@/routes/dashboard/assistant/providerCatalog";
import type { TtsProvider, TtsResponseFormat } from "@/types/tts";
import {
  MAX_TTS_CHARACTERS,
  ttsBlockReason,
  ttsLanguageOptions,
  ttsModelOptions,
  ttsVoiceOptions,
} from "./ttsRules";

const DEFAULT_PROVIDER = "__default__";

export interface TtsFormValues {
  text: string;
  provider: TtsProvider | "";
  model: string;
  voice: string;
  language: string;
  saveToLibrary: boolean;
  format: TtsResponseFormat;
  assistantId: string;
  providerKey: string;
}

interface TtsFormProps {
  values: TtsFormValues;
  onChange: (next: Partial<TtsFormValues>) => void;
  onSend: () => void;
  onCancel: () => void;
  busy: boolean;
}

/** Why sending is blocked, or `null` when the text can be sent. */

export function TtsForm({
  values,
  onChange,
  onSend,
  onCancel,
  busy,
}: TtsFormProps) {
  const blocked = ttsBlockReason(values.text);
  const sendRef = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  const modelOptions = ttsModelOptions(values.provider);
  const voiceOptions = ttsVoiceOptions(values.provider, values.model);
  const languageOptions = ttsLanguageOptions(values.provider, values.model);

  // After a Cancel, focus returns to the send control so the next attempt needs no tabbing.
  useEffect(() => {
    if (!busy && cancelled.current) {
      cancelled.current = false;
      sendRef.current?.focus();
    }
  }, [busy]);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!blocked && !busy) onSend();
      }}
    >
      <section
        role="group"
        aria-label="Speech input"
        className="space-y-2 rounded-lg border border-border/60 bg-card/20 p-4"
      >
        <Label htmlFor="tts-text">Text to speak</Label>
        <Textarea
          id="tts-text"
          aria-label="Text to speak"
          rows={5}
          value={values.text}
          onChange={(event) => onChange({ text: event.target.value })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {blocked && values.text.length > 0
              ? blocked
              : blocked
                ? ""
                : "Ready to send."}
          </span>
          <span>{`${values.text.length} / ${MAX_TTS_CHARACTERS}`}</span>
        </div>
        {blocked && values.text.length === 0 ? (
          <p className="text-xs text-muted-foreground">{blocked}</p>
        ) : null}
        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          {busy ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  cancelled.current = true;
                  onCancel();
                }}
              >
                Cancel
              </Button>
              <span className="text-sm text-muted-foreground" role="status">
                Generating speech…
              </span>
            </>
          ) : (
            <Button ref={sendRef} type="submit" disabled={Boolean(blocked)}>
              Generate speech
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 p-4">
        <h2 className="mb-4 text-sm font-medium text-foreground">
          Voice options
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tts-provider">Provider</Label>
            <Select
              value={values.provider || DEFAULT_PROVIDER}
              onValueChange={(next) =>
                onChange({
                  provider:
                    next === DEFAULT_PROVIDER ? "" : (next as TtsProvider),
                  model: "",
                  voice: "",
                })
              }
            >
              <SelectTrigger id="tts-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_PROVIDER}>
                  Default (Cartesia)
                </SelectItem>
                {TTS_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SuggestionInput
            id="tts-model"
            label="Model"
            value={values.model}
            options={modelOptions}
            onChange={(model) => onChange({ model })}
            mono
          />
          <SuggestionInput
            id="tts-voice"
            label="Voice"
            value={values.voice}
            options={voiceOptions}
            onChange={(voice) => onChange({ voice })}
            formatOption={(voice) => friendlySpeaker(voice).label}
            mono
          />
          <SuggestionInput
            id="tts-language"
            label="Language"
            value={values.language}
            options={languageOptions}
            onChange={(language) => onChange({ language })}
            formatOption={friendlyLanguage}
          />
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="tts-save">Save to Audio Library</Label>
            <Switch
              id="tts-save"
              aria-label="Save to Audio Library"
              checked={values.saveToLibrary}
              onCheckedChange={(checked) =>
                onChange({ saveToLibrary: checked })
              }
            />
          </div>
          {values.saveToLibrary ? (
            <p className="text-xs text-muted-foreground">
              The API may store this audio in your Audio Library. Leave it off
              to keep the output out of the library.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-medium text-foreground">Response format</h2>
        <RadioGroup
          value={values.format}
          onValueChange={(value) =>
            onChange({ format: value as TtsResponseFormat })
          }
          className="grid gap-2 sm:grid-cols-2"
          aria-label="Response format"
        >
          <Label
            htmlFor="tts-format-audio"
            className="flex items-center gap-2 rounded-md border p-3"
          >
            <RadioGroupItem id="tts-format-audio" value="audio" /> Audio file
            (streams the bytes)
          </Label>
          <Label
            htmlFor="tts-format-json"
            className="flex items-center gap-2 rounded-md border p-3"
          >
            <RadioGroupItem id="tts-format-json" value="json" /> JSON (base64
            audio and usage)
          </Label>
        </RadioGroup>
      </section>

      <OptionalConfiguration
        active={Boolean(values.assistantId || values.providerKey)}
      >
        <AssistantPicker
          value={values.assistantId}
          onChange={(assistantId) => onChange({ assistantId })}
        />
        <ProviderKeyField
          value={values.providerKey}
          onChange={(providerKey) => onChange({ providerKey })}
        />
      </OptionalConfiguration>
    </form>
  );
}
