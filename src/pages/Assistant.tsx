import { useEffect, useState, useCallback } from "react";
import { Bot, Plus, Loader2, Save, Trash2 } from "lucide-react";

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
}

interface AssistantDetail {
  assistant_id?: string;
  assistant_name: string;
  assistant_description: string;
  assistant_prompt: string;
  assistant_tts_model: "cartesia" | "sarvam";
  assistant_tts_config: {
    voice_id?: string;
    api_key?: string;
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
    api_key: "",
  },
  assistant_start_instruction: "",
  assistant_end_call_url: "",
};

export default function AssistantPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  // --- State ---
  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "empty">("empty");

  const [formData, setFormData] = useState<AssistantDetail>(emptyForm);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      if (res.ok) {
        setAssistants(Array.isArray(json.data) ? json.data : []);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to load assistants" });
    } finally {
      setListLoading(false);
    }
  }, [user?.user_id, toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

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
            api_key: d.assistant_tts_config?.api_key || "",
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
          target_language_code: "hi-IN",
          api_key: formData.assistant_tts_config.api_key
        };
      } else {
        payload.assistant_tts_config = {
          voice_id: formData.assistant_tts_config.voice_id,
          api_key: formData.assistant_tts_config.api_key
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

  const updateTTS = (field: "voice_id" | "api_key", value: string) => {
    setFormData(prev => ({
      ...prev,
      assistant_tts_config: { ...prev.assistant_tts_config, [field]: value }
    }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">

      {/* --- SIDEBAR --- */}
      <div className="w-80 border-r border-border flex flex-col bg-card/30">
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
            <Plus className="h-4 w-4 mr-1" /> New Assistant
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
              assistants.map((item) => (
                <div
                  key={item.assistant_id}
                  onClick={() => handleSelectAssistant(item.assistant_id)}
                  className={`
                    group flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all border
                    ${selectedId === item.assistant_id
                      ? "bg-accent/50 border-primary/50 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]"
                      : "bg-transparent border-transparent hover:bg-accent/30 hover:border-border"
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${selectedId === item.assistant_id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                  `}>
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${selectedId === item.assistant_id ? "text-primary" : "text-foreground"}`}>
                      {item.assistant_name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate font-mono opacity-70">
                      {item.assistant_id.slice(0, 8)}...
                    </p>
                  </div>
                  
                  {/* Delete Button inside Sidebar (Shows on Hover) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => handleDeleteAssistant(item.assistant_id, e)}
                    disabled={deletingId === item.assistant_id}
                  >
                    {deletingId === item.assistant_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

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

                      <div className="grid gap-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          placeholder="••••••••••••••••••••••••"
                          value={formData.assistant_tts_config.api_key}
                          onChange={(e) => updateTTS("api_key", e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      
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