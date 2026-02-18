import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Plus, Loader2, Save } from "lucide-react";
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
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:3000/api/assistant";

interface AssistantItem {
  assistant_id: string;
  assistant_name: string;
}

interface AssistantDetail {
  assistant_id: string;
  assistant_name: string;
  assistant_description?: string;
  system_prompt?: string;
  tts_model?: string;
  assistant_tts_config?: { voice_id?: string; api_key?: string };
  speaker?: string;
  start_instruction?: string;
  end_call_url?: string;
}

const emptyForm = {
  assistant_name: "",
  assistant_description: "",
  system_prompt: "",
  tts_model: "cartesia",
  voice_id: "",
  tts_api_key: "",
  start_instruction: "",
  end_call_url: "",
};

const Assistant = () => {
  const user = getStoredUser();
  const { toast } = useToast();

  const [list, setList] = useState<AssistantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [form, setForm] = useState(emptyForm);
  const [original, setOriginal] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    if (!user?.user_id) return;
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list?user_id=${encodeURIComponent(user.user_id)}`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Error", description: "Failed to fetch assistants", variant: "destructive" });
    } finally {
      setListLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadDetail = async (id: string) => {
    if (!user?.user_id) return;
    setDetailLoading(true);
    setSelectedId(id);
    setMode("edit");
    try {
      const res = await fetch(`${API_BASE}/details/${id}?user_id=${encodeURIComponent(user.user_id)}`);
      const d: AssistantDetail = await res.json();
      const mapped = {
        assistant_name: d.assistant_name || "",
        assistant_description: d.assistant_description || "",
        system_prompt: d.system_prompt || "",
        tts_model: d.tts_model || "cartesia",
        voice_id: d.assistant_tts_config?.voice_id || d.speaker || "",
        tts_api_key: d.assistant_tts_config?.api_key || "",
        start_instruction: d.start_instruction || "",
        end_call_url: d.end_call_url || "",
      };
      setForm(mapped);
      setOriginal(mapped);
    } catch {
      toast({ title: "Error", description: "Failed to load assistant details", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const startCreate = () => {
    setSelectedId(null);
    setMode("create");
    setForm(emptyForm);
    setOriginal(emptyForm);
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!user?.user_id) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        user_id: user.user_id,
        assistant_name: form.assistant_name,
        assistant_description: form.assistant_description,
        system_prompt: form.system_prompt,
        tts_model: form.tts_model,
        assistant_tts_config: { voice_id: form.voice_id, api_key: form.tts_api_key },
        start_instruction: form.start_instruction,
        end_call_url: form.end_call_url,
      };
      const res = await fetch(`${API_BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Create failed");
      toast({ title: "Created", description: "Assistant created successfully" });
      await fetchList();
      if (data.assistant_id) {
        loadDetail(data.assistant_id);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.user_id || !selectedId) return;
    setSaving(true);
    try {
      const changed: Record<string, unknown> = { user_id: user.user_id };
      for (const key of Object.keys(form) as (keyof typeof form)[]) {
        if (form[key] !== original[key]) {
          if (key === "voice_id" || key === "tts_api_key") continue;
          changed[key] = form[key];
        }
      }
      if (form.voice_id !== original.voice_id || form.tts_api_key !== original.tts_api_key) {
        changed.assistant_tts_config = { voice_id: form.voice_id, api_key: form.tts_api_key };
      }
      const res = await fetch(`${API_BASE}/update/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      toast({ title: "Saved", description: "Assistant updated successfully" });
      setOriginal({ ...form });
      fetchList();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Inner Sidebar */}
      <aside className="w-1/4 min-w-[220px] max-w-[300px] border-r border-border flex flex-col bg-card/40">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card/60 backdrop-blur-sm z-10">
          <h3 className="text-sm font-semibold text-foreground">Assistants</h3>
          <Button size="sm" className="neon-glow h-8 text-xs" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {listLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No assistants yet</p>
          ) : (
            list.map((a) => (
              <button
                key={a.assistant_id}
                onClick={() => loadDetail(a.assistant_id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all truncate ${
                  selectedId === a.assistant_id
                    ? "bg-primary/10 text-primary neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Bot className="h-3.5 w-3.5 inline mr-2 opacity-60" />
                {a.assistant_name}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Editor */}
      <div className="flex-1 overflow-y-auto">
        {mode === "none" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-sm text-muted-foreground">Select an assistant or create a new one</p>
            </div>
          </div>
        )}

        {(mode === "create" || mode === "edit") && (
          <motion.div
            key={mode === "edit" ? selectedId : "create"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-8 max-w-3xl mx-auto"
          >
            {detailLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex-1 mr-4">
                    {mode === "edit" ? (
                      <>
                        <Input
                          value={form.assistant_name}
                          onChange={(e) => handleChange("assistant_name", e.target.value)}
                          className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-foreground"
                        />
                        <span className="text-xs font-mono text-muted-foreground mt-1 block">
                          {selectedId}
                        </span>
                      </>
                    ) : (
                      <h2 className="text-xl font-semibold text-foreground">New Assistant</h2>
                    )}
                  </div>
                  <Button
                    className="neon-glow"
                    onClick={mode === "create" ? handleCreate : handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {mode === "create" ? "Create" : "Save"}
                  </Button>
                </div>

                {/* Basic Info */}
                <section className="glass rounded-lg p-6 mb-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Basic Info</h4>
                  {mode === "create" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Assistant Name</Label>
                      <Input
                        value={form.assistant_name}
                        onChange={(e) => handleChange("assistant_name", e.target.value)}
                        placeholder="My Assistant"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      value={form.assistant_description}
                      onChange={(e) => handleChange("assistant_description", e.target.value)}
                      placeholder="A brief description..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">System Prompt</Label>
                    <Textarea
                      value={form.system_prompt}
                      onChange={(e) => handleChange("system_prompt", e.target.value)}
                      placeholder="You are a helpful assistant..."
                      className="min-h-[140px]"
                    />
                  </div>
                </section>

                {/* TTS */}
                <section className="glass rounded-lg p-6 mb-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">TTS Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Model</Label>
                      <Select value={form.tts_model} onValueChange={(v) => handleChange("tts_model", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cartesia">Cartesia</SelectItem>
                          <SelectItem value="sarvam">Sarvam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Voice ID</Label>
                      <Input
                        value={form.voice_id}
                        onChange={(e) => handleChange("voice_id", e.target.value)}
                        placeholder="voice-id-here"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">TTS API Key</Label>
                    <Input
                      type="password"
                      value={form.tts_api_key}
                      onChange={(e) => handleChange("tts_api_key", e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </section>

                {/* Advanced */}
                <section className="glass rounded-lg p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Advanced</h4>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start Instruction</Label>
                    <Input
                      value={form.start_instruction}
                      onChange={(e) => handleChange("start_instruction", e.target.value)}
                      placeholder="Initial instruction..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">End Call URL (optional)</Label>
                    <Input
                      value={form.end_call_url}
                      onChange={(e) => handleChange("end_call_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </section>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Assistant;
