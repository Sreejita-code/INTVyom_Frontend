import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Bot, Plus, Loader2, Save, Trash2, Phone, ArrowLeft, PhoneCall, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

// --- Types ---
const API_BASE = "http://localhost:3000/api/assistant";

interface AssistantItem {
  assistant_id: string;
  assistant_name: string;
  assistant_created_at?: string;
  // External API may return these field names
  _id?: string;
  name?: string;
}

interface AssistantDetail {
  assistant_id?: string;
  assistant_name: string;
  assistant_description: string;
  assistant_prompt: string;
  assistant_tts_model: "cartesia" | "sarvam";
  assistant_tts_config: {
    voice_id?: string;
    target_language_code?: string;
  };
  assistant_start_instruction: string;
  assistant_end_call_url: string;
}

const emptyForm: AssistantDetail = {
  assistant_name: "",
  assistant_description: "",
  assistant_prompt: "",
  assistant_tts_model: "cartesia",
  assistant_tts_config: {
    voice_id: "",
    target_language_code: "hi-IN",
  },
  assistant_start_instruction: "",
  assistant_end_call_url: "",
};

export default function AssistantPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  // --- State ---
  const location = useLocation();
  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "empty" | "make-call">("empty");

  // Sync mode with URL param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get("mode");
    if (m === "make-call") {
      setMode("make-call");
      setSelectedId(null);
    } else if (mode === "make-call") {
      // If we were in make-call but the param is gone, go to empty
      setMode("empty");
    }
  }, [location.search]);

  const [formData, setFormData] = useState<AssistantDetail>(emptyForm);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trunks, setTrunks] = useState<any[]>([]);
  const [trunksLoading, setTrunksLoading] = useState(false);
  const [callFormData, setCallFormData] = useState({
    customer_number: "",
    assistant_id: "",
    trunk_id: "",
  });
  const [callLoading, setCallLoading] = useState(false);

  // --- Actions ---

  const fetchList = useCallback(async () => {
    if (!user?.user_id) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list?user_id=${user.user_id}`);
      const json = await res.json();

      if (!res.ok) {
        // Surface the actual backend error to the user
        const errMsg = json?.error || json?.message || "Failed to load assistants";
        toast({ variant: "destructive", title: "Error", description: errMsg });
        setAssistants([]);
        return;
      }

      // Handle multiple possible response shapes from the external API proxy:
      // 1. { data: { assistants: [...], pagination: {...} } }  — actual shape
      // 2. { data: [...] }
      // 3. { assistants: [...] }
      // 4. Root array
      let list: AssistantItem[] = [];
      if (Array.isArray(json?.data?.assistants)) {
        list = json.data.assistants;          // ← actual API shape
      } else if (Array.isArray(json?.data)) {
        list = json.data;
      } else if (Array.isArray(json?.assistants)) {
        list = json.assistants;
      } else if (Array.isArray(json)) {
        list = json;
      }
      // Normalise items to ensure assistant_id and assistant_name are always populated
      // The external API may return { name, _id } or { assistant_name, assistant_id }
      const normalised: AssistantItem[] = list.map((item: any) => ({
        ...item,
        assistant_id: item.assistant_id || item._id || "",
        assistant_name: item.assistant_name || item.name || "Unnamed Assistant",
      }));
      setAssistants(normalised);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to load assistants" });
    } finally {
      setListLoading(false);
    }
  }, [user?.user_id, toast]);

  const fetchTrunks = useCallback(async () => {
    if (!user?.user_id) return;
    setTrunksLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/sip/list?user_id=${user.user_id}`);
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

  useEffect(() => {
    fetchList();
    fetchTrunks();
  }, [fetchList, fetchTrunks]);

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
      const res = await fetch("http://localhost:3000/api/call/outbound", {
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

  const handleCreateNew = () => {
    setSelectedId(null);
    setFormData(emptyForm);
    setMode("create");
  };

  const handleSelectAssistant = async (id: string) => {
    if (!user?.user_id) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User ID not found. Please log in again.",
      });
      return;
    }

    setSelectedId(id);
    setMode("edit");
    setDetailLoading(true);

    try {
      const res = await fetch(`${API_BASE}/details/${id}?user_id=${user.user_id}`);
      const json = await res.json();

      if (res.ok && json.data) {
        const d = json.data;
        setFormData({
          assistant_id: d.assistant_id,
          assistant_name: d.assistant_name || "",
          assistant_description: d.assistant_description || "",
          assistant_prompt: d.assistant_prompt || "",
          assistant_tts_model: d.assistant_tts_model || "cartesia",
          assistant_tts_config: {
            voice_id: d.assistant_tts_config?.voice_id || d.assistant_tts_config?.speaker || "",
            target_language_code: d.assistant_tts_config?.target_language_code || "hi-IN",
          },
          assistant_start_instruction: d.assistant_start_instruction || "",
          assistant_end_call_url: d.assistant_end_call_url || "",
        });
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
    if (e) e.stopPropagation(); // Prevent triggering handleSelectAssistant when clicking trash icon

    if (!user?.user_id) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User ID not found. Please log in again.",
      });
      return;
    }

    if (!window.confirm("Are you sure you want to delete this assistant? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);

    try {
      const res = await fetch(`${API_BASE}/delete/${id}?user_id=${user.user_id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || json.message || "Failed to delete assistant");

      toast({
        title: "Assistant Deleted",
        description: "The assistant has been successfully removed.",
      });

      // If the currently open assistant was deleted, reset the view
      if (selectedId === id) {
        setMode("empty");
        setSelectedId(null);
      }

      await fetchList();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.user_id) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User ID not found. Please log in again.",
      });
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        user_id: user.user_id,
        assistant_name: formData.assistant_name,
        assistant_description: formData.assistant_description,
        assistant_prompt: formData.assistant_prompt,
        assistant_tts_model: formData.assistant_tts_model,
        assistant_start_instruction: formData.assistant_start_instruction,
        assistant_end_call_url: formData.assistant_end_call_url,
      };

      if (formData.assistant_tts_model === "sarvam") {
        payload.assistant_tts_config = {
          speaker: formData.assistant_tts_config.voice_id,
          target_language_code: formData.assistant_tts_config.target_language_code || "hi-IN",
        };
      } else {
        payload.assistant_tts_config = {
          voice_id: formData.assistant_tts_config.voice_id,
        };
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

      await fetchList();

      if (mode === "create") {
        if (json.assistant?.external_assistant_id) {
          handleSelectAssistant(json.assistant.external_assistant_id);
        } else if (json.data?.assistant_id) {
          handleSelectAssistant(json.data.assistant_id);
        }
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof AssistantDetail, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTTS = (field: "voice_id" | "target_language_code", value: string) => {
    setFormData(prev => ({
      ...prev,
      assistant_tts_config: { ...prev.assistant_tts_config, [field]: value }
    }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">

      {/* --- SIDEBAR --- */}
      {mode !== "make-call" && (
        <div className="w-80 border-r border-border flex flex-col bg-card/30 animate-in slide-in-from-left duration-300">
          <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Assistants</span>
            </div>
            <Button
              size="sm"
              onClick={handleCreateNew}
              className="h-8 px-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assistants.length === 0 ? (
                <div className="text-center py-10 px-4 text-muted-foreground text-sm">
                  No assistants found. Create one to get started.
                </div>
              ) : (
                assistants.map((item) => {
                  const itemId = item.assistant_id || (item as any)._id;
                  return (
                    <div
                      key={itemId}
                      onClick={() => handleSelectAssistant(itemId)}
                      className={`
                        group flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all border
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
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium truncate ${selectedId === itemId ? "text-primary" : "text-foreground"}`}>
                          {item.assistant_name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate font-mono opacity-70">
                          {itemId.slice(0, 8)}...
                        </p>
                      </div>

                      {/* Delete Button inside Sidebar (Shows on Hover) */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => handleDeleteAssistant(itemId, e)}
                        disabled={deletingId === itemId}
                      >
                        {deletingId === itemId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* --- RIGHT MAIN PANEL --- */}
      <div className="flex-1 flex flex-col bg-background relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
          <span className="text-[12rem] font-black select-none">VYOM</span>
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
            {/* HEADER */}
            <div className="p-8 border-b border-border bg-card/20 backdrop-blur-md flex items-center justify-between">
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

            {/* FORM CONTENT */}
            <ScrollArea className="flex-1">
              <div className="p-10 max-w-2xl mx-auto">
                <div className="glass rounded-3xl p-10 space-y-8 border border-border/50 shadow-2xl relative overflow-hidden">
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
                      <Select
                        value={callFormData.assistant_id}
                        onValueChange={(v) => setCallFormData({ ...callFormData, assistant_id: v })}
                      >
                        <SelectTrigger className="h-14 bg-muted/30 border-border/50 rounded-2xl text-base font-medium">
                          <SelectValue placeholder="Which AI should call?">
                            {assistants.find(a => (a.assistant_id || (a as any)._id) === callFormData.assistant_id)?.assistant_name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {assistants.map((a) => {
                            const aId = a.assistant_id || (a as any)._id;
                            return (
                              <SelectItem
                                key={aId}
                                value={aId}
                                className={`h-12 rounded-lg m-1 transition-all ${callFormData.assistant_id === aId ? 'bg-primary/10 text-primary font-bold' : ''}`}
                              >
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
                      <Select
                        value={callFormData.trunk_id}
                        onValueChange={(v) => setCallFormData({ ...callFormData, trunk_id: v })}
                      >
                        <SelectTrigger className="h-14 bg-muted/30 border-border/50 rounded-2xl text-base font-medium">
                          <SelectValue placeholder="Choose outbound trunk">
                            {trunks.find(t => (t.trunk_id || t._id || t.external_trunk_id) === callFormData.trunk_id)?.trunk_name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {trunks.map((t) => {
                            const tId = t.trunk_id || t._id || t.external_trunk_id;
                            return (
                              <SelectItem
                                key={tId}
                                value={tId}
                                className={`h-12 rounded-lg m-1 transition-all ${callFormData.trunk_id === tId ? 'bg-primary/10 text-primary font-bold' : ''}`}
                              >
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
                    <Button
                      onClick={handleTriggerCall}
                      disabled={callLoading}
                      className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                    >
                      {callLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <PhoneCall className="h-5 w-5 mr-3" />
                          Initiate Outbound Call
                        </>
                      )}
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

              {/* HEADER */}
              <div className="p-6 border-b border-border bg-card/20 backdrop-blur-md flex items-start justify-between">
                <div className="space-y-1 w-full max-w-2xl">
                  {mode === "create" ? (
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-5 w-5" />
                      <h2 className="text-xl font-bold">Create New Assistant</h2>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        value={formData.assistant_name}
                        onChange={(e) => updateField("assistant_name", e.target.value)}
                        className="text-2xl font-bold h-auto border-none p-0 bg-transparent focus-visible:ring-0 rounded-none border-b border-transparent focus:border-primary w-full shadow-none hover:bg-transparent"
                        placeholder="Assistant Name"
                      />
                      <p className="text-sm text-muted-foreground font-mono">
                        {formData.assistant_id}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {/* Delete Button inside Header (Edit Mode only) */}
                  {mode === "edit" && selectedId && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteAssistant(selectedId)}
                      disabled={deletingId === selectedId || saving}
                      className="shadow-lg shadow-destructive/20"
                    >
                      {deletingId === selectedId ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={saving || !!deletingId}
                    className="min-w-[100px] shadow-lg shadow-primary/20"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </div>

              {/* FORM CONTENT */}
              <ScrollArea className="flex-1">
                <div className="p-8 max-w-4xl mx-auto space-y-10 pb-20">

                  {/* CREATE MODE: Includes Description under basic fields */}
                  {mode === "create" && (
                    <div className="grid gap-6">
                      <div className="grid gap-2">
                        <Label>Assistant Name</Label>
                        <Input
                          placeholder="e.g. Support Bot"
                          value={formData.assistant_name}
                          onChange={(e) => updateField("assistant_name", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Assistant Description</Label>
                        <Input
                          placeholder="Description..."
                          value={formData.assistant_description}
                          onChange={(e) => updateField("assistant_description", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* System Prompt Section */}
                  <div className="space-y-4">
                    {mode === "edit" ? (
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">System Prompt</h3>
                    ) : (
                      <Label className="text-base font-semibold">System Prompt</Label>
                    )}
                    <Textarea
                      placeholder="You are a helpful support agent..."
                      className="min-h-[150px] font-mono text-sm leading-relaxed"
                      value={formData.assistant_prompt}
                      onChange={(e) => updateField("assistant_prompt", e.target.value)}
                    />
                  </div>

                  {/* TTS Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-border/50 pb-2">TTS Section</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Model</Label>
                        <Select
                          value={formData.assistant_tts_model}
                          onValueChange={(v) => updateField("assistant_tts_model", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cartesia">Cartesia</SelectItem>
                            <SelectItem value="sarvam">Sarvam</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Voice Id</Label>
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
                          <Select
                            value={formData.assistant_tts_config.target_language_code || "hi-IN"}
                            onValueChange={(v) => updateTTS("target_language_code", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bn-IN">bn-IN</SelectItem>
                              <SelectItem value="hi-IN">hi-IN</SelectItem>
                              <SelectItem value="en-IN">en-IN</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* For Create Mode: Show Advanced directly here */}
                      {mode === "create" && (
                        <>
                          <div className="grid gap-2">
                            <Label>Start Instruction</Label>
                            <Input
                              placeholder="Hello, how can I help you today?"
                              value={formData.assistant_start_instruction}
                              onChange={(e) => updateField("assistant_start_instruction", e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>End Call URL (Optional)</Label>
                            <Input
                              placeholder="https://callback.com/end"
                              value={formData.assistant_end_call_url}
                              onChange={(e) => updateField("assistant_end_call_url", e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Advanced Section (Edit Mode) */}
                  {mode === "edit" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Advanced</h3>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>Start Instruction</Label>
                          <Input
                            placeholder="Hello, how can I help you today?"
                            value={formData.assistant_start_instruction}
                            onChange={(e) => updateField("assistant_start_instruction", e.target.value)}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>End Call URL (Optional)</Label>
                          <Input
                            placeholder="https://callback.com/end"
                            value={formData.assistant_end_call_url}
                            onChange={(e) => updateField("assistant_end_call_url", e.target.value)}
                            className="font-mono text-sm"
                          />
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
    </div>
  );
}