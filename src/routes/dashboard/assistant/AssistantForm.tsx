import { Dispatch, ReactNode, SetStateAction, useState, useEffect } from "react";
import { Plus, Trash2, Wrench, X, AlertTriangle, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AssistantDetail, AssistantMode, SttProvider, TtsProvider } from "@/types/assistant";
import { ToolSummary } from "@/types/tool";
import { cn } from "@/lib/utils";
import { MODES, modeAccent } from "@/lib/assistantModes";
import { emptyForm } from "./constants";
import { 
  LANGUAGE_CODES, 
  STT_PROVIDERS, 
  TTS_PROVIDERS, 
  findProvider,
  getSttModelError,
  getLlmKnobError,
  getLanguageCodeError
} from "./providerCatalog";
import { 
  applyModeChange, 
  applySttProvider, 
  applyTtsProvider,
  getProviderModeError,
  getModelModeError,
  validateAndRepairLlmConfig
} from "./assistantConfig";
import { AudioChain } from "./AudioChain";
import { FieldRow } from "./FieldRow";
import { LlmSection } from "./LlmSection";
import { PromptEditor } from "./PromptEditor";
import { SttSection } from "./SttSection";
import { TtsSection } from "./TtsSection";

interface AssistantFormProps {
  mode: "create" | "edit" | "empty";
  formData: AssistantDetail;
  setFormData: Dispatch<SetStateAction<AssistantDetail>>;
  audioList: { audio_id: string; audio_name: string; s3_url?: string }[];
  /** `_id` is the legacy key some backend responses still use instead of `tool_id`. */
  allTools: (ToolSummary & { _id?: string })[];
  attachedToolIds: string[];
  selectedToolToAdd: string;
  setSelectedToolToAdd: (toolId: string) => void;
  onToggleTool: (toolId: string, attach: boolean) => void;
}

/** A titled group of settings, matching the rhythm of the provider stages above it. */
function SettingsPanel({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 pt-2">
      <div className="grid gap-1">
        <h3 className="text-[1.0625rem] font-semibold tracking-tight">{title}</h3>
        <p className="text-[0.8125rem] leading-6 text-muted-foreground">{blurb}</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-1 sm:px-6">
        <div className="divide-y divide-border/40">{children}</div>
      </div>
    </section>
  );
}

/** Validation error display component */
function ValidationError({ error }: { error: string }) {
  if (!error) return null;
  
  return (
    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    </div>
  );
}

/**
 * The assistant editor body — every field of an assistant except its name, which the page
 * header owns. Purely controlled: all writes go through `setFormData`, except tool attachment,
 * which is a server call the page performs.
 *
 * The three provider stages render in the order audio moves through them, on a shared rail, so
 * the mode's effect on the chain is visible rather than implied.
 */
export function AssistantForm({
  mode,
  formData,
  setFormData,
  audioList,
  allTools,
  attachedToolIds,
  selectedToolToAdd,
  setSelectedToolToAdd,
  onToggleTool,
}: AssistantFormProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const updateField = (field: keyof AssistantDetail, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateInteractionConfig = (field: keyof NonNullable<AssistantDetail["assistant_interaction_config"]>, value: any) => {
    setFormData((prev) => ({
      ...prev,
      assistant_interaction_config: {
        ...(prev.assistant_interaction_config || emptyForm.assistant_interaction_config!),
        [field]: value,
      },
    }));
  };

  const updateGreetingAudio = (key: "enabled" | "audio_id", value: boolean | string) => {
    setFormData((prev) => ({
      ...prev,
      assistant_greeting_audio: {
        ...(prev.assistant_greeting_audio || { enabled: false, audio_id: "" }),
        [key]: value,
      },
    }));
  };

  const selectedLanguages = formData.assistant_interaction_config?.preferred_languages ?? [];

  // Keep the stored order stable in LANGUAGE_CODES order, so the chips don't reshuffle
  // as the user checks boxes.
  const toggleLanguage = (code: string) => {
    const next = selectedLanguages.includes(code)
      ? selectedLanguages.filter((c) => c !== code)
      : LANGUAGE_CODES.filter((c) => c === code || selectedLanguages.includes(c));
    updateInteractionConfig("preferred_languages", [...next]);
  };

  const isRealtimeMode = formData.assistant_mode === "realtime";
  const isCascadeMode = formData.assistant_mode === "cascade";

  // Validate configuration on changes
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    // Validate LLM provider/mode compatibility
    const llmProvider = formData.assistant_llm_config?.provider || "openai";
    const llmProviderError = getProviderModeError(formData.assistant_mode, 'llm', llmProvider);
    if (llmProviderError) {
      errors.llmProvider = llmProviderError;
    }
    
    // Validate LLM model/mode compatibility
    const llmModel = formData.assistant_llm_config?.model;
    if (llmModel) {
      const llmModelError = getModelModeError(formData.assistant_mode, llmProvider, llmModel);
      if (llmModelError) {
        errors.llmModel = llmModelError;
      }
    }
    
    // Validate LLM generation knobs
    if (formData.assistant_mode === "cascade" && formData.assistant_llm_config?.model) {
      const llmConfig = formData.assistant_llm_config;
      const model = llmConfig.model;
      
      if (llmConfig.temperature !== undefined) {
        const tempError = getLlmKnobError("temperature", model);
        if (tempError) errors.llmTemperature = tempError;
      }
      
      if (llmConfig.reasoning_effort !== undefined) {
        const effortError = getLlmKnobError("reasoning_effort", model);
        if (effortError) errors.llmReasoningEffort = effortError;
      }
      
      if (llmConfig.verbosity !== undefined) {
        const verbosityError = getLlmKnobError("verbosity", model);
        if (verbosityError) errors.llmVerbosity = verbosityError;
      }
    }
    
    // Validate STT provider/mode compatibility (except in realtime where it's ignored)
    if (!isRealtimeMode) {
      const sttProviderError = getProviderModeError(formData.assistant_mode, 'stt', formData.assistant_stt_model);
      if (sttProviderError) {
        errors.sttProvider = sttProviderError;
      }
      
      // Validate STT model configuration
      const sttConfig = (formData.assistant_stt_config as Record<string, unknown>) || {};
      const sttModel = (sttConfig.model as string) || 
        (findProvider(STT_PROVIDERS, formData.assistant_stt_model)?.fields.find(f => f.key === "model")?.fallback as string) || "";
        
      if (sttModel) {
        const sttModelError = getSttModelError(formData.assistant_stt_model, sttModel, sttConfig);
        if (sttModelError) {
          errors.sttModel = sttModelError;
        }
      }
      
      // Validate STT language codes
      if (sttConfig.language && formData.assistant_stt_model !== "elevenlabs") {
        const langError = getLanguageCodeError(formData.assistant_stt_model, sttConfig.language as string);
        if (langError) errors.sttLanguage = langError;
      }
      
      if (sttConfig.language_code && formData.assistant_stt_model === "elevenlabs") {
        const langError = getLanguageCodeError(formData.assistant_stt_model, sttConfig.language_code as string);
        if (langError) errors.sttLanguage = langError;
      }
    }
    
    // Validate TTS provider/mode compatibility (except in realtime where it's ignored)
    if (!isRealtimeMode) {
      const ttsProviderError = getProviderModeError(formData.assistant_mode, 'tts', formData.assistant_tts_model);
      if (ttsProviderError) {
        errors.ttsProvider = ttsProviderError;
      }
    }
    
    setValidationErrors(errors);
  }, [formData, isRealtimeMode]);

  // Short labels for the chain diagram. The stage sections build their own, richer summaries; the
  // diagram only has room for "who is doing this job", so it stops at provider plus model.
  const sttConfig = (formData.assistant_stt_config ?? {}) as Record<string, unknown>;
  const llmProvider = formData.assistant_llm_config?.provider === "gemini" ? "Gemini" : "OpenAI";
  const chainLabels = {
    stt: [
      findProvider(STT_PROVIDERS, formData.assistant_stt_model)?.label ?? formData.assistant_stt_model,
      typeof sttConfig.model === "string" ? sttConfig.model : undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    llm: [llmProvider, formData.assistant_llm_config?.model?.trim()].filter(Boolean).join(" · "),
    tts: findProvider(TTS_PROVIDERS, formData.assistant_tts_model)?.label ?? formData.assistant_tts_model,
  };

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-8 p-4 pb-20 md:space-y-10 md:p-8">
        {/* Validation Errors */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Configuration Issues Detected
            </h3>
            <p className="mt-1 text-sm text-destructive/80">
              Please review and correct the following issues before saving:
            </p>
            <ul className="mt-3 space-y-2">
              {Object.entries(validationErrors).map(([key, error]) => (
                <li key={key} className="text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive/70" />
                  <span>
                    <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span> {error}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* General Configuration */}
        <div className="grid gap-6">
          {mode === "create" && (
            <div className="grid gap-2">
              <Label>Assistant Name *</Label>
              <Input
                placeholder="e.g. Support Bot"
                value={formData.assistant_name}
                onChange={(e) => updateField("assistant_name", e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="assistant-description">Assistant description *</Label>
            <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
              What this assistant is for, in your own words. Internal only — callers never hear it.
            </p>
            <Textarea
              id="assistant-description"
              placeholder="Calls lapsed Enterprise accounts about renewal, books a callback with the account manager if the customer is interested."
              className="min-h-[5rem] resize-y"
              value={formData.assistant_description}
              onChange={(e) => updateField("assistant_description", e.target.value)}
            />
          </div>

          <section className="grid gap-4">
            <div className="grid gap-1">
              <h3 className="text-[1.0625rem] font-semibold tracking-tight">Mode</h3>
              <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
                How many models run the call, and how they are wired together. Changing this rewires
                the chain below and clears anything the new mode cannot run.
              </p>
            </div>

            <RadioGroup
              value={formData.assistant_mode}
              onValueChange={(value) => setFormData((prev) => applyModeChange(prev, value as AssistantMode))}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {MODES.map((option) => {
                const selected = formData.assistant_mode === option.value;
                return (
                  <Label
                    key={option.value}
                    htmlFor={`mode-${option.value}`}
                    className={cn(
                      "grid cursor-pointer gap-2 rounded-xl border p-4 transition-colors",
                      selected ? modeAccent(option.value).card : "border-border/60 bg-background/40 hover:bg-card/60",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <RadioGroupItem id={`mode-${option.value}`} value={option.value} className="shrink-0" />
                      <span
                        className={cn(
                          "min-w-0 break-words text-sm font-semibold",
                          selected && modeAccent(option.value).text,
                        )}
                      >
                        {option.title}
                      </span>
                    </span>
                    <span className="text-[0.8125rem] leading-6 text-muted-foreground">{option.what}</span>
                    <span className="text-[0.8125rem] leading-6 text-muted-foreground">
                      <span className="text-foreground/70">Pick it when:</span> {option.pickWhen}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      {option.vendors}
                    </span>
                    {option.value === "realtime" && (
                      <span className="text-[0.75rem] leading-5 text-muted-foreground">
                        <strong>Note:</strong> Gemini LLM only available in this mode. TTS stage not used.
                      </span>
                    )}
                    {option.value === "pipeline" && (
                      <span className="text-[0.75rem] leading-5 text-muted-foreground">
                        <strong>Note:</strong> STT limited to Sarvam/Native. OpenAI LLM only.
                      </span>
                    )}
                    {option.value === "cascade" && (
                      <span className="text-[0.75rem] leading-5 text-muted-foreground">
                        <strong>Note:</strong> Full provider flexibility. OpenAI LLM only.
                      </span>
                    )}
                  </Label>
                );
              })}
            </RadioGroup>

            <AudioChain
              mode={formData.assistant_mode}
              stt={chainLabels.stt}
              llm={chainLabels.llm}
              tts={chainLabels.tts}
            />
          </section>
        </div>

        <PromptEditor
          prompt={formData.assistant_prompt}
          startInstruction={formData.assistant_start_instruction}
          onPromptChange={(value) => updateField("assistant_prompt", value)}
          onStartInstructionChange={(value) => updateField("assistant_start_instruction", value)}
        />

        {/*
          The stages, composed to match the mode rather than always drawing three. Realtime has one
          model doing all three jobs; pipeline has two stages plus a transcript tap hanging off the
          model; only cascade is a genuine three-stage chain.
        */}
        <section className="grid gap-4">
          <div className="grid gap-1">
            <h3 className="text-[1.0625rem] font-semibold tracking-tight">Models</h3>
            <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
              {isRealtimeMode
                ? "One model, in the order the call runs it."
                : "Each stage of the chain above, in the order the call runs them."}{" "}
              API keys come from your Integrations page.
            </p>
          </div>

          <div className="pt-2">
            {isCascadeMode && (
              <SttSection
                step={1}
                mode={formData.assistant_mode}
                sttModel={formData.assistant_stt_model}
                sttConfig={formData.assistant_stt_config}
                onProviderChange={(provider: SttProvider) => setFormData((prev) => applySttProvider(prev, provider))}
                onConfigChange={(config) => updateField("assistant_stt_config", config)}
              />
            )}

            <LlmSection
              step={isCascadeMode ? 2 : 1}
              last={isRealtimeMode}
              mode={formData.assistant_mode}
              llmConfig={formData.assistant_llm_config}
              hasTools={attachedToolIds.length > 0 || (formData.assistant_end_call_enabled ?? false)}
              onChange={(patch) =>
                setFormData((prev) => ({
                  ...prev,
                  assistant_llm_config: { ...(prev.assistant_llm_config ?? {}), ...patch },
                }))
              }
            />

            {/* Pipeline only: a side channel off the model above, so it is drawn hanging off it. */}
            {formData.assistant_mode === "pipeline" && (
              <SttSection
                nested
                step={1}
                mode={formData.assistant_mode}
                sttModel={formData.assistant_stt_model}
                sttConfig={formData.assistant_stt_config}
                onProviderChange={(provider: SttProvider) => setFormData((prev) => applySttProvider(prev, provider))}
                onConfigChange={(config) => updateField("assistant_stt_config", config)}
              />
            )}

            {isRealtimeMode ? (
              <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-1 sm:px-6">
                <div className="py-5 text-center text-muted-foreground">
                  <Volume2 className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  <p className="text-sm">In Realtime mode, the assistant's model speaks its own audio, so this stage is not needed.</p>
                </div>
              </div>
            ) : (
              <TtsSection
                step={isCascadeMode ? 3 : 2}
                ttsModel={formData.assistant_tts_model}
                ttsConfig={formData.assistant_tts_config}
                onProviderChange={(provider: TtsProvider) => setFormData((prev) => applyTtsProvider(prev, provider))}
                onConfigChange={(config) => updateField("assistant_tts_config", config)}
              />
            )}
          </div>
        </section>

        {/* Interaction Config */}
        <SettingsPanel title="Interaction" blurb="How the assistant behaves during a live call.">
          <FieldRow
            label="Speaks first"
            inline
            help="The assistant opens the conversation instead of waiting for the caller to talk."
            control={
              <Switch
                checked={formData.assistant_interaction_config?.speaks_first}
                onCheckedChange={(v) => updateInteractionConfig("speaks_first", v)}
              />
            }
          />

          <FieldRow
            label="Filler words"
            inline
            help="Small acknowledgements while the caller is still speaking, so the line does not go silent."
            note={isRealtimeMode ? "Realtime models speak their own audio, so there is no stage that can add filler words." : undefined}
            control={
              <Switch
                checked={isRealtimeMode ? false : formData.assistant_interaction_config?.filler_words}
                onCheckedChange={(v) => updateInteractionConfig("filler_words", v)}
                disabled={isRealtimeMode}
              />
            }
          />

          <FieldRow
            label="Allow interruptions"
            inline
            help="Lets the caller talk over the opening greeting instead of having to wait it out."
            control={
              <Switch
                checked={formData.assistant_interaction_config?.allow_interruptions ?? false}
                onCheckedChange={(v) => updateInteractionConfig("allow_interruptions", v)}
              />
            }
          />

          <FieldRow
            label="Input guard window"
            help={'Seconds of caller audio ignored at the start of every reply, so "hello?" and "um" stop cutting the assistant off. It releases early when the reply ends. Raise it to catch more fillers; set 0 to always let the caller in.'}
            control={
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={formData.assistant_interaction_config?.input_guard_window_sec ?? 3.0}
                onChange={(e) => updateInteractionConfig("input_guard_window_sec", parseFloat(e.target.value) || 0)}
              />
            }
          />

          <FieldRow
            label="Silence reprompts"
            inline
            help="The assistant speaks up when the caller goes quiet, rather than waiting indefinitely."
            control={
              <Switch
                checked={formData.assistant_interaction_config?.silence_reprompts}
                onCheckedChange={(v) => updateInteractionConfig("silence_reprompts", v)}
              />
            }
          />

          {formData.assistant_interaction_config?.silence_reprompts && (
            <>
              <FieldRow
                label="Reprompt interval"
                help="Seconds of silence before the assistant speaks again."
                control={
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    max="60"
                    value={formData.assistant_interaction_config.silence_reprompt_interval}
                    onChange={(e) => updateInteractionConfig("silence_reprompt_interval", parseFloat(e.target.value) || 10.0)}
                  />
                }
              />
              <FieldRow
                label="Max reprompts"
                help="How many times it tries before ending the call."
                control={
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.assistant_interaction_config.silence_max_reprompts}
                    onChange={(e) => updateInteractionConfig("silence_max_reprompts", parseInt(e.target.value, 10) || 2)}
                  />
                }
              />
            </>
          )}

          <FieldRow
            label="Background sound"
            inline
            help="Plays room ambience under the call, so the line does not sound artificially dead."
            control={
              <Switch
                checked={formData.assistant_interaction_config?.background_sound_enabled}
                onCheckedChange={(v) => updateInteractionConfig("background_sound_enabled", v)}
              />
            }
          />

          <FieldRow
            label="Thinking sound"
            inline
            help="A soft typing sound while the model works, so a slow reply does not read as a dropped call."
            control={
              <Switch
                checked={formData.assistant_interaction_config?.thinking_sound_enabled}
                onCheckedChange={(v) => updateInteractionConfig("thinking_sound_enabled", v)}
              />
            }
          />

          <FieldRow
            label="Preferred languages"
            help="Hints the transcription prompt when the language model transcribes the call itself. It is never sent to a speech provider as a language code and never turns auto-detect off — to fix a language, set it on the transcriber above."
            control={
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {selectedLanguages.length > 0
                        ? `${selectedLanguages.length} selected`
                        : "Detect automatically"}
                      <Plus className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1" align="start">
                    <ScrollArea className="h-56">
                      <div className="grid gap-0.5 pr-2">
                        {LANGUAGE_CODES.map((code) => (
                          <label
                            key={code}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          >
                            <Checkbox
                              checked={selectedLanguages.includes(code)}
                              onCheckedChange={() => toggleLanguage(code)}
                            />
                            <span className="font-mono">{code}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {selectedLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLanguages.map((code) => (
                      <Badge key={code} variant="secondary" className="gap-1 font-mono font-normal">
                        {code}
                        <button
                          type="button"
                          onClick={() => toggleLanguage(code)}
                          aria-label={`Remove ${code}`}
                          className="rounded-sm opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            }
          />

          <FieldRow
            label="Max call duration"
            help="Minutes before the assistant says a short goodbye and hangs up. Leave empty for the 30-minute default."
            control={
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={formData.assistant_interaction_config?.max_call_duration_minutes ?? ""}
                onChange={(e) =>
                  updateInteractionConfig(
                    "max_call_duration_minutes",
                    // Blank means "no ceiling set" — send null, not 0, which the API rejects.
                    e.target.value === "" ? null : parseInt(e.target.value, 10) || null
                  )
                }
              />
            }
          />
        </SettingsPanel>

        {/* Greeting Audio Section */}
        {mode === "edit" && (
          <SettingsPanel title="Greeting" blurb="What the caller hears first.">
            <FieldRow
              label="Pre-recorded greeting"
              inline
              help="Plays an audio file instead of a model-generated opening line. Only used when the assistant speaks first."
              control={
                <Switch
                  checked={formData.assistant_greeting_audio?.enabled ?? false}
                  onCheckedChange={(v) => updateGreetingAudio("enabled", v)}
                />
              }
            />
            {formData.assistant_greeting_audio?.enabled && (
              <FieldRow
                label="Audio file"
                help="Upload files in the Audio Library, then pick one here."
                control={
                  <div className="grid gap-2">
                    <Select
                      value={formData.assistant_greeting_audio?.audio_id || ""}
                      onValueChange={(v) => updateGreetingAudio("audio_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an audio file..." />
                      </SelectTrigger>
                      <SelectContent>
                        {audioList.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">No audio files found</div>
                        ) : (
                          audioList.map((a) => (
                            <SelectItem key={a.audio_id} value={a.audio_id}>
                              {a.audio_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const selectedAudio = audioList.find(a => a.audio_id === formData.assistant_greeting_audio?.audio_id);
                      return selectedAudio?.s3_url ? (
                        <audio controls className="w-full" src={selectedAudio.s3_url} />
                      ) : null;
                    })()}
                  </div>
                }
              />
            )}
          </SettingsPanel>
        )}

        {/* End Call Config */}
        <SettingsPanel title="Ending the call" blurb="How the call wraps up, and where the record goes.">
          <FieldRow
            wide
            label="End-call webhook"
            help="The full call record is POSTed here when the call ends — transcript, duration, outcome. Leave empty to skip it."
            control={
              // A Textarea rather than an Input so a signed URL with query parameters wraps and can
              // be read end to end. Enter is swallowed — a URL has no second line.
              <Textarea
                placeholder="https://api.example.com/call-ended"
                value={formData.assistant_end_call_url}
                onChange={(e) => updateField("assistant_end_call_url", e.target.value.replace(/\n/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                spellCheck={false}
                className="min-h-[3.5rem] resize-y break-all font-mono text-sm"
              />
            }
          />

          <FieldRow
            label="Let the assistant hang up"
            inline
            help="Gives the assistant a tool to end the call itself once the conversation is done."
            control={
              <Switch
                checked={formData.assistant_end_call_enabled}
                onCheckedChange={(v) => updateField("assistant_end_call_enabled", v)}
              />
            }
          />

          {formData.assistant_end_call_enabled && (
            <>
              <FieldRow
                wide
                label="Trigger phrase"
                required
                help="What the caller says that means they are finished."
                control={
                  <Textarea
                    placeholder="e.g. Thanks, you can end the call now"
                    className="min-h-[4rem] resize-y"
                    value={formData.assistant_end_call_trigger_phrase}
                    onChange={(e) => updateField("assistant_end_call_trigger_phrase", e.target.value)}
                  />
                }
              />
              <FieldRow
                wide
                label="Sign-off"
                required
                help="The last thing the assistant says before hanging up."
                control={
                  <Textarea
                    placeholder="Thank you for your time. Have a great day!"
                    className="min-h-[4rem] resize-y"
                    value={formData.assistant_end_call_agent_message}
                    onChange={(e) => updateField("assistant_end_call_agent_message", e.target.value)}
                  />
                }
              />
            </>
          )}
        </SettingsPanel>

        {/* Tools Section (Edit Mode Only) */}
        {mode === "edit" && (
          <div className="space-y-10">
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="flex items-center gap-2 border-b border-border/50 pb-2 text-lg font-semibold">
                  <Wrench className="h-5 w-5 text-primary" />
                  Tools &amp; Capabilities
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Attach external tools and functions to allow this assistant to perform tasks during calls.
                </p>
              </div>

              {allTools.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <Select
                    value={selectedToolToAdd}
                    onValueChange={async (val) => {
                      if (val) {
                        setSelectedToolToAdd("");
                        await onToggleTool(val, true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Select a tool to attach..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTools.filter(t => !attachedToolIds.includes(t.tool_id || t._id)).length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">No more tools available</div>
                      ) : (
                        allTools
                          .filter(t => !attachedToolIds.includes(t.tool_id || t._id))
                          .map(tool => (
                            <SelectItem key={tool.tool_id || tool._id} value={tool.tool_id || tool._id}>
                              <div className="flex items-center gap-3 py-1">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{tool.tool_name}</span>
                                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {tool.tool_execution_type}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-3 pt-2">
                {attachedToolIds.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    <Wrench className="mb-3 h-8 w-8 opacity-20" />
                    <p>No tools attached yet.</p>
                    {allTools.length === 0 && (
                      <p className="mt-1 text-xs opacity-70">Create tools in the Tools section to attach them here.</p>
                    )}
                  </div>
                ) : (
                  allTools
                    .filter(tool => attachedToolIds.includes(tool.tool_id || tool._id))
                    .map(tool => {
                      const toolId = tool.tool_id || tool._id;

                      return (
                        <div
                          key={toolId}
                          className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                              <Wrench className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{tool.tool_name}</p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {tool.tool_description || "No description provided"}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {tool.tool_execution_type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onToggleTool(toolId, false)}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
