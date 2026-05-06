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

interface AssistantItem {
  assistant_id: string;
  assistant_name: string;
  assistant_llm_mode?: "pipeline" | "realtime";
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
  assistant_llm_mode: "pipeline" | "realtime";
  assistant_llm_config?: {
    provider?: string;
    model?: string;
    voice?: string;
    api_key?: string;
  };
  assistant_tts_model: "cartesia" | "sarvam" | "elevenlabs" | "mistral";
  assistant_tts_config: {
    voice_id?: string;
    target_language_code?: string;
  };
  assistant_start_instruction: string;
  assistant_interaction_config?: {
    speaks_first?: boolean;
    filler_words?: boolean;
    silence_reprompts?: boolean;
    silence_reprompt_interval?: number;
    silence_max_reprompts?: number;
    // --- NEW FIELDS ---
    background_sound_enabled?: boolean;
    thinking_sound_enabled?: boolean;
    preferred_languages?: string[];
    _preferred_languages_str?: string; // UI Helper
  };
  assistant_end_call_enabled?: boolean;
  assistant_end_call_trigger_phrase?: string;
  assistant_end_call_agent_message?: string;
  assistant_end_call_url?: string;
}

const emptyForm: AssistantDetail = {
  assistant_name: "",
  assistant_description: "",
  assistant_prompt: "",
  assistant_llm_mode: "realtime",
  assistant_llm_config: {
    provider: "gemini",
    model: "",
    voice: "",
    api_key: "",
  },
  assistant_tts_model: "cartesia",
  assistant_tts_config: {
    voice_id: "",
    target_language_code: "hi-IN",
  },
  assistant_start_instruction: "",
  assistant_interaction_config: {
    speaks_first: true,
    filler_words: false,
    silence_reprompts: false,
    silence_reprompt_interval: 10.0,
    silence_max_reprompts: 2,
    background_sound_enabled: false,
    thinking_sound_enabled: false,
    preferred_languages: ["en-US", "hi-IN"],
    _preferred_languages_str: "en-US, hi-IN",
  },
  assistant_end_call_enabled: false,
  assistant_end_call_trigger_phrase: "",
  assistant_end_call_agent_message: "",
  assistant_end_call_url: "",
};

const buildFormSnapshot = (form: AssistantDetail) =>
  JSON.stringify({
    assistant_name: form.assistant_name.trim(),
    assistant_description: form.assistant_description.trim(),
    assistant_prompt: form.assistant_prompt.trim(),
    assistant_llm_mode: form.assistant_llm_mode,
    assistant_llm_config: {
      provider: form.assistant_llm_config?.provider?.trim() || "gemini",
      model: form.assistant_llm_config?.model?.trim() || "",
      voice: form.assistant_llm_config?.voice?.trim() || "",
      api_key: form.assistant_llm_config?.api_key?.trim() || "",
    },
    assistant_tts_model: form.assistant_tts_model,
    assistant_tts_config: {
      voice_id: form.assistant_tts_config.voice_id || "",
      target_language_code: form.assistant_tts_config.target_language_code || "",
    },
    assistant_start_instruction: form.assistant_start_instruction.trim(),
    assistant_interaction_config: {
      speaks_first: form.assistant_interaction_config?.speaks_first ?? true,
      filler_words: form.assistant_interaction_config?.filler_words ?? false,
      silence_reprompts: form.assistant_interaction_config?.silence_reprompts ?? false,
      silence_reprompt_interval: form.assistant_interaction_config?.silence_reprompt_interval ?? 10.0,
      silence_max_reprompts: form.assistant_interaction_config?.silence_max_reprompts ?? 2,
      background_sound_enabled: form.assistant_interaction_config?.background_sound_enabled ?? false,
      thinking_sound_enabled: form.assistant_interaction_config?.thinking_sound_enabled ?? false,
      preferred_languages: form.assistant_interaction_config?.preferred_languages ?? [],
    },
    assistant_end_call_enabled: form.assistant_end_call_enabled ?? false,
    assistant_end_call_trigger_phrase: form.assistant_end_call_trigger_phrase?.trim() || "",
    assistant_end_call_agent_message: form.assistant_end_call_agent_message?.trim() || "",
    assistant_end_call_url: form.assistant_end_call_url?.trim() || "",
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
    const chats = chatMessages.map((m) => ({
      id: m.id || `chat-${m.timestamp}`,
      role: m.from?.identity === localParticipant?.identity ? 'user' as const : 'bot' as const,
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
  const [mode, setMode] = useState<"create" | "edit" | "empty" | "make-call">("empty");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Sync mode with URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get("mode");
    if (m === "make-call") {
      setMode("make-call");
      setSelectedId(null);
      setMobileDetailOpen(true);
    } else if (mode === "make-call") {
      setMode("empty");
      setMobileDetailOpen(false);
    }
  }, [location.search, mode]);

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
  
  // --- Tools State ---
  const [allTools, setAllTools] = useState<any[]>([]);
  const [attachedToolIds, setAttachedToolIds] = useState<string[]>([]);
  const [selectedToolToAdd, setSelectedToolToAdd] = useState<string>("");

  const [callFormData, setCallFormData] = useState({
    customer_number: "",
    assistant_id: "",
    trunk_id: "",
  });
  const [callLoading, setCallLoading] = useState(false);

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
        assistant_llm_mode:
          item.assistant_llm_mode === "pipeline" || item.assistant_llm_mode === "realtime"
            ? item.assistant_llm_mode
            : item.assistant_llm_config
              ? "realtime"
              : "pipeline",
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

  useEffect(() => {
    fetchTrunks();
    fetchTools();
  }, [fetchTrunks, fetchTools]);

  const handleMakeCallClick = () => {
    setMode("make-call");
    setSelectedId(null);
  };

  const handleTriggerCall = async () => {
    if (!user?.user_id) return;
    if (!callFormData.customer_number || !callFormData.assistant_id || !callFormData.trunk_id) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all fields" });
      return;
    }
    setCallLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/call/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          assistant_id: callFormData.assistant_id,
          trunk_id: callFormData.trunk_id,
          to_number: callFormData.customer_number,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Call Triggered", description: json.message || "Outbound call triggered successfully" });
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error || "Failed to trigger call" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to API" });
    } finally {
      setCallLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user?.user_id || !selectedId) return;
    setChatLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/web-call/get-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, assistant_id: selectedId }),
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
        const inferredMode: "pipeline" | "realtime" =
          d.assistant_llm_mode === "pipeline" || d.assistant_llm_mode === "realtime"
            ? d.assistant_llm_mode
            : d.assistant_llm_config
              ? "realtime"
              : "pipeline";
        
        const nextForm: AssistantDetail = {
          assistant_id: d.assistant_id,
          assistant_name: d.assistant_name || "",
          assistant_description: d.assistant_description || "",
          assistant_prompt: d.assistant_prompt || "",
          assistant_llm_mode: inferredMode,
          assistant_llm_config: {
            provider: d.assistant_llm_config?.provider || "gemini",
            model: d.assistant_llm_config?.model || "",
            voice: d.assistant_llm_config?.voice || "",
            api_key: d.assistant_llm_config?.api_key || "",
          },
          assistant_tts_model: d.assistant_tts_model || "cartesia",
          assistant_tts_config: {
            voice_id: d.assistant_tts_config?.voice_id || d.assistant_tts_config?.speaker || "",
            target_language_code: d.assistant_tts_config?.target_language_code || "hi-IN",
          },
          assistant_start_instruction: d.assistant_start_instruction || "",
          
          // Mapped New Fields
          assistant_interaction_config: {
            speaks_first: d.assistant_interaction_config?.speaks_first ?? true,
            filler_words: d.assistant_interaction_config?.filler_words ?? false,
            silence_reprompts: d.assistant_interaction_config?.silence_reprompts ?? false,
            silence_reprompt_interval: d.assistant_interaction_config?.silence_reprompt_interval ?? 10.0,
            silence_max_reprompts: d.assistant_interaction_config?.silence_max_reprompts ?? 2,
            background_sound_enabled: d.assistant_interaction_config?.background_sound_enabled ?? false,
            thinking_sound_enabled: d.assistant_interaction_config?.thinking_sound_enabled ?? false,
            preferred_languages: d.assistant_interaction_config?.preferred_languages ?? [],
            _preferred_languages_str: (d.assistant_interaction_config?.preferred_languages ?? []).join(", "),
          },
          assistant_end_call_enabled: d.assistant_end_call_enabled ?? false,
          assistant_end_call_trigger_phrase: d.assistant_end_call_trigger_phrase || "",
          assistant_end_call_agent_message: d.assistant_end_call_agent_message || "",
          assistant_end_call_url: d.assistant_end_call_url || "",
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
      // Extract preferred languages string back into an array
      const langs = formData.assistant_interaction_config?._preferred_languages_str
        ? formData.assistant_interaction_config._preferred_languages_str.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      const interactionConfig = {
        ...formData.assistant_interaction_config,
        ...(formData.assistant_llm_mode === "realtime" ? { filler_words: false } : {}),
        preferred_languages: langs
      };
      
      // Remove UI helper property before sending to the backend
      delete (interactionConfig as any)._preferred_languages_str;

      const realtimeProvider = formData.assistant_llm_config?.provider?.trim() || "gemini";
      const payload: any = {
        user_id: user.user_id,
        assistant_name: name,
        assistant_description: description,
        assistant_prompt: prompt,
        assistant_llm_mode: formData.assistant_llm_mode,
        assistant_start_instruction: formData.assistant_start_instruction,
        
        assistant_interaction_config: interactionConfig,
        assistant_end_call_enabled: formData.assistant_end_call_enabled,
        assistant_end_call_trigger_phrase: formData.assistant_end_call_trigger_phrase?.trim(),
        assistant_end_call_agent_message: formData.assistant_end_call_agent_message?.trim(),
        assistant_end_call_url: formData.assistant_end_call_url?.trim(),
      };

      if (formData.assistant_llm_mode === "realtime") {
        const llmConfig: Record<string, string> = {
          provider: realtimeProvider,
          model: formData.assistant_llm_config?.model?.trim() || undefined,
          voice: formData.assistant_llm_config?.voice?.trim() || undefined,
        };
        
        // We now allow api key overrides for any provider, including Gemini and OpenAI
        if (formData.assistant_llm_config?.api_key?.trim()) {
          llmConfig.api_key = formData.assistant_llm_config.api_key.trim();
        }
        
        payload.assistant_llm_config = llmConfig;
      } else {
        payload.assistant_tts_model = formData.assistant_tts_model;
        if (formData.assistant_tts_model === "sarvam") {
          payload.assistant_tts_config = {
            speaker: formData.assistant_tts_config.voice_id,
            target_language_code: formData.assistant_tts_config.target_language_code || "hi-IN",
          };
        } else {
          payload.assistant_tts_config = { voice_id: formData.assistant_tts_config.voice_id };
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

  const isRealtimeMode = formData.assistant_llm_mode === "realtime";
  const getAssistantMode = (assistant: AssistantItem): "pipeline" | "realtime" =>
    assistant.assistant_llm_mode === "realtime" ? "realtime" : "pipeline";

  return (
    <div className="page-shell flex h-screen overflow-hidden">

      {/* --- SIDEBAR --- */}
      {mode !== "make-call" && (
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
      )}

      {/* --- RIGHT MAIN PANEL --- */}
      <div
        className={cn(
          "flex-1 bg-background relative h-full",
          mode !== "make-call" && !mobileDetailOpen ? "hidden lg:flex lg:flex-col" : "flex flex-col",
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
        ) : mode === "make-call" ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden z-10">
            {/* MAKE CALL HEADER */}
            <div className="p-4 md:p-8 border-b border-border bg-card/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-muted-foreground"
                onClick={() => setMobileDetailOpen(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-foreground">Outbound Call</h2>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70">Initialize a new conversation</p>
                </div>
              </div>
            </div>

            {/* MAKE CALL CONTENT */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-10 max-w-2xl mx-auto">
                <div className="glass rounded-2xl md:rounded-3xl p-5 md:p-10 space-y-6 md:space-y-8 border border-border/50 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                  <div className="grid gap-8">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary/70 ml-1">Customer Number</Label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                          <Phone className="h-4 w-4" />
                        </div>
                        <Input
                          placeholder="+1 234 567 8900"
                          className="pl-12 h-14 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 rounded-2xl text-lg font-medium transition-all"
                          value={callFormData.customer_number}
                          onChange={(e) => setCallFormData({ ...callFormData, customer_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary/70 ml-1">Select Assistant</Label>
                      <Select value={callFormData.assistant_id} onValueChange={(v) => setCallFormData({ ...callFormData, assistant_id: v })}>
                        <SelectTrigger className="h-14 bg-muted/30 border-border/50 rounded-2xl text-base font-medium">
                          <SelectValue placeholder="Which AI should call?">
                            {assistants.find(a => (a.assistant_id || (a as any)._id) === callFormData.assistant_id)?.assistant_name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {assistants.map((a) => {
                            const aId = a.assistant_id || (a as any)._id;
                            return (
                              <SelectItem key={aId} value={aId} className={`h-12 rounded-lg m-1 transition-all ${callFormData.assistant_id === aId ? 'bg-primary/10 text-primary font-bold' : ''}`}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${callFormData.assistant_id === aId ? 'bg-primary animate-pulse' : 'bg-primary/30'}`} />
                                    {a.assistant_name}
                                  </div>
                                  {callFormData.assistant_id === aId && <Check className="h-4 w-4" />}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary/70 ml-1">SIP Trunk</Label>
                      <Select value={callFormData.trunk_id} onValueChange={(v) => setCallFormData({ ...callFormData, trunk_id: v })}>
                        <SelectTrigger className="h-14 bg-muted/30 border-border/50 rounded-2xl text-base font-medium">
                          <SelectValue placeholder="Choose outbound trunk">
                            {trunks.find(t => (t.trunk_id || t._id || t.external_trunk_id) === callFormData.trunk_id)?.trunk_name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {trunks.map((t) => {
                            const tId = t.trunk_id || t._id || t.external_trunk_id;
                            return (
                              <SelectItem key={tId} value={tId} className={`h-12 rounded-lg m-1 transition-all ${callFormData.trunk_id === tId ? 'bg-primary/10 text-primary font-bold' : ''}`}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${t.trunk_type === 'twilio' ? 'bg-red-500' : 'bg-blue-500'} ${callFormData.trunk_id === tId ? 'ring-2 ring-primary/20' : ''}`} />
                                    <span>{t.trunk_name}</span>
                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 border rounded ${callFormData.trunk_id === tId ? 'border-primary' : 'opacity-50 border-current'}`}>{t.trunk_type}</span>
                                  </div>
                                  {callFormData.trunk_id === tId && <Check className="h-4 w-4" />}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button onClick={handleTriggerCall} disabled={callLoading} className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all">
                      {callLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><PhoneCall className="h-5 w-5 mr-3" /> Initiate Outbound Call</>}
                    </Button>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-2xl text-center">
                  <p className="text-sm text-muted-foreground font-medium">
                    This will initiate a real-time call using the selected assistant and SIP trunk.
                    Charges may apply based on your provider.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : (
          detailLoading ? (
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
                        value={formData.assistant_llm_mode}
                        onValueChange={(value) => updateField("assistant_llm_mode", value as "pipeline" | "realtime")}
                        className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2"
                      >
                        <Label
                          htmlFor="mode-pipeline"
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                            !isRealtimeMode ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : "border-border/60 bg-background/40",
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

                  {/* Mode-Specific Config */}
                  {isRealtimeMode ? (
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Realtime LLM Settings</h3>
                      <div className="grid gap-4 rounded-xl border border-border/60 bg-card/60 p-4">
                        <div className="grid gap-2">
                          <Label>Provider</Label>
                          <Select value={formData.assistant_llm_config?.provider || "gemini"} onValueChange={(v) => updateLLMConfig("provider", v)}>
                            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gemini">Gemini</SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Keys for Gemini and OpenAI are automatically fetched from Integrations if left blank.
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label>Model</Label>
                          <Input
                            value={formData.assistant_llm_config?.model || ""}
                            placeholder="Optional model override"
                            onChange={(e) => updateLLMConfig("model", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Voice</Label>
                          <Input
                            value={formData.assistant_llm_config?.voice || ""}
                            placeholder="Optional voice setting"
                            onChange={(e) => updateLLMConfig("voice", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>API Key Override (Optional)</Label>
                          <Input
                            type="password"
                            value={formData.assistant_llm_config?.api_key || ""}
                            placeholder="Leave blank to use integrated key"
                            onChange={(e) => updateLLMConfig("api_key", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Pipeline Voice Settings</h3>
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
                                <SelectItem value="bn-IN">bn-IN</SelectItem>
                                <SelectItem value="hi-IN">hi-IN</SelectItem>
                                <SelectItem value="en-IN">en-IN</SelectItem>
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
                        <Input
                          value={formData.assistant_interaction_config?._preferred_languages_str || ""}
                          onChange={(e) => updateInteractionConfig("_preferred_languages_str", e.target.value)}
                          placeholder="e.g. en-US, hi-IN"
                        />
                        <p className="text-[10px] text-muted-foreground">Comma-separated language codes to hint STT/TTS (e.g. en-US, hi-IN).</p>
                      </div>

                    </div>
                  </div>

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
          )
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