import { Brain, AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssistantLlmConfig, AssistantMode } from "@/types/assistant";
import { ConfigField } from "./ConfigField";
import { FieldRow } from "./FieldRow";
import { StageSection, TRIGGER_ONE_LINE } from "./StageSection";
import {
  CASCADE_LLM_FIELDS,
  DUPLEX_BACKEND_INSTRUCTIONS_MAX,
  DUPLEX_BACKEND_MODELS,
  DUPLEX_DEFAULT_BACKEND_MODEL,
  DUPLEX_DEFAULT_VOICE,
  DUPLEX_MODEL,
  DUPLEX_VOICES,
  FieldOption,
  OPENAI_CASCADE_MODELS,
  OPENAI_REALTIME_MODELS,
  GEMINI_DEFAULT_MODEL,
  GEMINI_LIVE_MODELS,
  GEMINI_LIVE_VOICES,
  OPENAI_REALTIME_VOICES,
  RETIRED_OPENAI_MODELS,
  isReasoningModel,
  llmInertReason,
  getLlmKnobError,
} from "./providerCatalog";
import {
  getBackendInstructionsError,
  getBackendModelError,
  getModelModeError,
  getProviderModeError,
  knobModelFor,
} from "./assistantConfig";

/**
 * The option list, plus the stored value when the list no longer offers it. A Radix `Select` whose
 * value is missing from its items renders an empty trigger, which reads as data loss — and a
 * retired model that is still stored has to stay visible so it can be moved.
 */
const withStoredOption = (options: FieldOption[], current?: string): FieldOption[] => {
  if (!current || options.some((o) => o.value === current)) return options;
  const replacement = RETIRED_OPENAI_MODELS[current];
  return [
    { value: current, label: current, hint: replacement ? `Retired. Switch to ${replacement}.` : "Not offered in this mode." },
    ...options,
  ];
};

interface LlmSectionProps {
  mode: AssistantMode;
  llmConfig: AssistantLlmConfig | undefined;
  onChange: (patch: Partial<AssistantLlmConfig>) => void;
  step: number;
  last?: boolean;
  hasTools?: boolean;
}

/**
 * The model that decides what to say — the one stage every mode runs.
 */
export function LlmSection({ mode, llmConfig, onChange, step, last, hasTools }: LlmSectionProps) {
  const provider = llmConfig?.provider || "openai";
  const isCascade = mode === "cascade";
  const isRealtime = mode === "realtime";
  const isDuplex = mode === "duplex";
  const isGemini = provider === "gemini";
  // Cascade and duplex both read the generation knobs, but duplex checks them against the backend
  // model and rejects temperature (every backend model is a reasoning model).
  const readsKnobs = isCascade || isDuplex;

  const models = isCascade ? OPENAI_CASCADE_MODELS : OPENAI_REALTIME_MODELS;
  const defaultModel = isCascade
    ? "gpt-4.1"
    : isDuplex
      ? DUPLEX_MODEL
      : isGemini
        ? GEMINI_DEFAULT_MODEL
        : "gpt-realtime-1.5";
  const model = isDuplex ? DUPLEX_MODEL : llmConfig?.model?.trim() || defaultModel;
  const backendModel = llmConfig?.backend_model?.trim() || DUPLEX_DEFAULT_BACKEND_MODEL;
  const knobModel = knobModelFor(mode, llmConfig) ?? model;
  const reasoning = isReasoningModel(knobModel);
  const backendInstructions = llmConfig?.backend_instructions ?? "";

  // Validation
  const providerError = getProviderModeError(mode, 'llm', provider);
  const modelError = model ? getModelModeError(mode, provider, model) : null;
  const backendModelError = isDuplex ? getBackendModelError(backendModel) : null;
  const backendInstructionsError = isDuplex ? getBackendInstructionsError(backendInstructions) : null;
  
  // Generation knob validation
  const knobErrors: string[] = [];
  if (readsKnobs && knobModel) {
    if (!isDuplex && llmConfig?.temperature !== undefined) {
      const tempError = getLlmKnobError("temperature", knobModel, hasTools, llmConfig?.temperature);
      if (tempError) knobErrors.push(tempError);
    }
    
    if (llmConfig?.reasoning_effort !== undefined) {
      const effortError = getLlmKnobError("reasoning_effort", knobModel, hasTools, llmConfig?.reasoning_effort);
      if (effortError) knobErrors.push(effortError);
    }
    
    if (llmConfig?.verbosity !== undefined) {
      const verbosityError = getLlmKnobError("verbosity", knobModel, hasTools, llmConfig?.verbosity);
      if (verbosityError) knobErrors.push(verbosityError);
    }
  }

  const summary = [
    isGemini ? "Gemini" : "OpenAI",
    model,
    isRealtime ? llmConfig?.voice || (isGemini ? "Puck" : "marin") : undefined,
    isDuplex ? llmConfig?.voice || DUPLEX_DEFAULT_VOICE : undefined,
    isDuplex ? `backend ${backendModel}` : undefined,
    isCascade ? (reasoning ? `effort ${llmConfig?.reasoning_effort ?? "unset"}` : `temp ${llmConfig?.temperature ?? 0.8}`) : undefined,
  ].filter(Boolean) as string[];

  const inertReasonFor = (key: string) => llmInertReason(key, knobModel, hasTools, (llmConfig as Record<string, any>)?.[key]);

  // Duplex has no temperature knob at all, rather than a greyed one.
  const knobs = isDuplex ? CASCADE_LLM_FIELDS.filter((f) => f.key !== "temperature") : CASCADE_LLM_FIELDS;
  const visibleKnobs = knobs.filter((f) => !f.advanced);
  const advancedKnobs = knobs.filter((f) => f.advanced);

  return (
    <StageSection
      step={step}
      last={last}
      title={isCascade ? "Text model" : isDuplex ? "Voice model" : "Realtime model"}
      blurb={
        isDuplex
          ? "GPT-Live hears the caller and speaks at the same time, and decides for itself when to talk and when to stop. It is a voice model, not a thinker: anything that needs reasoning or a tool goes to the backend model below."
          : isRealtime
          ? "Hears the caller, decides the reply, and speaks it — all in one model, in the voice you pick below. There is no separate transcriber or speech provider."
          : isCascade
            ? "Reads the transcript and writes the reply as text. It never hears the caller's audio, so anything the transcriber misses is gone."
            : "Hears the caller's audio directly and writes the reply as text, which the voice stage below speaks."
      }
      icon={Brain}
      summary={summary}
      advancedCount={readsKnobs ? advancedKnobs.length : 0}
      advanced={
        readsKnobs ? (
          <>
            {knobErrors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-medium">Configuration Issues:</span>
                    <ul className="mt-1 ml-4 list-disc space-y-1">
                      {knobErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
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
      {(providerError || modelError || backendModelError || backendInstructionsError) && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
            <div>
              <span className="font-medium">Configuration Issues:</span>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                {providerError && <li>{providerError}</li>}
                {modelError && <li>{modelError}</li>}
                {backendModelError && <li>{backendModelError}</li>}
                {backendInstructionsError && <li>{backendInstructionsError}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
      <FieldRow
        label="Provider"
        help={
          <>
            {isRealtime
              ? "Gemini is available here only. Pipeline and cascade need a text-only response, which Gemini's Live models cannot produce."
              : "OpenAI only in this mode. Switch to realtime to use Gemini."}{" "}
            The provider key comes from your Provider Keys page.
          </>
        }
        control={
          <Select value={provider} onValueChange={(v) => onChange({ provider: v })}>
            <SelectTrigger aria-label="Provider" className={TRIGGER_ONE_LINE}>
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
              <SelectItem value="openai">
                <span className="flex flex-col gap-1 py-0.5">
                  <span className="text-sm">OpenAI</span>
                  <span data-tagline className="text-xs leading-5 text-muted-foreground">
                    {isCascade ? "Chat model driving the cascade." : "Realtime model, works in every mode."}
                  </span>
                </span>
              </SelectItem>
              {isRealtime ? (
                <SelectItem value="gemini">
                  <span className="flex flex-col gap-1 py-0.5">
                    <span className="text-sm">Gemini</span>
                    <span data-tagline className="text-xs leading-5 text-muted-foreground">
                      Live API — hears, thinks and speaks in one stream. Available only in Realtime mode.
                    </span>
                  </span>
                </SelectItem>
              ) : (
                <SelectItem value="gemini" disabled>
                  <span className="flex flex-col gap-1 py-0.5 opacity-50">
                    <span className="text-sm">Gemini</span>
                    <span data-tagline className="text-xs leading-5 text-muted-foreground">
                      Live API — hears, thinks and speaks in one stream. Only available in Realtime mode.
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
          help="Google Gemini Live model. Non-Live models (such as gemini-2.5-flash) are rejected by the backend at save."
          control={
            <Select
              value={model}
              onValueChange={(v) => onChange({ model: v })}
            >
              <SelectTrigger aria-label="Model" className={TRIGGER_ONE_LINE}>
                <SelectValue placeholder="Select a Gemini Live model" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
                {GEMINI_LIVE_MODELS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col gap-1 py-0.5">
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
      ) : isDuplex ? (
        <FieldRow
          label="Model"
          help="GPT-Live is the only model duplex runs, so there is nothing to choose."
          control={<Input aria-label="Model" value={DUPLEX_MODEL} readOnly disabled className="font-mono text-sm" />}
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
                {withStoredOption(models, llmConfig?.model?.trim()).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col gap-1 py-0.5">
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

      {(isRealtime || isDuplex) && (
        <FieldRow
          label="Voice"
          help={
            isDuplex
              ? "GPT-Live speaks its own audio. The voice is fixed for the whole call."
              : "The model speaks its own audio in realtime mode, so the voice comes from here rather than a text-to-speech provider."
          }
          control={
            <Select
              value={llmConfig?.voice || (isDuplex ? DUPLEX_DEFAULT_VOICE : isGemini ? "Puck" : "marin")}
              onValueChange={(v) => onChange({ voice: v })}
            >
              <SelectTrigger aria-label="Voice" className={TRIGGER_ONE_LINE}>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
                {(isDuplex ? DUPLEX_VOICES : isGemini ? GEMINI_LIVE_VOICES : OPENAI_REALTIME_VOICES).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col gap-1 py-0.5">
                      <span className="text-sm">{option.label}</span>
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

      {isDuplex && (
        <>
          <FieldRow
            label="Backend model"
            help="The reasoning model GPT-Live hands thinking and tool calls to. Its answer comes back to GPT-Live, which says it in its own voice. The generation knobs below are checked against this model."
            control={
              <Select value={backendModel} onValueChange={(v) => onChange({ backend_model: v })}>
                <SelectTrigger aria-label="Backend model" className={TRIGGER_ONE_LINE}>
                  <SelectValue placeholder="Select a backend model" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(24rem,calc(100vw-2rem))]">
                  {withStoredOption(DUPLEX_BACKEND_MODELS, backendModel).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col gap-1 py-0.5">
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
          <FieldRow
            label="Backend instructions"
            help={`How the backend model should handle delegated work. The prompt above is the voice persona; this is a separate set for the backend. Fixed for the call. ${backendInstructions.length}/${DUPLEX_BACKEND_INSTRUCTIONS_MAX} characters.`}
            control={
              <Textarea
                aria-label="Backend instructions"
                className="min-h-[5rem] resize-y"
                placeholder="Use the tools when needed and answer briefly."
                value={backendInstructions}
                onChange={(e) => onChange({ backend_instructions: e.target.value })}
              />
            }
          />
        </>
      )}

      {readsKnobs &&
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
