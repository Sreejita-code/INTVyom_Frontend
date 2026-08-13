import { Brain } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssistantLlmConfig, AssistantMode } from "@/types/assistant";
import { ConfigField } from "./ConfigField";
import { FieldRow } from "./FieldRow";
import { StageSection, TRIGGER_ONE_LINE } from "./StageSection";
import {
  CASCADE_LLM_FIELDS,
  OPENAI_CASCADE_MODELS,
  OPENAI_REALTIME_MODELS,
  isReasoningModel,
  llmInertReason,
} from "./providerCatalog";

interface LlmSectionProps {
  mode: AssistantMode;
  llmConfig: AssistantLlmConfig | undefined;
  onChange: (patch: Partial<AssistantLlmConfig>) => void;
  step: number;
  last?: boolean;
}

/**
 * The model that decides what to say — the one stage every mode runs.
 *
 * The two model families are mutually exclusive: pipeline and realtime talk to OpenAI's
 * realtime API, cascade talks to the chat API, and sending one family's ID to the other is
 * rejected. The mode picks the list, so the wrong ID is not reachable from the form.
 */
export function LlmSection({ mode, llmConfig, onChange, step, last }: LlmSectionProps) {
  const provider = llmConfig?.provider || "openai";
  const isCascade = mode === "cascade";
  const isRealtime = mode === "realtime";
  const isGemini = provider === "gemini";

  const models = isCascade ? OPENAI_CASCADE_MODELS : OPENAI_REALTIME_MODELS;
  const defaultModel = isCascade ? "gpt-4.1" : "gpt-realtime-1.5";
  const model = llmConfig?.model?.trim() || (isGemini ? "" : defaultModel);
  const reasoning = isReasoningModel(model);

  const summary = [
    isGemini ? "Gemini" : "OpenAI",
    model || "gemini-3.1-flash-live-preview",
    isRealtime ? llmConfig?.voice || (isGemini ? "Puck" : "marin") : undefined,
    isCascade ? (reasoning ? `effort ${llmConfig?.reasoning_effort ?? "unset"}` : `temp ${llmConfig?.temperature ?? 0.8}`) : undefined,
  ].filter(Boolean) as string[];

  /**
   * Which knobs this model throws away. Shared with `buildAssistantPayload`, which drops the same
   * keys — a control greyed here has to be absent from the save, or the call fails on every turn.
   */
  const inertReasonFor = (key: string) => llmInertReason(key, model);

  const visibleKnobs = CASCADE_LLM_FIELDS.filter((f) => !f.advanced);
  const advancedKnobs = CASCADE_LLM_FIELDS.filter((f) => f.advanced);

  return (
    <StageSection
      step={step}
      last={last}
      title={isCascade ? "Text model" : "Realtime model"}
      blurb={
        isRealtime
          ? "Hears the caller, decides the reply, and speaks it — all in one model. There is no separate transcriber or voice to configure."
          : isCascade
            ? "Reads the transcript and writes the reply as text. It never hears the caller's audio, so anything the transcriber misses is gone."
            : "Hears the caller's audio directly and writes the reply as text, which the voice stage below speaks."
      }
      icon={Brain}
      summary={summary}
      advancedCount={isCascade ? advancedKnobs.length : 0}
      advanced={
        isCascade ? (
          <>
            {advancedKnobs.map((spec) => (
              <ConfigField
                key={spec.key}
                spec={spec}
                value={(llmConfig as Record<string, any> | undefined)?.[spec.key]}
                inertReason={inertReasonFor(spec.key)}
                onChange={(value) => onChange({ [spec.key]: value })}
              />
            ))}
          </>
        ) : undefined
      }
    >
      <FieldRow
        label="Provider"
        help={
          <>
            {isRealtime
              ? "Gemini is available here only. Pipeline and cascade need a text-only response, which Gemini's Live models cannot produce."
              : "OpenAI only in this mode. Switch to realtime to use Gemini."}{" "}
            The API key comes from your Integrations page.
          </>
        }
        control={
          <Select value={provider} onValueChange={(v) => onChange({ provider: v })}>
            <SelectTrigger aria-label="Provider" className={TRIGGER_ONE_LINE}>
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
              <SelectItem value="openai">
                <span className="flex flex-col gap-0.5 py-0.5">
                  <span className="text-sm">OpenAI</span>
                  <span data-tagline className="text-xs leading-5 text-muted-foreground">
                    {isCascade ? "Chat model driving the cascade." : "Realtime model, works in every mode."}
                  </span>
                </span>
              </SelectItem>
              {/* Gemini runs only in realtime — pipeline and cascade reject it. */}
              {isRealtime && (
                <SelectItem value="gemini">
                  <span className="flex flex-col gap-0.5 py-0.5">
                    <span className="text-sm">Gemini</span>
                    <span data-tagline className="text-xs leading-5 text-muted-foreground">
                      Live API — hears, thinks and speaks in one stream.
                    </span>
                  </span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        }
      />

      {isGemini ? (
        <FieldRow
          label="Model"
          help="Free text — Google ships new Live models often, so this is not restricted to a list. Left empty it uses gemini-3.1-flash-live-preview. A model ID that does not exist fails when the call connects, not when you save."
          control={
            <Input
              className="font-mono text-sm"
              placeholder="gemini-3.1-flash-live-preview"
              value={llmConfig?.model ?? ""}
              onChange={(e) => onChange({ model: e.target.value })}
            />
          }
        />
      ) : (
        <FieldRow
          label="Model"
          help={
            isCascade
              ? "Cascade runs a plain chat model, so these are chat model IDs. Switching this assistant to another mode swaps the list — the two families are not interchangeable."
              : "Pipeline and realtime run OpenAI's realtime models. Chat models such as gpt-4.1 belong to cascade mode and are rejected here."
          }
          control={
            <Select value={model} onValueChange={(v) => onChange({ model: v })}>
              <SelectTrigger aria-label="Model" className={TRIGGER_ONE_LINE}>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
                {models.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col gap-0.5 py-0.5">
                      <span className="font-mono text-sm">{option.label}</span>
                      {option.hint && (
                        <span data-tagline className="text-xs leading-5 text-muted-foreground">
                          {option.hint}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      )}

      {isRealtime && (
        <FieldRow
          label="Voice"
          help="The model speaks its own audio in realtime mode, so the voice comes from here rather than a text-to-speech provider."
          control={
            <Input
              value={llmConfig?.voice ?? ""}
              placeholder={isGemini ? "Puck" : "marin"}
              onChange={(e) => onChange({ voice: e.target.value })}
            />
          }
        />
      )}

      {isCascade &&
        visibleKnobs.map((spec) => (
          <ConfigField
            key={spec.key}
            spec={spec}
            value={(llmConfig as Record<string, any> | undefined)?.[spec.key]}
            inertReason={inertReasonFor(spec.key)}
            onChange={(value) => onChange({ [spec.key]: value })}
          />
        ))}
    </StageSection>
  );
}
