import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssistantPicker } from "@/components/common/AssistantPicker";
import { ProviderKeyField } from "@/components/common/ProviderKeyField";
import type { SttProvider } from "@/types/stt";
import { RECORDER_MESSAGES, useAudioRecorder } from "./useAudioRecorder";
import { audioFileError, EMPTY_STT_VALUES } from "./sttRules";

/** Why a file cannot be sent, or `null` when it can. Checked before any request. */

export interface SttFormValues {
  file: File | null;
  provider: SttProvider | "";
  model: string;
  language: string;
  assistantId: string;
  providerKey: string;
}

interface SttFormProps {
  values: SttFormValues;
  fileError: string | null;
  onChange: (next: Partial<SttFormValues>) => void;
  onFile: (file: File) => void;
  onSend: () => void;
  onCancel: () => void;
  busy: boolean;
}

const formatElapsed = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function SttForm({ values, fileError, onChange, onFile, onSend, onCancel, busy }: SttFormProps) {
  const recorder = useAudioRecorder(onFile);
  const canSend = values.file !== null && !fileError;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend && !busy) onSend();
      }}
    >
      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Audio</p>
        <div className="flex flex-wrap items-center gap-3">
          {recorder.state === "recording" ? (
            <>
              <Button type="button" variant="destructive" onClick={recorder.stop} aria-pressed="true">
                Stop recording
              </Button>
              <span role="timer" className="font-mono text-sm text-muted-foreground">
                {formatElapsed(recorder.elapsed)}
              </span>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={recorder.start} aria-pressed="false">
              Start recording
            </Button>
          )}
        </div>
        {recorder.state === "denied" || recorder.state === "unavailable" ? (
          <p role="status" className="text-sm text-muted-foreground">
            {RECORDER_MESSAGES[recorder.state]}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="stt-file">Or choose a file</Label>
          <Input
            id="stt-file"
            aria-label="Audio file"
            type="file"
            accept=".wav,.mp3,.ogg,.webm,.m4a,audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          <p className="text-xs text-muted-foreground">wav, mp3, ogg, webm or m4a, up to 25 MB.</p>
        </div>
        {values.file && !fileError ? (
          <p className="text-sm text-foreground">
            Ready: {values.file.name} ({Math.max(1, Math.round(values.file.size / 1024))} KB)
          </p>
        ) : null}
        {fileError ? (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="stt-provider">Provider</Label>
          <select
            id="stt-provider"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.provider}
            onChange={(event) => onChange({ provider: event.target.value as SttProvider | "" })}
          >
            <option value="">Default (sarvam)</option>
            <option value="sarvam">Sarvam</option>
            <option value="cartesia">Cartesia</option>
            <option value="deepgram">Deepgram</option>
            <option value="openai">OpenAI</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stt-model">Model</Label>
          <Input id="stt-model" className="font-mono" value={values.model} onChange={(event) => onChange({ model: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stt-language">Language</Label>
          <Input
            id="stt-language"
            placeholder="for example en-US, hi-IN or auto"
            value={values.language}
            onChange={(event) => onChange({ language: event.target.value })}
          />
        </div>
      </div>

      <AssistantPicker value={values.assistantId} onChange={(assistantId) => onChange({ assistantId })} />
      <ProviderKeyField value={values.providerKey} onChange={(providerKey) => onChange({ providerKey })} />

      <div className="flex items-center gap-3">
        {busy ? (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <span role="status" className="text-sm text-muted-foreground">
              Transcribing…
            </span>
          </>
        ) : (
          <Button type="submit" disabled={!canSend}>
            Transcribe
          </Button>
        )}
      </div>
    </form>
  );
}
