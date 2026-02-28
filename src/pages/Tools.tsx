// src/pages/Tools.tsx
import { useEffect, useState, useCallback } from "react";
import { Wrench, Plus, Loader2, Save, Trash2, X } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:3005/api/tool";

interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  _enumString?: string; // Local UI helper
}

interface ToolDetail {
  tool_id?: string;
  tool_name: string;
  tool_description: string;
  tool_execution_type: "webhook" | "static_return";
  tool_execution_config: any;
  tool_parameters: ToolParameter[];
}

const emptyForm: ToolDetail = {
  tool_name: "",
  tool_description: "",
  tool_execution_type: "webhook",
  tool_execution_config: {
    url: "",
    timeout: 10,
  },
  tool_parameters: [],
};

export default function ToolsPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  const [tools, setTools] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "empty">("empty");
  const [formData, setFormData] = useState<ToolDetail>(emptyForm);
  const [headersList, setHeadersList] = useState<{ key: string; value: string }[]>([]);
  const [staticValue, setStaticValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    if (!user?.user_id) return;
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/list?user_id=${user.user_id}`);
      const json = await res.json();
      if (res.ok) {
        setTools(json.data || []);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to load tools" });
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
    setHeadersList([]);
    setStaticValue("");
    setMode("create");
  };

  const handleSelectTool = async (id: string) => {
    if (!user?.user_id) return;
    setSelectedId(id);
    setMode("edit");
    setDetailLoading(true);

    try {
      const res = await fetch(`${API_BASE}/details/${id}?user_id=${user.user_id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        const d = json.data;
        setFormData({
          tool_id: d.tool_id,
          tool_name: d.tool_name || "",
          tool_description: d.tool_description || "",
          tool_execution_type: d.tool_execution_type || "webhook",
          tool_execution_config: d.tool_execution_config || {},
          tool_parameters: (d.tool_parameters || []).map((p: any) => ({
            ...p,
            _enumString: p.enum ? p.enum.join(", ") : "",
          })),
        });

        if (d.tool_execution_type === "webhook") {
          const h = d.tool_execution_config?.headers || {};
          setHeadersList(Object.keys(h).map((k) => ({ key: k, value: h[k] })));
        } else {
          setStaticValue(d.tool_execution_config?.value || "");
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error loading details" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteTool = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.user_id || !window.confirm("Delete this tool?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/delete/${id}?user_id=${user.user_id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Tool Deleted" });
      if (selectedId === id) {
        setMode("empty");
        setSelectedId(null);
      }
      await fetchList();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.user_id) return;
    setSaving(true);

    try {
      // Build execution config based on type
      let finalConfig: any = {};
      if (formData.tool_execution_type === "webhook") {
        const headersObj: Record<string, string> = {};
        headersList.forEach((h) => {
          if (h.key.trim() !== "") headersObj[h.key.trim()] = h.value;
        });
        finalConfig = {
          url: formData.tool_execution_config.url,
          timeout: Number(formData.tool_execution_config.timeout) || 10,
          headers: headersObj,
        };
      } else {
        finalConfig = { value: staticValue };
      }

      // Cleanup parameters
      const cleanParams = formData.tool_parameters.map((p) => {
        const param = {
          name: p.name,
          type: p.type,
          description: p.description,
          required: p.required,
        } as any;
        if (p.type === "string" && p._enumString?.trim()) {
          param.enum = p._enumString.split(",").map((s) => s.trim()).filter((s) => s);
        }
        return param;
      });

      const payload = {
        user_id: user.user_id,
        tool_name: formData.tool_name,
        tool_description: formData.tool_description,
        tool_execution_type: formData.tool_execution_type,
        tool_execution_config: finalConfig,
        tool_parameters: cleanParams,
      };

      const url = mode === "create" ? `${API_BASE}/create` : `${API_BASE}/update/${selectedId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || "Operation failed");

      toast({ title: mode === "create" ? "Tool Created" : "Tool Updated" });
      await fetchList();

      if (mode === "create" && json.data?.tool_id) {
        handleSelectTool(json.data.tool_id);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const addParameter = () => {
    setFormData((prev) => ({
      ...prev,
      tool_parameters: [
        ...prev.tool_parameters,
        { name: "", type: "string", description: "", required: true, _enumString: "" },
      ],
    }));
  };

  const updateParameter = (index: number, field: keyof ToolParameter, value: any) => {
    const newParams = [...formData.tool_parameters];
    newParams[index] = { ...newParams[index], [field]: value };
    setFormData((prev) => ({ ...prev, tool_parameters: newParams }));
  };

  const removeParameter = (index: number) => {
    const newParams = [...formData.tool_parameters];
    newParams.splice(index, 1);
    setFormData((prev) => ({ ...prev, tool_parameters: newParams }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* SIDEBAR */}
      <div className="w-80 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="font-semibold">Tools</span>
          </div>
          <Button size="sm" onClick={handleCreateNew} className="h-8 px-2">
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {listLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : tools.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No tools found.</div>
            ) : (
              tools.map((item) => (
                <div
                  key={item.tool_id}
                  onClick={() => handleSelectTool(item.tool_id)}
                  className={`group flex items-center gap-3 p-3 rounded-md cursor-pointer border ${
                    selectedId === item.tool_id ? "bg-accent/50 border-primary/50" : "hover:bg-accent/30 border-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{item.tool_name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{item.tool_execution_type}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleDeleteTool(item.tool_id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* MAIN PANEL */}
      <div className="flex-1 flex flex-col relative">
        {mode === "empty" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Wrench className="h-16 w-16 mb-4 opacity-20" />
            <h2 className="text-xl">No Tool Selected</h2>
            <p className="text-sm">Select a tool or create a new one.</p>
          </div>
        ) : detailLoading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
        ) : (
          <div className="flex-1 flex flex-col h-full z-10">
            {/* HEADER */}
            <div className="p-6 border-b border-border bg-card/20 flex justify-between">
              <div>
                <h2 className="text-xl font-bold">{mode === "create" ? "Create New Tool" : formData.tool_name}</h2>
                {mode === "edit" && <p className="text-sm text-muted-foreground font-mono">{formData.tool_id}</p>}
              </div>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save
              </Button>
            </div>

            <ScrollArea className="flex-1 p-8">
              <div className="max-w-3xl mx-auto space-y-8 pb-20">
                
                {/* Basic Info */}
                <div className="space-y-4 glass p-6 rounded-xl border border-border/50">
                  <h3 className="font-semibold border-b border-border/50 pb-2">Basic Details</h3>
                  <div className="grid gap-2">
                    <Label>Tool Name *</Label>
                    <Input
                      placeholder="e.g. lookup_weather"
                      value={formData.tool_name}
                      onChange={(e) => setFormData({ ...formData, tool_name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    />
                    <p className="text-xs text-muted-foreground">Must be snake_case (a-z, 0-9, underscores).</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description *</Label>
                    <Textarea
                      placeholder="Explain to the LLM what this tool does..."
                      value={formData.tool_description}
                      onChange={(e) => setFormData({ ...formData, tool_description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Execution Config */}
                <div className="space-y-4 glass p-6 rounded-xl border border-border/50">
                  <h3 className="font-semibold border-b border-border/50 pb-2">Execution Configuration</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Select
                      value={formData.tool_execution_type}
                      onValueChange={(v: "webhook" | "static_return") => setFormData({ ...formData, tool_execution_type: v })}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webhook">Webhook Endpoint</SelectItem>
                        <SelectItem value="static_return">Static Return Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.tool_execution_type === "webhook" ? (
                    <div className="grid gap-4 mt-4 animate-in fade-in">
                      <div className="grid gap-2">
                        <Label>Webhook URL *</Label>
                        <Input
                          placeholder="https://api.example.com/data"
                          value={formData.tool_execution_config.url || ""}
                          onChange={(e) => setFormData({ ...formData, tool_execution_config: { ...formData.tool_execution_config, url: e.target.value }})}
                        />
                      </div>
                      <div className="grid gap-2 w-48">
                        <Label>Timeout (Seconds)</Label>
                        <Input
                          type="number"
                          value={formData.tool_execution_config.timeout || 10}
                          onChange={(e) => setFormData({ ...formData, tool_execution_config: { ...formData.tool_execution_config, timeout: e.target.value }})}
                        />
                      </div>
                      <div className="grid gap-2 mt-2">
                        <Label>HTTP Headers</Label>
                        {headersList.map((h, i) => (
                          <div key={i} className="flex gap-2">
                            <Input placeholder="Key (e.g. Authorization)" value={h.key} onChange={(e) => {
                              const newH = [...headersList]; newH[i].key = e.target.value; setHeadersList(newH);
                            }}/>
                            <Input placeholder="Value" value={h.value} onChange={(e) => {
                              const newH = [...headersList]; newH[i].value = e.target.value; setHeadersList(newH);
                            }}/>
                            <Button variant="ghost" size="icon" onClick={() => setHeadersList(headersList.filter((_, idx) => idx !== i))}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-max mt-2" onClick={() => setHeadersList([...headersList, { key: "", value: "" }])}>
                          <Plus className="h-3 w-3 mr-1" /> Add Header
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2 mt-4 animate-in fade-in">
                      <Label>Return Value *</Label>
                      <Textarea
                        placeholder="The string or JSON you want to return to the assistant"
                        value={staticValue}
                        onChange={(e) => setStaticValue(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Parameters Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Tool Parameters</h3>
                    <Button variant="secondary" size="sm" onClick={addParameter}>
                      <Plus className="h-4 w-4 mr-1" /> Add Parameter
                    </Button>
                  </div>

                  {formData.tool_parameters.map((param, index) => (
                    <div key={index} className="glass p-5 rounded-xl border border-border/50 space-y-4 relative">
                      <Button
                        variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-4 mr-8">
                        <div className="grid gap-2">
                          <Label>Parameter Name *</Label>
                          <Input value={param.name} onChange={(e) => updateParameter(index, "name", e.target.value)} placeholder="e.g. location" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Data Type</Label>
                          <Select value={param.type} onValueChange={(v) => updateParameter(index, "type", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="object">Object</SelectItem>
                              <SelectItem value="array">Array</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Input value={param.description} onChange={(e) => updateParameter(index, "description", e.target.value)} placeholder="Helps the LLM know what to extract..." />
                      </div>

                      {param.type === "string" && (
                        <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                          <Label>Allowed Values (Comma separated)</Label>
                          <Input 
                            value={param._enumString || ""} 
                            onChange={(e) => updateParameter(index, "_enumString", e.target.value)} 
                            placeholder="e.g. celsius, fahrenheit" 
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Switch checked={param.required} onCheckedChange={(v) => updateParameter(index, "required", v)} />
                        <Label>Required Parameter</Label>
                      </div>
                    </div>
                  ))}
                  {formData.tool_parameters.length === 0 && (
                    <div className="text-center p-6 border border-dashed rounded-xl text-muted-foreground">
                      No parameters added. The LLM won't extract any arguments for this tool.
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}