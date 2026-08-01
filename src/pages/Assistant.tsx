import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Bot, Plus, Loader2, Save, Trash2, Phone, Check, Wrench, Mic, X, Copy, MessageSquare, Send, PhoneOff, PhoneCall, ArrowLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useChatTranscriptions } from "@/hooks/useChatTranscriptions";
import { cn } from "@/lib/utils";

// --- LiveKit Imports ---
import { LiveKitRoom, RoomAudioRenderer, VoiceAssistantControlBar, useLocalParticipant, useChat } from "@livekit/components-react";
import "@livekit/components-styles";

// --- Types ---
const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/assistant`;
const TOOL_API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/tool`;
const AUDIO_API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/audio`;

interface AssistantItem {
  assistant_id: string;
  assistant_name: string;
  assistant_mode?: "pipeline" | "realtime" | "cascade";
  assistant_llm_config?: Record<string, any>;
  assistant_created_at?: string;
  _id?: string;
  name?: string;
  description?: string;
}

interface AssistantDetail {
  assistant_id?: string;
  assistant_name: string;
  assistant_description: string;
  assistant_prompt: string;
  assistant_mode: "pipeline" | "realtime" | "cascade";
  assistant_llm_config?: {
    provider?: string;
    model?: string;
    voice?: string;
  };
  assistant_tts_model: "cartesia" | "sarvam" | "elevenlabs" | "mistral";
  assistant_tts_config: {
    voice_id?: string;
    target_language_code?: string;
  };
  assistant_stt_model: "sarvam" | "native" | "cartesia";
  assistant_stt_config: {
    model?: string;
    language?: string;
    mode?: string;
  };
  assistant_start_instruction: string;
  assistant_interaction_config?: {
    speaks_first?: boolean;
    filler_words?: boolean;
    silence_reprompts?: boolean;
    silence_reprompt_interval?: number;
    silence_max_reprompts?: number;
    background_sound_enabled?: boolean;
    thinking_sound_enabled?: boolean;
    allow_interruptions?: boolean;
    input_guard_window_sec?: number;
    // null = no ceiling set, the platform default of 30 minutes applies.
    max_call_duration_minutes?: number | null;
    preferred_languages?: string[];
  };
  assistant_end_call_enabled?: boolean;
  assistant_end_call_trigger_phrase?: string;
  assistant_end_call_agent_message?: string;
  assistant_end_call_url?: string;
  assistant_greeting_audio?: {
    enabled: boolean;
    audio_id: string;
  };
}

// BCP-47 codes Sarvam supports. One list drives all three language surfaces: the STT
// language select, the TTS target_language_code select, and the preferred-languages picker.
// Keep them in sync — a code offered for speech-in should be offered for speech-out.
const LANGUAGE_CODES = [
  "en-IN",
  "en-US",
  "hi-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "mr-IN",
  "gu-IN",
  "kn-IN",
  "ml-IN",
  "pa-IN",
  "od-IN",
] as const;

// OpenAI chat models known to work in cascade mode. The model is free-form upstream —
// these are the tested ones; anything else fails at the first API call, not at save time.
const CASCADE_LLM_MODELS = [
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5.5",
  "chatgpt-4o-latest",
] as const;

const STT_MODE_DESCRIPTIONS: Record<string, string> = {
  codemix: "Code-mixed output — English words stay English, Indic words in native script. Best for Hinglish/Tanglish calls.",
  transcribe: "Standard transcription in the spoken language, with proper formatting and normalized numbers.",
  translate: "Transcribes the speech and translates it to English.",
  verbatim: "Word-for-word transcription — keeps filler words and spoken numbers as-is.",
  translit: "Romanized output in Latin script (e.g. \"mera phone number hai 9840950950\").",
};

const emptyForm: AssistantDetail = {
  assistant_name: "",
  assistant_description: "",
  assistant_prompt: "",
  assistant_mode: "realtime",
  assistant_llm_config: {
    provider: "openai",
    model: "",
    voice: "",
  },
  assistant_tts_model: "cartesia",
  assistant_tts_config: {
    voice_id: "",
    target_language_code: "hi-IN",
  },
  assistant_stt_model: "sarvam",
  assistant_stt_config: {
    model: "saaras:v3",
    language: "unknown",
    mode: "codemix",
  },
  assistant_start_instruction: "",
  // Defaults mirror the backend's own defaults so a freshly created assistant behaves the
  // same whether or not the form was touched.
  assistant_interaction_config: {
    speaks_first: true,
    filler_words: false,
    silence_reprompts: false,
    silence_reprompt_interval: 10.0,
    silence_max_reprompts: 2,
    background_sound_enabled: true,
    thinking_sound_enabled: true,
    allow_interruptions: false,
    input_guard_window_sec: 3.0,
    max_call_duration_minutes: null,
    preferred_languages: ["en-US", "hi-IN"],
  },
  assistant_end_call_enabled: false,
  assistant_end_call_trigger_phrase: "",
  assistant_end_call_agent_message: "",
  assistant_end_call_url: "",
  assistant_greeting_audio: { enabled: false, audio_id: "" },
};

const buildFormSnapshot = (form: AssistantDetail) =>
  JSON.stringify({
    assistant_name: form.assistant_name.trim(),
    assistant_description: form.assistant_description.trim(),
    assistant_prompt: form.assistant_prompt.trim(),
    assistant_mode: form.assistant_mode,
    assistant_llm_config: {
      provider: form.assistant_llm_config?.provider?.trim() || "gemini",
      model: form.assistant_llm_config?.model?.trim() || "",
      voice: form.assistant_llm_config?.voice?.trim() || "",
    },
    assistant_tts_model: form.assistant_tts_model,
    assistant_tts_config: {
      voice_id: form.assistant_tts_config.voice_id || "",
      target_language_code: form.assistant_tts_config.target_language_code || "",
    },
    assistant_stt_model: form.assistant_stt_model,
    assistant_stt_config: {
      model: form.assistant_stt_config.model || "",
      language: form.assistant_stt_config.language || "",
      mode: form.assistant_stt_config.mode || "",
    },
    assistant_start_instruction: form.assistant_start_instruction.trim(),
    assistant_interaction_config: {
      speaks_first: form.assistant_interaction_config?.speaks_first ?? true,
      filler_words: form.assistant_interaction_config?.filler_words ?? false,
      silence_reprompts: form.assistant_interaction_config?.silence_reprompts ?? false,
      silence_reprompt_interval: form.assistant_interaction_config?.silence_reprompt_interval ?? 10.0,
      silence_max_reprompts: form.assistant_interaction_config?.silence_max_reprompts ?? 2,
      background_sound_enabled: form.assistant_interaction_config?.background_sound_enabled ?? true,
      thinking_sound_enabled: form.assistant_interaction_config?.thinking_sound_enabled ?? true,
      allow_interruptions: form.assistant_interaction_config?.allow_interruptions ?? false,
      input_guard_window_sec: form.assistant_interaction_config?.input_guard_window_sec ?? 3.0,
      max_call_duration_minutes: form.assistant_interaction_config?.max_call_duration_minutes ?? null,
      preferred_languages: form.assistant_interaction_config?.preferred_languages ?? [],
    },
    assistant_end_call_enabled: form.assistant_end_call_enabled ?? false,
    assistant_end_call_trigger_phrase: form.assistant_end_call_trigger_phrase?.trim() || "",
    assistant_end_call_agent_message: form.assistant_end_call_agent_message?.trim() || "",
    assistant_end_call_url: form.assistant_end_call_url?.trim() || "",
    assistant_greeting_audio: {
      enabled: form.assistant_greeting_audio?.enabled ?? false,
      audio_id: form.assistant_greeting_audio?.audio_id ?? "",
    },
  });

// --- ANIMATED MESSAGE COMPONENT ---
const AnimatedMessage = ({ text, isBot }: { text: string; isBot: boolean }) => {
  const [displayed, setDisplayed] = useState(isBot ? "" : text);

  useEffect(() => {
    if (!isBot) {
      setDisplayed(text);
      return;
    }
    
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (prev.length >= text.length) {
          clearInterval(interval);
          return text;
        }
        return text.slice(0, prev.length + 1);
      });
    }, 15); // Adjust speed of typing here (15ms per letter)

    return () => clearInterval(interval);
  }, [text, isBot]);

  return <span>{displayed}</span>;
};

// --- CHAT MODAL COMPONENT ---
const ChatInner: React.FC<{ assistantName: string; onClose: () => void }> = ({ assistantName, onClose }) => {
  const { localParticipant } = useLocalParticipant();
  const { send, chatMessages } = useChat(); 
  const liveTranscriptions = useChatTranscriptions();
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat-only: disable mic entirely
  useEffect(() => {
    localParticipant?.setMicrophoneEnabled(false);
  }, [localParticipant]);

  const allMessages = useMemo(() => {
    const chats = chatMessages
      .filter((m) => m.from?.identity === localParticipant?.identity)
      .map((m) => ({
        id: m.id || `chat-${m.timestamp}`,
        role: 'user' as const,
        text: m.message,
        timestamp: m.timestamp,
      }));

    const transcribed = liveTranscriptions.map((m: any) => ({
      id: m.id || `trans-${m.timestamp}`,
      role: m.sender === 'user' ? 'user' as const : 'bot' as const,
      text: m.text,
      timestamp: m.timestamp,
    }));

    return [...chats, ...transcribed].sort((a, b) => a.timestamp - b.timestamp);
  }, [chatMessages, liveTranscriptions, localParticipant]);

  // Turn off thinking state when bot replies
  useEffect(() => {
    const lastMsg = allMessages[allMessages.length - 1];
    if (lastMsg && lastMsg.role === 'bot') {
      setIsThinking(false);
    }
  }, [allMessages]);

  // Auto scroll to bottom smoothly
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, isThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !send) return;
    
    setIsThinking(true);
    await send(inputText); 
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[min(600px,90vh)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-foreground font-semibold text-sm">Agent: {assistantName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-muted/20">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground opacity-70">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              Start chatting below…
            </div>
          ) : (
            allMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={cn(
                    "max-w-[85%] px-4 py-3 text-sm leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "rounded-[14px_14px_2px_14px] bg-primary text-primary-foreground"
                      : "rounded-[14px_14px_14px_2px] bg-card text-foreground border border-border",
                  )}
                >
                  <AnimatedMessage text={msg.text} isBot={msg.role === 'bot'} />
                </div>
              </div>
            ))
          )}

          {/* Thinking Animation Bubble */}
          {isThinking && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
              <div className="px-4 py-3 text-sm leading-relaxed rounded-[14px_14px_14px_2px] bg-card border border-border text-muted-foreground shadow-sm flex items-center gap-1.5 h-[44px]">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex gap-2 p-3 border-t"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm outline-none bg-background text-foreground focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground bg-primary transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>

        {/* End button */}
        <div className="p-3 border-t bg-background">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};


export default function AssistantPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  // --- Chat State ---
  const [isChatActive, setIsChatActive] = useState(false);
  const [chatToken, setChatToken] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // --- State ---
  const location = useLocation();
  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Pagination & Infinite Scroll State ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 15;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (listLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [listLoading, isLoadingMore, hasMore]);

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
  const [allTools, setAllTools] = useState<any[]>([]);
  const [attachedToolIds, setAttachedToolIds] = useState<string[]>([]);
  const [selectedToolToAdd, setSelectedToolToAdd] = useState<string>("");

  // --- Web Call State ---
  const [webCallToken, setWebCallToken] = useState<string>("");
  const [isWebCallActive, setIsWebCallActive] = useState<boolean>(false);
  const [webCallLoading, setWebCallLoading] = useState<boolean>(false);
  
  // --- Copy State ---
  const [copied, setCopied] = useState(false);
  const isFormDirty = useMemo(() => buildFormSnapshot(formData) !== initialFormSnapshot, [formData, initialFormSnapshot]);

  // --- Filtered Assistants ---
  const filteredAssistants = assistants.filter((assistant) =>
    assistant.assistant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Actions ---

  const fetchList = useCallback(async (pageNum: number) => {
    if (!user?.user_id) {
      setListLoading(false);
      return;
    }
    
    if (pageNum === 1) setListLoading(true);
    else setIsLoadingMore(true);

    try {
      const res = await fetch(`${API_BASE}/list?user_id=${user.user_id}&page=${pageNum}&limit=${limit}`);
      const json = await res.json();

      if (!res.ok) {
        const errMsg = json?.error || json?.message || "Failed to load assistants";
        toast({ variant: "destructive", title: "Error", description: errMsg });
        if (pageNum === 1) setAssistants([]);
        return;
      }

      let list: AssistantItem[] = [];
      if (Array.isArray(json?.data?.assistants)) list = json.data.assistants;
      else if (Array.isArray(json?.data?.logs)) list = json.data.logs; // Fallback
      else if (Array.isArray(json?.data)) list = json.data;
      else if (Array.isArray(json?.assistants)) list = json.assistants;
      else if (Array.isArray(json)) list = json;
      
      const normalised: AssistantItem[] = list.map((item: any) => ({
        ...item,
        assistant_id: item.assistant_id || item._id || "",
        assistant_name: item.assistant_name || item.name || "Unnamed Assistant",
        // Same rule as the details mapper: read the mode, don't infer it from llm_config.
        assistant_mode: item.assistant_mode === "realtime" ? "realtime" : item.assistant_mode === "cascade" ? "cascade" : "pipeline",
      }));
      
      if (pageNum === 1) {
        setAssistants(normalised);
      } else {
        setAssistants(prev => [...prev, ...normalised]);
      }
      
      setHasMore(normalised.length >= limit);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to load assistants" });
    } finally {
      setListLoading(false);
      setIsLoadingMore(false);
    }
  }, [user?.user_id, toast, limit]);

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page]);

  const fetchTrunks = useCallback(async () => {
    if (!user?.user_id) return;
    setTrunksLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/sip/list?user_id=${user.user_id}`);
      const json = await res.json();
      if (res.ok) {
        setTrunks(Array.isArray(json.data) ? json.data : []);
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
      const res = await fetch(`${TOOL_API_BASE}/list?user_id=${user.user_id}`);
      const json = await res.json();
      if (res.ok) setAllTools(json.data || []);
    } catch (error) {
      console.error(error);
    }
  }, [user?.user_id]);

  const fetchAudios = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const res = await fetch(`${AUDIO_API_BASE}/list?user_id=${user.user_id}&page=1&limit=100`);
      const json = await res.json();
      if (res.ok && json.data?.audios) {
        setAudioList(json.data.audios);
      }
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/web-call/get-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Added text_only: true for Text Chat
        body: JSON.stringify({ user_id: user.user_id, assistant_id: selectedId, text_only: true }), 
      });
      const json = await res.json();
      if (res.ok && json.data?.token) {
        setChatToken(json.data.token);
        setIsChatActive(true);
      } else {
        throw new Error(json.error || json.message || 'Failed to generate token');
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/web-call/get-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Does NOT include text_only for Voice Web Call
        body: JSON.stringify({ 
          user_id: user.user_id, 
          assistant_id: selectedId 
        }),
      });
      
      const json = await res.json();
      
      if (res.ok && json.data?.token) {
        setWebCallToken(json.data.token);
        setIsWebCallActive(true);
      } else {
        throw new Error(json.error || json.message || "Failed to generate token");
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
      const res = await fetch(`${API_BASE}/details/${id}?user_id=${user.user_id}`);
      const json = await res.json();

      if (res.ok && json.data) {
        const d = json.data;
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
      } else {
        throw new Error(json.message || "Failed to load details");
      }
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
      const res = await fetch(`${API_BASE}/delete/${id}?user_id=${user.user_id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || json.message || "Failed to delete assistant");

      toast({ title: "Assistant Deleted", description: "The assistant has been successfully removed." });

      if (selectedId === id) {
        setMode("empty");
        setSelectedId(null);
        setMobileDetailOpen(false);
      }
      
      // Reset pagination and refetch
      setPage(1);
      await fetchList(1);
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

      let res;
      if (mode === "create") {
        res = await fetch(`${API_BASE}/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/update/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || json.message || "Operation failed");

      toast({
        title: mode === "create" ? "Assistant Created" : "Assistant Updated",
        description: `Successfully saved ${formData.assistant_name}`
      });
      setInitialFormSnapshot(buildFormSnapshot(formData));

      // Reset pagination and refetch
      setPage(1);
      await fetchList(1);

      if (mode === "create") {
        if (json.assistant?.external_assistant_id) handleSelectAssistant(json.assistant.external_assistant_id);
        else if (json.data?.assistant_id) handleSelectAssistant(json.data.assistant_id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTool = async (toolId: string, attach: boolean) => {
    if (!user?.user_id || !selectedId) return;

    const endpoint = attach ? "attach" : "detach";
    const originalIds = [...attachedToolIds];

    if (attach) setAttachedToolIds(prev => [...prev, toolId]);
    else setAttachedToolIds(prev => prev.filter(id => id !== toolId));

    try {
      const res = await fetch(`${TOOL_API_BASE}/${endpoint}/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, tool_ids: [toolId] })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || `Failed to ${endpoint} tool`);
      toast({ title: attach ? "Tool Attached" : "Tool Detached", description: `Successfully ${attach ? 'attached' : 'detached'} the tool.` });
    } catch (error: any) {
      setAttachedToolIds(originalIds);
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const updateField = (field: keyof AssistantDetail, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTTS = (field: "voice_id" | "target_language_code", value: string) => {
    setFormData(prev => ({ ...prev, assistant_tts_config: { ...prev.assistant_tts_config, [field]: value } }));
  };

  const updateSTT = (field: "model" | "language" | "mode", value: string) => {
    setFormData(prev => ({ ...prev, assistant_stt_config: { ...prev.assistant_stt_config, [field]: value } }));
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
    setFormData(prev => ({
      ...prev,
      assistant_interaction_config: {
        ...(prev.assistant_interaction_config || emptyForm.assistant_interaction_config!),
        [field]: value
      }
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

  const updateGreetingAudio = (key: "enabled" | "audio_id", value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      assistant_greeting_audio: {
        ...(prev.assistant_greeting_audio || { enabled: false, audio_id: "" }),
        [key]: value,
      },
    }));
  };

  const isRealtimeMode = formData.assistant_mode === "realtime";
  const isCascadeMode = formData.assistant_mode === "cascade";
  const getAssistantMode = (assistant: AssistantItem): "pipeline" | "realtime" | "cascade" =>
    assistant.assistant_mode === "realtime" ? "realtime" : assistant.assistant_mode === "cascade" ? "cascade" : "pipeline";

  return (
    <div className="page-shell flex h-screen overflow-hidden">

      {/* --- SIDEBAR --- */}
      <div
        className={cn(
          "w-full lg:w-80 border-r border-border flex flex-col bg-card/30 animate-in slide-in-from-left duration-300 h-full",
          mobileDetailOpen ? "hidden lg:flex" : "flex",
        )}
      >
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
        </div>
      

      {/* --- RIGHT MAIN PANEL --- */}
      <div
        className={cn(
          "flex-1 bg-background relative h-full",
          !mobileDetailOpen ? "hidden lg:flex lg:flex-col" : "flex flex-col",
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
          <span className="text-[5rem] md:text-[8rem] xl:text-[12rem] font-black select-none">VYOM</span>
        </div>

        {mode === "empty" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <Bot className="h-16 w-16 mb-4 opacity-20" />
            <h2 className="text-xl font-semibold mb-2">No Assistant Selected</h2>
            <p className="max-w-md text-center text-sm opacity-70">
              Select an assistant from the sidebar or click "New Assistant" to get started.
            </p>
          </div>
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
                          onChange={(e) => updateField("assistant_name", e.target.value)}
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
                                  await handleToggleTool(val, true);
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
                                      onClick={() => handleToggleTool(toolId, false)}
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
            </div>
          )}
      </div>

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

    </div>
  );
}