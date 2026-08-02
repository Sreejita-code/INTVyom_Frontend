import { Dispatch, SetStateAction } from "react";
import { Plus, Trash2, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { AssistantDetail } from "@/types/assistant";
import { ToolSummary } from "@/types/tool";
import { cn } from "@/lib/utils";
import { CASCADE_LLM_MODELS, LANGUAGE_CODES, STT_MODE_DESCRIPTIONS, emptyForm } from "./constants";

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

/**
 * The assistant editor body — every field of an assistant except its name, which
 * the page header owns. Purely controlled: all writes go through `setFormData`,
 * except tool attachment, which is a server call the page performs.
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
  const updateField = (field: keyof AssistantDetail, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateTTS = (field: "voice_id" | "target_language_code", value: string) => {
    setFormData((prev) => ({ ...prev, assistant_tts_config: { ...prev.assistant_tts_config, [field]: value } }));
  };

  const updateSTT = (field: "model" | "language" | "mode", value: string) => {
    setFormData((prev) => ({ ...prev, assistant_stt_config: { ...prev.assistant_stt_config, [field]: value } }));
  };

  const updateLLMConfig = (field: keyof NonNullable<AssistantDetail["assistant_llm_config"]>, value: string) => {
    setFormData((prev) => ({
      ...prev,
      assistant_llm_config: {
        ...(prev.assistant_llm_config || emptyForm.assistant_llm_config!),
        [field]: value,
      },
    }));
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

  return (
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 md:space-y-10 pb-20">

                  {/* General Configuration */}
                  <div className="grid gap-6">
                    {mode === "create" && (
                      <>
                        <div className="grid gap-2">
                          <Label>Assistant Name *</Label>
                          <Input
                            placeholder="e.g. Support Bot"
                            value={formData.assistant_name}
                            onChange={(e) => updateField("assistant_name", e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <div className="grid gap-2">
                      <Label>Assistant Description *</Label>
                      <Input
                        placeholder="Briefly describe the assistant purpose"
                        value={formData.assistant_description}
                        onChange={(e) => updateField("assistant_description", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2 rounded-xl border border-border/60 bg-card/60 p-4">
                      <Label className="text-base font-semibold">Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose how speech and model processing are orchestrated.
                      </p>
                      <RadioGroup
                        value={formData.assistant_mode}
                        onValueChange={(value) => {
                          const nextMode = value as "pipeline" | "realtime" | "cascade";
                          if (nextMode === "pipeline" && formData.assistant_stt_model === "cartesia") {
                            // cartesia STT is cascade-only — fall back to sarvam.
                            setFormData(prev => ({
                              ...prev,
                              assistant_mode: nextMode,
                              assistant_stt_model: "sarvam",
                              assistant_stt_config: { model: "saaras:v3", language: "unknown" },
                            }));
                            return;
                          }
                          if (nextMode === "cascade") {
                            setFormData(prev => ({
                              ...prev,
                              assistant_mode: nextMode,
                              // native STT is rejected in cascade — fall back to sarvam.
                              ...(prev.assistant_stt_model === "native"
                                ? { assistant_stt_model: "sarvam", assistant_stt_config: { model: "saaras:v3", language: "unknown", mode: "codemix" } }
                                : {}),
                              // cascade runs an OpenAI chat model — force provider and default the model.
                              assistant_llm_config: {
                                ...(prev.assistant_llm_config || {}),
                                provider: "openai",
                                model: prev.assistant_llm_config?.model?.trim() || "gpt-4.1",
                              },
                            }));
                            return;
                          }
                          updateField("assistant_mode", nextMode);
                        }}
                        className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3"
                      >
                        <Label
                          htmlFor="mode-pipeline"
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                            formData.assistant_mode === "pipeline" ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-border/60 bg-background/40",
                          )}
                        >
                          <RadioGroupItem id="mode-pipeline" value="pipeline" />
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold">Pipeline</p>
                            <p className="text-xs text-muted-foreground">STT and LLM run in the core flow; TTS is handled as a separate stage.</p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="mode-realtime"
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                            isRealtimeMode ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-border/60 bg-background/40",
                          )}
                        >
                          <RadioGroupItem id="mode-realtime" value="realtime" />
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold">Realtime</p>
                            <p className="text-xs text-muted-foreground">STT, LLM, and TTS run together in one realtime interaction loop.</p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="mode-cascade"
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                            isCascadeMode ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-border/60 bg-background/40",
                          )}
                        >
                          <RadioGroupItem id="mode-cascade" value="cascade" />
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold">Cascade</p>
                            <p className="text-xs text-muted-foreground">True STT → LLM → TTS pipeline — external STT feeds a chat model that drives the TTS stage.</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {mode === "edit" ? <h3 className="text-lg font-semibold border-b border-border/50 pb-2">System Prompt *</h3> : <Label className="text-base font-semibold">System Prompt *</Label>}
                    <Textarea
                      placeholder="You are a helpful support agent..."
                      className="min-h-[150px] font-mono text-sm leading-relaxed"
                      value={formData.assistant_prompt}
                      onChange={(e) => updateField("assistant_prompt", e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="text-base font-semibold">Start Instruction</Label>
                      <Input placeholder="Hello, how can I help you today?" value={formData.assistant_start_instruction} onChange={(e) => updateField("assistant_start_instruction", e.target.value)} />
                    </div>
                  </div>

                  {/* Language Model — identical config in both modes; key comes from Integrations */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Language Model</h3>
                    <div className="grid gap-4 rounded-xl border border-border/60 bg-card/60 p-4">
                      <div className="grid gap-2">
                        <Label>Provider</Label>
                        <Select value={formData.assistant_llm_config?.provider || "openai"} onValueChange={(v) => updateLLMConfig("provider", v)}>
                          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            {!isCascadeMode && <SelectItem value="gemini">Gemini</SelectItem>}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {isCascadeMode
                            ? "Cascade runs an OpenAI chat model; the TTS provider owns the voice."
                            : `Using your Integrations key for ${(formData.assistant_llm_config?.provider || "openai") === "gemini" ? "Gemini" : "OpenAI"}.`}
                        </p>
                      </div>

                      {isCascadeMode && (
                        <div className="grid gap-2">
                          <Label>Model</Label>
                          <Select value={formData.assistant_llm_config?.model || "gpt-4.1"} onValueChange={(v) => updateLLMConfig("model", v)}>
                            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                            <SelectContent>
                              {CASCADE_LLM_MODELS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            OpenAI chat model for the cascade LLM stage. Default: gpt-4.1.
                          </p>
                        </div>
                      )}

                      {isRealtimeMode && (
                        <div className="grid gap-2">
                          <Label>Voice</Label>
                          <Input
                            value={formData.assistant_llm_config?.voice || ""}
                            placeholder="Voice name (e.g. alloy)"
                            onChange={(e) => updateLLMConfig("voice", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Speech-to-Text — pipeline & cascade; realtime transcribes inside the model */}
                  {!isRealtimeMode && (
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Speech-to-Text</h3>
                      <div className="grid gap-4 rounded-xl border border-border/60 bg-card/60 p-4">
                        <div className="grid gap-2">
                          <Label>Model</Label>
                          <Select
                            value={formData.assistant_stt_model}
                            onValueChange={(v) => {
                              updateField("assistant_stt_model", v);
                              if (v === "sarvam") {
                                updateField("assistant_stt_config", { model: "saaras:v3", language: "unknown", mode: "codemix" });
                              } else if (v === "cartesia") {
                                updateField("assistant_stt_config", { model: "ink-whisper", language: "en-IN" });
                              } else {
                                updateField("assistant_stt_config", {});
                              }
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sarvam">Sarvam{isCascadeMode ? "" : " (Parallel)"}</SelectItem>
                              {!isCascadeMode && <SelectItem value="native">Native (LLM Transcribes)</SelectItem>}
                              {isCascadeMode && <SelectItem value="cartesia">Cartesia</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.assistant_stt_model === "sarvam" && (
                          <>
                            <div className="grid gap-2">
                              <Label>Model Version</Label>
                              <Select value={formData.assistant_stt_config.model || "saaras:v3"} onValueChange={(v) => updateSTT("model", v)}>
                                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="saaras:v3">saaras:v3</SelectItem>
                                  <SelectItem value="saaras:v2.5">saaras:v2.5</SelectItem>
                                  <SelectItem value="saarika:v2.5">saarika:v2.5</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Language</Label>
                              <Select value={formData.assistant_stt_config.language || "unknown"} onValueChange={(v) => updateSTT("language", v)}>
                                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unknown">Auto-detect</SelectItem>
                                  {LANGUAGE_CODES.map((code) => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {isCascadeMode && (
                              <div className="grid gap-2">
                                <Label>Transcription Mode</Label>
                                <Select value={formData.assistant_stt_config.mode || "codemix"} onValueChange={(v) => updateSTT("mode", v)}>
                                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="codemix">
                                      <span className="flex flex-col">
                                        <span>codemix <span className="font-normal text-primary">(recommended)</span></span>
                                        <span className="text-xs text-muted-foreground">Keeps code-switched speech (Hinglish/Tanglish) natural.</span>
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="transcribe">
                                      <span className="flex flex-col">
                                        <span>transcribe</span>
                                        <span className="text-xs text-muted-foreground">Standard transcription in the spoken language, with proper formatting and numbers.</span>
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="translate">
                                      <span className="flex flex-col">
                                        <span>translate</span>
                                        <span className="text-xs text-muted-foreground">Transcribes the speech and translates it to English.</span>
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="verbatim">
                                      <span className="flex flex-col">
                                        <span>verbatim</span>
                                        <span className="text-xs text-muted-foreground">Word-for-word — keeps filler words and spoken numbers as-is.</span>
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="translit">
                                      <span className="flex flex-col">
                                        <span>translit</span>
                                        <span className="text-xs text-muted-foreground">Romanized output in Latin script (e.g. "mera phone number hai 9840950950").</span>
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  {STT_MODE_DESCRIPTIONS[formData.assistant_stt_config.mode || "codemix"]} Only applies in cascade mode with saaras:v3.
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {formData.assistant_stt_model === "cartesia" && (
                          <>
                            <div className="grid gap-2">
                              <Label>Model</Label>
                              <Select value={formData.assistant_stt_config.model || "ink-whisper"} onValueChange={(v) => updateSTT("model", v)}>
                                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ink-whisper">ink-whisper (multilingual)</SelectItem>
                                  <SelectItem value="ink-2">ink-2 (English only)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Language</Label>
                              <Select value={formData.assistant_stt_config.language || "en-IN"} onValueChange={(v) => updateSTT("language", v)}>
                                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                                <SelectContent>
                                  {LANGUAGE_CODES.map((code) => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Fixed language — no auto-detect. Use Sarvam if the caller may switch languages.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Voice (Text-to-Speech) — pipeline & cascade; realtime voice lives in the model above */}
                  {!isRealtimeMode && (
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Voice (Text-to-Speech)</h3>
                      <div className="grid gap-4 rounded-xl border border-border/60 bg-card/60 p-4">
                        <div className="grid gap-2">
                          <Label>Model</Label>
                          <Select value={formData.assistant_tts_model} onValueChange={(v) => updateField("assistant_tts_model", v)}>
                            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cartesia">Cartesia</SelectItem>
                              <SelectItem value="sarvam">Sarvam</SelectItem>
                              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                              <SelectItem value="mistral">Mistral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label>Voice ID</Label>
                          <Input
                            placeholder="e.g. a167e0f3-df7e-4277-976b-be2f952fa275"
                            value={formData.assistant_tts_config.voice_id}
                            onChange={(e) => updateTTS("voice_id", e.target.value)}
                            className="font-mono"
                          />
                        </div>

                        {formData.assistant_tts_model === "sarvam" && (
                          <div className="grid gap-2">
                            <Label>Target Language Code</Label>
                            <Select value={formData.assistant_tts_config.target_language_code || "hi-IN"} onValueChange={(v) => updateTTS("target_language_code", v)}>
                              <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                              <SelectContent>
                                {LANGUAGE_CODES.map((code) => (
                                  <SelectItem key={code} value={code}>{code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interaction Config */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Interaction Settings</h3>
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Speaks First</Label>
                          <p className="text-sm text-muted-foreground mt-1">If enabled, the assistant initiates the conversation immediately.</p>
                        </div>
                        <Switch checked={formData.assistant_interaction_config?.speaks_first} onCheckedChange={(v) => updateInteractionConfig("speaks_first", v)} />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Filler Words</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Realtime mode always forces this off in backend.
                          </p>
                        </div>
                        <Switch
                          checked={isRealtimeMode ? false : formData.assistant_interaction_config?.filler_words}
                          onCheckedChange={(v) => updateInteractionConfig("filler_words", v)}
                          disabled={isRealtimeMode}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Allow Interruptions</Label>
                          <p className="text-sm text-muted-foreground mt-1">Let the caller talk over the opening greeting.</p>
                        </div>
                        <Switch
                          checked={formData.assistant_interaction_config?.allow_interruptions ?? false}
                          onCheckedChange={(v) => updateInteractionConfig("allow_interruptions", v)}
                        />
                      </div>

                      <div className="grid gap-2 p-4 border rounded-xl bg-card">
                        <Label>Input Guard Window (seconds)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          value={formData.assistant_interaction_config?.input_guard_window_sec ?? 3.0}
                          onChange={(e) => updateInteractionConfig("input_guard_window_sec", parseFloat(e.target.value) || 0)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ignores caller audio for this long at the start of every reply, so &ldquo;hello?&rdquo; and
                          &ldquo;um&rdquo; stop cutting the assistant off. Releases early when the reply ends.
                          Raise it to catch more fillers; set 0 to always let the caller in.
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Silence Reprompts</Label>
                          <p className="text-sm text-muted-foreground mt-1">Assistant will proactively speak if the user remains silent.</p>
                        </div>
                        <Switch checked={formData.assistant_interaction_config?.silence_reprompts} onCheckedChange={(v) => updateInteractionConfig("silence_reprompts", v)} />
                      </div>

                      {formData.assistant_interaction_config?.silence_reprompts && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 border rounded-xl bg-card/50">
                          <div className="grid gap-2">
                            <Label>Reprompt Interval (seconds)</Label>
                            <Input
                              type="number"
                              step="0.5"
                              min="1"
                              max="60"
                              value={formData.assistant_interaction_config.silence_reprompt_interval}
                              onChange={(e) => updateInteractionConfig("silence_reprompt_interval", parseFloat(e.target.value) || 10.0)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Max Reprompts</Label>
                            <Input
                              type="number"
                              min="0"
                              max="5"
                              value={formData.assistant_interaction_config.silence_max_reprompts}
                              onChange={(e) => updateInteractionConfig("silence_max_reprompts", parseInt(e.target.value, 10) || 2)}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Background Sound</Label>
                          <p className="text-sm text-muted-foreground mt-1">Simulate realistic background noise.</p>
                        </div>
                        <Switch checked={formData.assistant_interaction_config?.background_sound_enabled} onCheckedChange={(v) => updateInteractionConfig("background_sound_enabled", v)} />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Thinking Sound</Label>
                          <p className="text-sm text-muted-foreground mt-1">Play an audible thinking sound while the LLM is generating.</p>
                        </div>
                        <Switch checked={formData.assistant_interaction_config?.thinking_sound_enabled} onCheckedChange={(v) => updateInteractionConfig("thinking_sound_enabled", v)} />
                      </div>

                      <div className="grid gap-2 p-4 border rounded-xl bg-card">
                        <Label>Preferred Languages</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-between font-normal">
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
                          <div className="flex flex-wrap gap-1.5 pt-1">
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

                        <p className="text-[10px] text-muted-foreground">
                          Hints the transcriber when the caller switches languages mid-call. Leave empty
                          to let it detect them on its own.
                        </p>
                      </div>

                      <div className="grid gap-2 p-4 border rounded-xl bg-card">
                        <Label>Max Call Duration (minutes)</Label>
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
                        <p className="text-[10px] text-muted-foreground">
                          The assistant says a short goodbye and hangs up at this limit. Leave empty for
                          the 30-minute default.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Greeting Audio Section */}
                  {mode === "edit" && (
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Greeting Audio</h3>
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                          <div>
                            <Label>Enable Greeting Audio</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Play a pre-recorded greeting instead of the AI-generated greeting.
                            </p>
                          </div>
                          <Switch
                            checked={formData.assistant_greeting_audio?.enabled ?? false}
                            onCheckedChange={(v) => updateGreetingAudio("enabled", v)}
                          />
                        </div>
                        {formData.assistant_greeting_audio?.enabled && (
                          <div className="grid gap-2 p-4 border rounded-xl bg-card/50">
                            <Label>Select Audio File</Label>
                            <Select
                              value={formData.assistant_greeting_audio?.audio_id || ""}
                              onValueChange={(v) => updateGreetingAudio("audio_id", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an audio file..." />
                              </SelectTrigger>
                              <SelectContent>
                                {audioList.length === 0 ? (
                                  <div className="p-3 text-sm text-muted-foreground text-center">No audio files found</div>
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
                                <audio controls className="mt-2 w-full" src={selectedAudio.s3_url} />
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* End Call Config */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-semibold border-b border-border/50 pb-2">End Call Settings</h3>
                    <div className="grid gap-4">
                      
                      {/* End Call URL - ALWAYS VISIBLE */}
                      <div className="grid gap-2 p-4 border rounded-xl bg-card">
                        <Label>End Call Webhook URL (Optional)</Label>
                        <p className="text-sm text-muted-foreground mb-2">URL to POST call details when the call ends.</p>
                        <Input 
                          placeholder="https://api.example.com/call-ended" 
                          value={formData.assistant_end_call_url} 
                          onChange={(e) => updateField("assistant_end_call_url", e.target.value)} 
                          className="font-mono text-sm" 
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                        <div>
                          <Label>Enable End Call Tool</Label>
                          <p className="text-sm text-muted-foreground mt-1">Allows the assistant to programmatically hang up the call.</p>
                        </div>
                        <Switch checked={formData.assistant_end_call_enabled} onCheckedChange={(v) => updateField("assistant_end_call_enabled", v)} />
                      </div>

                      {/* Trigger Phrase & Message - ONLY VISIBLE IF TOOL IS ENABLED */}
                      {formData.assistant_end_call_enabled && (
                        <div className="grid gap-4 p-4 border rounded-xl bg-card/50">
                          <div className="grid gap-2">
                            <Label>Trigger Phrase *</Label>
                            <Input 
                              placeholder="e.g. Thanks, you can end the call now" 
                              value={formData.assistant_end_call_trigger_phrase} 
                              onChange={(e) => updateField("assistant_end_call_trigger_phrase", e.target.value)} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Agent Message *</Label>
                            <Input 
                              placeholder="Thank you for your time. Have a great day!" 
                              value={formData.assistant_end_call_agent_message} 
                              onChange={(e) => updateField("assistant_end_call_agent_message", e.target.value)} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tools Section (Edit Mode Only) */}
                  {mode === "edit" && (
                    <div className="space-y-10">
                      <div className="space-y-4 pt-4">
                        <div>
                          <h3 className="text-lg font-semibold border-b border-border/50 pb-2 flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            Tools & Capabilities
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            Attach external tools and functions to allow this assistant to perform tasks during calls.
                          </p>
                        </div>

                        {/* Dropdown to ADD a tool */}
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
                              <SelectTrigger className="w-full h-12">
                                <SelectValue placeholder="Select a tool to attach..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allTools.filter(t => !attachedToolIds.includes(t.tool_id || t._id)).length === 0 ? (
                                  <div className="p-3 text-sm text-muted-foreground text-center">No more tools available</div>
                                ) : (
                                  allTools
                                    .filter(t => !attachedToolIds.includes(t.tool_id || t._id))
                                    .map(tool => (
                                      <SelectItem key={tool.tool_id || tool._id} value={tool.tool_id || tool._id}>
                                        <div className="flex items-center gap-3 py-1">
                                          <Wrench className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium">{tool.tool_name}</span>
                                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded ml-2">
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

                        {/* List of ATTACHED tools */}
                        <div className="grid gap-3 pt-2">
                          {attachedToolIds.length === 0 ? (
                            <div className="text-sm text-muted-foreground p-6 border border-dashed border-border/60 rounded-xl text-center flex flex-col items-center">
                              <Wrench className="h-8 w-8 mb-3 opacity-20" />
                              <p>No tools attached yet.</p>
                              {allTools.length === 0 && (
                                <p className="text-xs opacity-70 mt-1">Create tools in the Tools section to attach them here.</p>
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
                                    className="flex items-center justify-between p-4 border rounded-xl bg-primary/5 border-primary/30 shadow-sm transition-all"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                                        <Wrench className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm">{tool.tool_name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                          {tool.tool_description || "No description provided"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                            {tool.tool_execution_type}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                      onClick={() => onToggleTool(toolId, false)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1.5" />
                                      Remove
                                    </Button>
                                  </div>
                                )
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
