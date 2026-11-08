import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AssistantPicker } from "@/components/common/AssistantPicker";
import { ProviderKeyField } from "@/components/common/ProviderKeyField";
import { TTS_PROVIDERS, findProvider } from "@/routes/dashboard/assistant/providerCatalog";
import type { TtsProvider, TtsResponseFormat } from "@/types/tts";
import { MAX_TTS_CHARACTERS, ttsBlockReason } from "./ttsRules";

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

export function TtsForm({ values, onChange, onSend, onCancel, busy }: TtsFormProps) {
  const blocked = ttsBlockReason(values.text);
  const modelOptions = findProvider(TTS_PROVIDERS, values.provider || undefined)?.fields.find((f) => f.key === "model")?.options ?? [];

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!blocked && !busy) onSend();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="tts-text">Text to speak</Label>
        <Textarea
          id="tts-text"
          aria-label="Text to speak"
          rows={5}
          value={values.text}
          onChange={(event) => onChange({ text: event.target.value })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{blocked && values.text.length > 0 ? blocked : blocked ? "" : "Ready to send."}</span>
          <span>{`${values.text.length} / ${MAX_TTS_CHARACTERS}`}</span>
        </div>
        {blocked && values.text.length === 0 ? <p className="text-xs text-muted-foreground">{blocked}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tts-provider">Provider</Label>
          <select
            id="tts-provider"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.provider}
            onChange={(event) => onChange({ provider: event.target.value as TtsProvider | "", model: "", voice: "" })}
          >
            <option value="">Default (cartesia)</option>
            {TTS_PROVIDERS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tts-model">Model</Label>
          <Input
            id="tts-model"
            list="tts-model-suggestions"
            className="font-mono"
            value={values.model}
            onChange={(event) => onChange({ model: event.target.value })}
          />
          <datalist id="tts-model-suggestions">
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tts-voice">Voice</Label>
          <Input id="tts-voice" className="font-mono" value={values.voice} onChange={(event) => onChange({ voice: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tts-language">Language</Label>
          <Input id="tts-language" value={values.language} onChange={(event) => onChange({ language: event.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="tts-save">Save to Audio Library</Label>
          <Switch
            id="tts-save"
            aria-label="Save to Audio Library"
            checked={values.saveToLibrary}
            onCheckedChange={(checked) => onChange({ saveToLibrary: checked })}
          />
        </div>
        {values.saveToLibrary ? (
          <p className="text-xs text-muted-foreground">
            The API may store this audio in your Audio Library. Leave it off to keep the output out of the library.
          </p>
        ) : null}
      </div>

      <RadioGroup
        value={values.format}
        onValueChange={(value) => onChange({ format: value as TtsResponseFormat })}
        className="grid gap-2 sm:grid-cols-2"
        aria-label="Response format"
      >
        <Label htmlFor="tts-format-audio" className="flex items-center gap-2 rounded-md border p-3">
          <RadioGroupItem id="tts-format-audio" value="audio" /> Audio file (streams the bytes)
        </Label>
        <Label htmlFor="tts-format-json" className="flex items-center gap-2 rounded-md border p-3">
          <RadioGroupItem id="tts-format-json" value="json" /> JSON (base64 audio and usage)
        </Label>
      </RadioGroup>

      <AssistantPicker value={values.assistantId} onChange={(assistantId) => onChange({ assistantId })} />
      <ProviderKeyField value={values.providerKey} onChange={(providerKey) => onChange({ providerKey })} />

      <div className="flex items-center gap-3">
        {busy ? (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <span className="text-sm text-muted-foreground" role="status">
              Generating speech…
            </span>
          </>
        ) : (
          <Button type="submit" disabled={Boolean(blocked)}>
            Generate speech
          </Button>
        )}
      </div>
    </form>
  );
}
