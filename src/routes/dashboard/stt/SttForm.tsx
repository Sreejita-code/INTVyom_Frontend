import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssistantPicker } from "@/components/common/AssistantPicker";
import { OptionalConfiguration } from "@/components/common/OptionalConfiguration";
import { ProviderKeyField } from "@/components/common/ProviderKeyField";
import { SuggestionInput } from "@/components/common/SuggestionInput";
import { friendlyLanguage } from "@/lib/optionNames";
import { STT_PROVIDERS } from "@/routes/dashboard/assistant/providerCatalog";
import type { SttProvider } from "@/types/stt";
import { RECORDER_MESSAGES, useAudioRecorder } from "./useAudioRecorder";
import {
  audioFileError,
  EMPTY_STT_VALUES,
  sttLanguageOptions,
  sttModelOptions,
} from "./sttRules";

const DEFAULT_PROVIDER = "__default__";

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

const formatElapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function SttForm({
  values,
  fileError,
  onChange,
  onFile,
  onSend,
  onCancel,
  busy,
}: SttFormProps) {
  const recorder = useAudioRecorder(onFile);
  const canSend = values.file !== null && !fileError;
  const sendRef = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const modelOptions = sttModelOptions(values.provider);
  const languageOptions = sttLanguageOptions(values.provider);

  // After a Cancel, focus returns to the send control so the next attempt needs no tabbing.
  useEffect(() => {
    if (!busy && cancelled.current) {
      cancelled.current = false;
      sendRef.current?.focus();
    }
  }, [busy]);

  useEffect(() => {
    if (!values.file || fileError) {
      setPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(values.file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [fileError, values.file]);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend && !busy) onSend();
      }}
    >
      <section
        role="group"
        aria-label="Audio input"
        className="space-y-4 rounded-lg border border-border/60 bg-card/20 p-4"
      >
        <h2 className="text-sm font-medium text-foreground">Audio</h2>
        <div className="flex flex-wrap items-center gap-3">
          {recorder.state === "recording" ? (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={recorder.stop}
                aria-pressed="true"
              >
                Stop recording
              </Button>
              <span
                role="timer"
                className="font-mono text-sm text-muted-foreground"
              >
                {formatElapsed(recorder.elapsed)}
              </span>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={recorder.start}
              aria-pressed="false"
            >
              Start recording
            </Button>
          )}
        </div>
        {recorder.state === "denied" || recorder.state === "unavailable" ? (
          <p role="status" className="text-sm text-muted-foreground">
            {RECORDER_MESSAGES[recorder.state]}
          </p>
        ) : null}
        <div className="space-y-2">
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
          <p className="text-xs text-muted-foreground">
            wav, mp3, ogg, webm or m4a, up to 25 MB.
          </p>
        </div>
        {values.file && !fileError && previewUrl ? (
          <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
            <p className="text-sm text-foreground">
              Ready: {values.file.name} (
              {Math.max(1, Math.round(values.file.size / 1024))} KB)
            </p>
            <audio
              aria-label="Audio preview"
              className="w-full"
              controls
              preload="metadata"
              src={previewUrl}
            />
          </div>
        ) : null}
        {fileError ? (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
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
              <span role="status" className="text-sm text-muted-foreground">
                Transcribing…
              </span>
            </>
          ) : (
            <Button ref={sendRef} type="submit" disabled={!canSend}>
              Transcribe
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 p-4">
        <h2 className="mb-4 text-sm font-medium text-foreground">
          Transcription options
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stt-provider">Provider</Label>
            <Select
              value={values.provider || DEFAULT_PROVIDER}
              onValueChange={(next) =>
                onChange({
                  provider:
                    next === DEFAULT_PROVIDER ? "" : (next as SttProvider),
                })
              }
            >
              <SelectTrigger id="stt-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_PROVIDER}>
                  Default (Sarvam)
                </SelectItem>
                {STT_PROVIDERS.filter((p) => p.value !== "native").map(
                  (provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <SuggestionInput
            id="stt-model"
            label="Model"
            value={values.model}
            options={modelOptions}
            onChange={(model) => onChange({ model })}
            mono
          />
          <SuggestionInput
            id="stt-language"
            label="Language"
            value={values.language}
            options={languageOptions}
            placeholder="for example en-US, hi-IN or auto"
            onChange={(language) => onChange({ language })}
            formatOption={friendlyLanguage}
          />
        </div>
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
