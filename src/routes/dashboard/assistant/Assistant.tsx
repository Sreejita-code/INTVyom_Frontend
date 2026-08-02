import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Bot, Plus, Loader2, Save, Trash2, Phone, Check, Mic, X, Copy, MessageSquare, PhoneCall, ArrowLeft, Search } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { MasterDetailShell } from "@/components/common/MasterDetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callCreateAssistantEndpoint,
  callDeleteAssistantEndpoint,
  callGetAssistantDetailsEndpoint,
  callUpdateAssistantEndpoint,
  condenseAssistantDetailsResponse,
} from "@/services/assistant/assistantService";
import { callListToolsEndpoint, condenseListToolsResponse, callToggleToolAttachmentEndpoint } from "@/services/tool/toolService";
import { callListAudiosEndpoint, condenseListAudiosResponse } from "@/services/audio/audioService";
import { callListTrunksEndpoint, condenseListTrunksResponse } from "@/services/sip/sipService";
import { callGetWebCallTokenEndpoint, condenseWebCallTokenResponse } from "@/services/webCall/webCallService";
import { AssistantDetail, AssistantItem } from "@/types/assistant";
import { ToolSummary } from "@/types/tool";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChatInner } from "./AssistantChat";
import { AssistantForm } from "./AssistantForm";
import { useAssistantList } from "./useAssistantList";
import { buildFormSnapshot, emptyForm } from "./constants";

// --- LiveKit Imports ---
import { LiveKitRoom, RoomAudioRenderer, VoiceAssistantControlBar } from "@livekit/components-react";
import "@livekit/components-styles";

export default function AssistantPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  // --- Chat State ---
  const [isChatActive, setIsChatActive] = useState(false);
  const [chatToken, setChatToken] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // --- State ---
  const location = useLocation();
  const {
    filteredAssistants,
    listLoading,
    isLoadingMore,
    page,
    searchQuery,
    setSearchQuery,
    lastElementRef,
    refresh: refreshList,
  } = useAssistantList(user?.user_id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "empty">("empty");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (mode === "empty") {
      setMobileDetailOpen(false);
    }
  }, [mode]);

  const [formData, setFormData] = useState<AssistantDetail>(emptyForm);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(() => buildFormSnapshot(emptyForm));
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trunks, setTrunks] = useState<any[]>([]);
  const [trunksLoading, setTrunksLoading] = useState(false);

  // --- Audio Library State ---
  const [audioList, setAudioList] = useState<{ audio_id: string; audio_name: string; s3_url?: string }[]>([]);
  
  // --- Tools State ---
  const [allTools, setAllTools] = useState<(ToolSummary & { _id?: string })[]>([]);
  const [attachedToolIds, setAttachedToolIds] = useState<string[]>([]);
  const [selectedToolToAdd, setSelectedToolToAdd] = useState<string>("");

  // --- Web Call State ---
  const [webCallToken, setWebCallToken] = useState<string>("");
  const [isWebCallActive, setIsWebCallActive] = useState<boolean>(false);
  const [webCallLoading, setWebCallLoading] = useState<boolean>(false);
  
  // --- Copy State ---
  const [copied, setCopied] = useState(false);
  const isFormDirty = useMemo(() => buildFormSnapshot(formData) !== initialFormSnapshot, [formData, initialFormSnapshot]);

  const fetchTrunks = useCallback(async () => {
    if (!user?.user_id) return;
    setTrunksLoading(true);
    try {
      const { ok, json } = await callListTrunksEndpoint(user.user_id);
      if (ok) {
        setTrunks(condenseListTrunksResponse(json));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTrunksLoading(false);
    }
  }, [user?.user_id]);

  const fetchTools = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const { ok, json } = await callListToolsEndpoint(user.user_id);
      if (ok) setAllTools(condenseListToolsResponse(json));
    } catch (error) {
      console.error(error);
    }
  }, [user?.user_id]);

  const fetchAudios = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const { ok, json } = await callListAudiosEndpoint({ userId: user.user_id, page: 1, limit: 100 });
      if (ok) setAudioList(condenseListAudiosResponse(json));
    } catch (error) {
      console.error(error);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchTrunks();
    fetchTools();
    fetchAudios();
  }, [fetchTrunks, fetchTools, fetchAudios]);

  const handleStartChat = async () => {
    if (!user?.user_id || !selectedId) return;
    setChatLoading(true);
    try {
      const json = await callGetWebCallTokenEndpoint({ userId: user.user_id, assistantId: selectedId, textOnly: true });
      const token = condenseWebCallTokenResponse(json);
      if (token) {
        setChatToken(token);
        setIsChatActive(true);
      } else {
        throw new Error((json as { error?: string; message?: string })?.error || (json as { error?: string; message?: string })?.message || 'Failed to generate token');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Chat Error', description: error.message });
    } finally {
      setChatLoading(false);
    }
  };

  const handleDisconnectChat = () => {
    setIsChatActive(false);
    setChatToken('');
  };

  // --- Web Call Actions ---
  const handleStartWebCall = async () => {
    if (!user?.user_id || !selectedId) return;
    setWebCallLoading(true);
    
    try {
      const json = await callGetWebCallTokenEndpoint({ userId: user.user_id, assistantId: selectedId });
      const token = condenseWebCallTokenResponse(json);
      if (token) {
        setWebCallToken(token);
        setIsWebCallActive(true);
      } else {
        throw new Error((json as { error?: string; message?: string })?.error || (json as { error?: string; message?: string })?.message || "Failed to generate token");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Web Call Error", description: error.message });
    } finally {
      setWebCallLoading(false);
    }
  };

  const handleDisconnectWebCall = () => {
    setIsWebCallActive(false);
    setWebCallToken("");
  };

  // --- Copy Actions ---
  const handleCopyId = () => {
    if (formData.assistant_id) {
      navigator.clipboard.writeText(formData.assistant_id);
      setCopied(true);
      toast({ title: "Copied!", description: "Assistant ID copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setFormData(emptyForm);
    setInitialFormSnapshot(buildFormSnapshot(emptyForm));
    setAttachedToolIds([]);
    setMode("create");
    setMobileDetailOpen(true);
  };

  const handleSelectAssistant = async (id: string) => {
    if (!user?.user_id) {
      toast({ variant: "destructive", title: "Authentication Error", description: "User ID not found." });
      return;
    }

    setSelectedId(id);
    setMode("edit");
    setMobileDetailOpen(true);
    setDetailLoading(true);

    try {
      const { ok, json } = await callGetAssistantDetailsEndpoint({ userId: user.user_id, assistantId: id });
      const d = condenseAssistantDetailsResponse(json) as Record<string, any> | null;

      if (!ok || !d) {
        throw new Error((json as { message?: string })?.message || "Failed to load details");
      }
      // Read the mode, never guess it. assistant_llm_config is legal in pipeline mode
      // (it carries the provider and api_key there), so its presence means nothing.
      const inferredMode: "pipeline" | "realtime" | "cascade" =
        d.assistant_mode === "realtime" ? "realtime" : d.assistant_mode === "cascade" ? "cascade" : "pipeline";


        const nextForm: AssistantDetail = {
          assistant_id: d.assistant_id,
          assistant_name: d.assistant_name || "",
          assistant_description: d.assistant_description || "",
          assistant_prompt: d.assistant_prompt || "",
          assistant_mode: inferredMode,
          // api_key is deliberately not mapped: the API returns it masked, and sending a
          // masked value back is rejected. Keys are managed in Integrations.
          assistant_llm_config: {
            provider: d.assistant_llm_config?.provider || "openai",
            model: d.assistant_llm_config?.model || "",
            voice: d.assistant_llm_config?.voice || "",
          },
          assistant_tts_model: d.assistant_tts_model || "cartesia",
          assistant_tts_config: {
            voice_id: d.assistant_tts_config?.voice_id || d.assistant_tts_config?.speaker || "",
            target_language_code: d.assistant_tts_config?.target_language_code || "hi-IN",
          },
          assistant_stt_model: d.assistant_stt_model || "sarvam",
          assistant_stt_config: {
            model: d.assistant_stt_config?.model || "saaras:v3",
            language: d.assistant_stt_config?.language || "unknown",
            mode: d.assistant_stt_config?.mode || "codemix",
          },
          assistant_start_instruction: d.assistant_start_instruction || "",
          
          assistant_interaction_config: {
            speaks_first: d.assistant_interaction_config?.speaks_first ?? true,
            filler_words: d.assistant_interaction_config?.filler_words ?? false,
            silence_reprompts: d.assistant_interaction_config?.silence_reprompts ?? false,
            silence_reprompt_interval: d.assistant_interaction_config?.silence_reprompt_interval ?? 10.0,
            silence_max_reprompts: d.assistant_interaction_config?.silence_max_reprompts ?? 2,
            background_sound_enabled: d.assistant_interaction_config?.background_sound_enabled ?? true,
            thinking_sound_enabled: d.assistant_interaction_config?.thinking_sound_enabled ?? true,
            allow_interruptions: d.assistant_interaction_config?.allow_interruptions ?? false,
            input_guard_window_sec: d.assistant_interaction_config?.input_guard_window_sec ?? 3.0,
            max_call_duration_minutes: d.assistant_interaction_config?.max_call_duration_minutes ?? null,
            preferred_languages: d.assistant_interaction_config?.preferred_languages ?? [],
          },
          assistant_end_call_enabled: d.assistant_end_call_enabled ?? false,
          assistant_end_call_trigger_phrase: d.assistant_end_call_trigger_phrase || "",
          assistant_end_call_agent_message: d.assistant_end_call_agent_message || "",
          assistant_end_call_url: d.assistant_end_call_url || "",
          assistant_greeting_audio: d.assistant_greeting_audio || { enabled: false, audio_id: "" },
        };
        setFormData(nextForm);
        setInitialFormSnapshot(buildFormSnapshot(nextForm));

        const attached = d.tools?.map((t: any) => t.tool_id || t.id || t) || d.tool_ids || [];
        setAttachedToolIds(attached);
    } catch (error) {
      toast({ variant: "destructive", title: "Error loading assistant details" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteAssistant = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); 

    if (!user?.user_id) return;
    if (!window.confirm("Are you sure you want to delete this assistant? This action cannot be undone.")) return;

    setDeletingId(id);

    try {
      await callDeleteAssistantEndpoint({ userId: user.user_id, assistantId: id });

      toast({ title: "Assistant Deleted", description: "The assistant has been successfully removed." });

      if (selectedId === id) {
        setMode("empty");
        setSelectedId(null);
        setMobileDetailOpen(false);
      }
      
      // Reset pagination and refetch
      await refreshList();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.user_id) return;

    const name = formData.assistant_name.trim();
    const description = formData.assistant_description.trim();
    const prompt = formData.assistant_prompt.trim();
    if (!name || !description || !prompt) {
      toast({
        variant: "destructive",
        title: "Missing Required Fields",
        description: "Assistant name, description, and system prompt are required.",
      });
      return;
    }

    if (
      formData.assistant_end_call_enabled &&
      (!formData.assistant_end_call_trigger_phrase?.trim() || !formData.assistant_end_call_agent_message?.trim())
    ) {
      toast({
        variant: "destructive",
        title: "End Call Fields Required",
        description: "Trigger phrase and agent message are required when End Call Tool is enabled.",
      });
      return;
    }

    setSaving(true);

    try {
      const interactionConfig = {
        ...formData.assistant_interaction_config,
        // Realtime has no external TTS, so the backend forces this off anyway.
        ...(formData.assistant_mode === "realtime" ? { filler_words: false } : {}),
      };

      const llmProvider = formData.assistant_llm_config?.provider?.trim() || "openai";
      const payload: any = {
        user_id: user.user_id,
        assistant_name: name,
        assistant_description: description,
        assistant_prompt: prompt,
        assistant_mode: formData.assistant_mode,
        assistant_start_instruction: formData.assistant_start_instruction,
        
        assistant_interaction_config: interactionConfig,
        assistant_end_call_enabled: formData.assistant_end_call_enabled,
        assistant_end_call_trigger_phrase: formData.assistant_end_call_trigger_phrase?.trim(),
        assistant_end_call_agent_message: formData.assistant_end_call_agent_message?.trim(),
        assistant_end_call_url: formData.assistant_end_call_url?.trim(),
        assistant_greeting_audio: formData.assistant_greeting_audio,
      };

      // provider config is symmetric across modes and persists across a mode switch
      // model + api_key come from Integrations (baked in by the backend); not editable per-assistant
      const llmConfig: Record<string, string> = { provider: llmProvider };
      // voice is emitted by the realtime model; in pipeline the voice lives in the TTS config
      if (formData.assistant_mode === "realtime" && formData.assistant_llm_config?.voice?.trim()) {
        llmConfig.voice = formData.assistant_llm_config.voice.trim();
      }
      // cascade runs a plain OpenAI chat model — the user's pick, default gpt-4.1
      if (formData.assistant_mode === "cascade") {
        llmConfig.model = formData.assistant_llm_config?.model?.trim() || "gpt-4.1";
      }
      payload.assistant_llm_config = llmConfig;

      if (formData.assistant_mode !== "realtime") {
        payload.assistant_tts_model = formData.assistant_tts_model;
        if (formData.assistant_tts_model === "sarvam") {
          payload.assistant_tts_config = {
            speaker: formData.assistant_tts_config.voice_id,
            target_language_code: formData.assistant_tts_config.target_language_code || "hi-IN",
          };
        } else {
          payload.assistant_tts_config = { voice_id: formData.assistant_tts_config.voice_id };
        }

        payload.assistant_stt_model = formData.assistant_stt_model;
        if (formData.assistant_stt_model === "sarvam") {
          payload.assistant_stt_config = {
            model: formData.assistant_stt_config.model || "saaras:v3",
            language: formData.assistant_stt_config.language || "unknown",
            // mode is honored only in cascade — the pipeline tap rejects it.
            ...(formData.assistant_mode === "cascade"
              ? { mode: formData.assistant_stt_config.mode || "codemix" }
              : {}),
          };
        } else if (formData.assistant_stt_model === "cartesia") {
          payload.assistant_stt_config = {
            model: formData.assistant_stt_config.model || "ink-whisper",
            language: formData.assistant_stt_config.language || "en-IN",
          };
        } else {
          payload.assistant_stt_config = {};
        }
      }

      let json: unknown;
      if (mode === "create") {
        json = await callCreateAssistantEndpoint(payload);
      } else {
        json = await callUpdateAssistantEndpoint(selectedId, payload);
      }

      toast({
        title: mode === "create" ? "Assistant Created" : "Assistant Updated",
        description: `Successfully saved ${formData.assistant_name}`
      });
      setInitialFormSnapshot(buildFormSnapshot(formData));

      // Reset pagination and refetch
      await refreshList();

      if (mode === "create") {
        const result = json as Record<string, any>;
        if (result.assistant?.external_assistant_id) handleSelectAssistant(result.assistant.external_assistant_id);
        else if (result.data?.assistant_id) handleSelectAssistant(result.data.assistant_id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTool = async (toolId: string, attach: boolean) => {
    if (!user?.user_id || !selectedId) return;

    const originalIds = [...attachedToolIds];

    if (attach) setAttachedToolIds(prev => [...prev, toolId]);
    else setAttachedToolIds(prev => prev.filter(id => id !== toolId));

    try {
      await callToggleToolAttachmentEndpoint({ userId: user.user_id, assistantId: selectedId, toolIds: [toolId], attach });
      toast({ title: attach ? "Tool Attached" : "Tool Detached", description: `Successfully ${attach ? 'attached' : 'detached'} the tool.` });
    } catch (error: any) {
      setAttachedToolIds(originalIds);
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const getAssistantMode = (assistant: AssistantItem): "pipeline" | "realtime" | "cascade" =>
    assistant.assistant_mode === "realtime" ? "realtime" : assistant.assistant_mode === "cascade" ? "cascade" : "pipeline";

  return (
    <>
    <MasterDetailShell
      mobileDetailOpen={mobileDetailOpen}
      className="h-screen overflow-hidden"
      listClassName="animate-in slide-in-from-left duration-300 h-full"
      detailClassName="bg-background h-full"
      list={
        <>
          <div className="p-4 border-b border-border flex items-center justify-between bg-background/50 backdrop-blur-sm z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Assistants</span>
            </div>
            <Button size="sm" onClick={handleCreateNew} className="h-8 px-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>

          <div className="p-4 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assistants..."
                className="pl-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {listLoading && page === 1 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAssistants.length === 0 ? (
                <div className="text-center py-10 px-4 text-muted-foreground text-sm">
                  {searchQuery ? `No assistants found matching "${searchQuery}".` : "No assistants found. Create one to get started."}
                </div>
              ) : (
                <>
                  {filteredAssistants.map((item, index) => {
                    const itemId = item.assistant_id || (item as any)._id;
                    const assistantMode = getAssistantMode(item);
                    const isLastElement = index === filteredAssistants.length - 1;

                    return (
                      <div
                        key={itemId}
                        ref={isLastElement ? lastElementRef : null}
                        onClick={() => handleSelectAssistant(itemId)}
                        className={`
                          group flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all border
                          ${selectedId === itemId
                            ? "bg-accent/50 border-primary/50 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]"
                            : "bg-transparent border-transparent hover:bg-accent/30 hover:border-border"
                          }
                        `}
                      >
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center shrink-0
                          ${selectedId === itemId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                        `}>
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex min-w-0 flex-wrap items-start gap-2">
                            <h4 className={`min-w-0 flex-1 text-sm font-medium leading-snug break-words ${selectedId === itemId ? "text-primary" : "text-foreground"}`}>
                              {item.assistant_name}
                            </h4>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border",
                                assistantMode === "realtime"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : assistantMode === "cascade"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                    : "bg-sky-500/10 text-sky-400 border-sky-500/30",
                              )}
                            >
                              {assistantMode}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate font-mono opacity-70 pr-2">
                            {itemId.slice(0, 8)}...
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => handleDeleteAssistant(itemId, e)}
                          disabled={deletingId === itemId}
                        >
                          {deletingId === itemId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    );
                  })}
                  {isLoadingMore && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </>
      }
      detail={
        <>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
          <span className="text-[5rem] md:text-[8rem] xl:text-[12rem] font-black select-none">VYOM</span>
        </div>

        {mode === "empty" ? (
          <EmptyState
            icon={Bot}
            title="No Assistant Selected"
            description='Select an assistant from the sidebar or click "New Assistant" to get started.'
            descriptionClassName="max-w-md"
          />
        ) : detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden z-10">

              {/* EDITOR HEADER */}
              <div className="p-4 md:p-6 border-b border-border bg-card/20 backdrop-blur-md flex flex-wrap items-start justify-between gap-4 shrink-0">
                <div className="space-y-1 flex-1 w-full max-w-2xl">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden -ml-2 mb-2 text-muted-foreground"
                    onClick={() => setMobileDetailOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  {mode === "create" ? (
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-5 w-5" />
                      <h2 className="text-xl font-bold">Create New Assistant</h2>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-1 w-full">
                      {/* Name Input & Delete Button Row */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.assistant_name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, assistant_name: e.target.value }))}
                          className="text-2xl font-bold h-auto border-none p-0 bg-transparent focus-visible:ring-0 rounded-none border-b border-transparent focus:border-primary shadow-none hover:bg-transparent"
                          placeholder="Assistant Name"
                          style={{ width: `${Math.max((formData.assistant_name || "").length, 10)}ch`, maxWidth: '100%' }}
                        />
                        {selectedId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAssistant(selectedId)}
                            disabled={deletingId === selectedId || saving}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 h-7 w-7 rounded-full"
                            title="Delete Assistant"
                          >
                            {deletingId === selectedId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                      
                      {/* ID & Copy Button Row */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground font-mono">
                          {formData.assistant_id}
                        </p>
                        {formData.assistant_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyId}
                            className="h-6 w-6 text-muted-foreground hover:text-primary bg-muted/30 rounded-md"
                            title="Copy ID"
                          >
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 md:ml-4">
                  {/* WEB CALL BUTTON */}
                  {mode === "edit" && selectedId && (
                    <Button 
                      variant="secondary" 
                      onClick={handleStartWebCall} 
                      disabled={webCallLoading || saving} 
                      className="shadow-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    >
                      {webCallLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                      Web Call
                    </Button>
                  )}
                  {mode === 'edit' && selectedId && (
                    <Button
                      variant="secondary"
                      onClick={handleStartChat}
                      disabled={chatLoading || saving}
                      className="shadow-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    >
                      {chatLoading
                        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        : <MessageSquare className="h-4 w-4 mr-2" />
                      }
                      Chat
                    </Button>
                  )}

                  {/* SAVE BUTTON */}
                  <Button onClick={handleSubmit} disabled={saving || !!deletingId || !isFormDirty} className="min-w-[100px] shadow-lg shadow-primary/20 disabled:shadow-none">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>

              {/* FORM CONTENT */}
              <AssistantForm
                mode={mode}
                formData={formData}
                setFormData={setFormData}
                audioList={audioList}
                allTools={allTools}
                attachedToolIds={attachedToolIds}
                selectedToolToAdd={selectedToolToAdd}
                setSelectedToolToAdd={setSelectedToolToAdd}
                onToggleTool={handleToggleTool}
              />
            </div>
          )}
        </>
      }
    />

      {/* --- LIVEKIT WEB CALL OVERLAY --- */}
      {isWebCallActive && webCallToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden relative">
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-10 rounded-full bg-background/50 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDisconnectWebCall}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="p-8 pb-4 text-center space-y-2">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center relative mb-6 shadow-inner">
                <Bot className="h-10 w-10 text-primary relative z-10" />
                <div className="absolute inset-0 border-2 border-primary/30 rounded-full animate-ping opacity-50"></div>
              </div>
              <h3 className="text-2xl font-bold">Talking to {formData.assistant_name || "Assistant"}</h3>
              <p className="text-sm text-muted-foreground">Voice assistant connected.</p>
            </div>

            <div className="p-6 bg-muted/30">
              <LiveKitRoom
                video={false}
                audio={true}
                token={webCallToken}
                serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                connect={true}
                onDisconnected={handleDisconnectWebCall}
                className="flex flex-col items-center gap-4"
              >
                <RoomAudioRenderer />
                <div className="w-full max-w-[250px] mx-auto">
                  <VoiceAssistantControlBar />
                </div>
              </LiveKitRoom>
            </div>

          </div>
        </div>
      )}

      {/* --- CHAT MODAL --- */}
      {isChatActive && chatToken && (
        <LiveKitRoom
          video={false}
          audio={false}
          token={chatToken}
          serverUrl={import.meta.env.VITE_LIVEKIT_URL}
          connect={true}
          onDisconnected={handleDisconnectChat}
        >
          <ChatInner
            assistantName={formData.assistant_name || 'Assistant'}
            onClose={handleDisconnectChat}
          />
        </LiveKitRoom>
      )}
    </>
  );
}