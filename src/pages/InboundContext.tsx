import { useEffect, useState, useCallback, useMemo } from "react";
import { Webhook, Plus, Loader2, Trash2, ExternalLink, Globe, Shield, Activity, Search, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/inbound-context-strategy`;

interface StrategyConfig {
    url: string;
    headers?: Record<string, string>;
}

interface StrategyItem {
    strategy_id: string; 
    external_strategy_id?: string;
    _id?: string;
    name: string; 
    type: string; 
    strategy_config: StrategyConfig;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export default function InboundContextPage() {
    const user = getStoredUser();
    const { toast } = useToast();

    const [strategies, setStrategies] = useState<StrategyItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [selectedStrategy, setSelectedStrategy] = useState<StrategyItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form States
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Create Modal Form
    const [modalForm, setModalForm] = useState({
        name: "",
        url: "",
        headersStr: "{\n  \n}" // For valid JSON parsing
    });

    // Update Form States
    const [updateForm, setUpdateForm] = useState({
        name: "",
        url: "",
        headersStr: ""
    });

    // FIX: Removed internal selectedStrategy logic and dependencies to completely stop the infinite loop
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
                const data = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
                
                const formatted = data.map((st: any) => ({
                    ...st,
                    strategy_id: st.strategy_id || st.external_strategy_id || st.id || st._id,
                    name: st.name || st.strategy_name || "Unnamed Strategy", 
                    type: st.type || st.strategy_type || "webhook"           
                }));
                
                setStrategies(formatted);
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Failed to load strategies" });
        } finally {
            setListLoading(false);
        }
    }, [user?.user_id, toast]); // <-- Safely removed selectedStrategy

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSelectStrategy = (strategy: StrategyItem) => {
        setSelectedStrategy(strategy);
        setUpdateForm({
            name: strategy.name,
            url: strategy.strategy_config?.url || "",
            headersStr: strategy.strategy_config?.headers ? JSON.stringify(strategy.strategy_config.headers, null, 2) : "{\n  \n}"
        });
    };

    const filteredStrategies = useMemo(() => {
        if (!searchQuery.trim()) return strategies;
        const lowerQ = searchQuery.toLowerCase();
        return strategies.filter(s => s.name.toLowerCase().includes(lowerQ));
    }, [strategies, searchQuery]);

    const handleCreate = async () => {
        if (!user?.user_id) return;
        if (!modalForm.name || !modalForm.url) {
            toast({ variant: "destructive", title: "Validation Error", description: "Name and Webhook URL are required" });
            return;
        }

        let parsedHeaders = undefined;
        try {
            if (modalForm.headersStr.trim() && modalForm.headersStr.trim() !== "{}" && modalForm.headersStr.trim() !== "{\n  \n}") {
                parsedHeaders = JSON.parse(modalForm.headersStr);
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Invalid JSON", description: "Headers must be valid JSON format" });
            return;
        }

        setIsCreating(true);
        try {
            const payload = {
                user_id: user.user_id,
                name: modalForm.name,
                type: "webhook",
                strategy_config: {
                    url: modalForm.url,
                    ...(parsedHeaders && { headers: parsedHeaders })
                }
            };

            const res = await fetch(`${API_BASE}/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Strategy created successfully" });
                setIsModalOpen(false);
                setModalForm({ name: "", url: "", headersStr: "{\n  \n}" });
                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to create strategy" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedStrategy || !user?.user_id) return;
        if (!updateForm.name || !updateForm.url) {
            toast({ variant: "destructive", title: "Validation Error", description: "Name and Webhook URL are required" });
            return;
        }

        let parsedHeaders = undefined;
        try {
            if (updateForm.headersStr.trim() && updateForm.headersStr.trim() !== "{}") {
                parsedHeaders = JSON.parse(updateForm.headersStr);
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Invalid JSON", description: "Headers must be valid JSON format" });
            return;
        }

        setIsUpdating(true);
        try {
            const payload = {
                user_id: user.user_id,
                name: updateForm.name,
                strategy_config: {
                    url: updateForm.url,
                    ...(parsedHeaders && { headers: parsedHeaders })
                }
            };

            const res = await fetch(`${API_BASE}/update/${selectedStrategy.strategy_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Strategy updated successfully" });
                
                // Optimistic UI update instantly reflects changes without refetching the whole list
                setSelectedStrategy(prev => prev ? {
                    ...prev,
                    name: updateForm.name,
                    strategy_config: {
                        ...prev.strategy_config,
                        url: updateForm.url,
                        ...(parsedHeaders && { headers: parsedHeaders })
                    }
                } : null);

                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to update strategy" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedStrategy || !user?.user_id) return;
        if (!window.confirm("Are you sure you want to delete this strategy? Inbound numbers using this will fallback to defaults.")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_BASE}/delete/${selectedStrategy.strategy_id}?user_id=${user.user_id}`, {
                method: "DELETE"
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Strategy deleted successfully" });
                setSelectedStrategy(null);
                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to delete" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
            {/* Sidebar List */}
            <div className="w-[350px] border-r border-border flex flex-col bg-card/30">
                <div className="p-4 border-b border-border space-y-4 sticky top-0 bg-background/50 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-foreground">Context Strategies</span>
                        </div>

                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-8 px-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Plus className="h-4 w-4 mr-1" /> Create
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl border-none shadow-2xl rounded-xl bg-background">
                                <DialogHeader className="p-6 border-b border-border bg-card/10">
                                    <DialogTitle className="text-xl flex items-center gap-2">
                                        <Webhook className="h-5 w-5 text-primary" /> New Strategy
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Strategy Name</Label>
                                        <Input
                                            placeholder="e.g. CRM Customer Lookup"
                                            value={modalForm.name}
                                            onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                                            className="bg-muted/30"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Webhook URL</Label>
                                        <Input
                                            placeholder="https://your-api.com/lookup"
                                            value={modalForm.url}
                                            onChange={(e) => setModalForm({ ...modalForm, url: e.target.value })}
                                            className="bg-muted/30 font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Code className="h-4 w-4" /> Custom Headers (JSON) <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                                        </Label>
                                        <Textarea
                                            placeholder='{"Authorization": "Bearer token"}'
                                            value={modalForm.headersStr}
                                            onChange={(e) => setModalForm({ ...modalForm, headersStr: e.target.value })}
                                            className="bg-muted/30 font-mono text-xs h-32 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreate} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Strategy"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search strategies..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-muted/50 border-border/50 focus:border-primary"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                        {listLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                <span className="text-xs text-muted-foreground animate-pulse">Fetching strategies...</span>
                            </div>
                        ) : filteredStrategies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Search className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-sm font-medium mb-1">No Strategies Found</h3>
                                <p className="text-xs text-muted-foreground">Create a webhook strategy to fetch caller data.</p>
                            </div>
                        ) : (
                            filteredStrategies.map((item) => (
                                <div
                                    key={item.strategy_id}
                                    onClick={() => handleSelectStrategy(item)}
                                    className={cn(
                                        "group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                                        selectedStrategy?.strategy_id === item.strategy_id
                                            ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]"
                                            : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                        selectedStrategy?.strategy_id === item.strategy_id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    )}>
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={cn(
                                            "text-sm font-semibold truncate",
                                            selectedStrategy?.strategy_id === item.strategy_id ? "text-primary" : "text-foreground"
                                        )}>
                                            {item.name}
                                        </h4>
                                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5 truncate flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> {item.strategy_config?.url || "No URL"}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Panel Details */}
            <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_0%,transparent_50%)]" />
                </div>

                {!selectedStrategy ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 relative z-10 animate-in fade-in duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                            <Webhook className="h-10 w-10 text-primary/30" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Inbound Context Strategies</h2>
                        <p className="max-w-sm text-center text-sm text-muted-foreground leading-relaxed">
                            Select a strategy to manage webhook configurations for fetching caller data before an assistant connects.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden z-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-border bg-card/10 backdrop-blur-xl flex items-end justify-between shrink-0">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <Webhook className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight">{selectedStrategy.name}</h2>
                                        <p className="text-xs font-mono text-muted-foreground/60 flex items-center gap-2">
                                            ID: {selectedStrategy.strategy_id} <ExternalLink className="h-3 w-3" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="h-8 px-3 shadow-lg shadow-destructive/20"
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    Delete Strategy
                                </Button>
                                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    {selectedStrategy.type}
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-10 max-w-4xl mx-auto space-y-8">
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Shield className="h-3 w-3" /> Webhook Configuration
                                        </h3>
                                        <Button 
                                            onClick={handleUpdate} 
                                            disabled={isUpdating}
                                            className="h-9 shadow-lg shadow-primary/20"
                                        >
                                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Changes"}
                                        </Button>
                                    </div>

                                    <div className="glass rounded-2xl p-8 space-y-6 border border-border/50">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Strategy Name</Label>
                                            <Input
                                                value={updateForm.name}
                                                onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
                                                className="bg-background max-w-md"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-muted-foreground" /> Endpoint URL
                                            </Label>
                                            <Input
                                                value={updateForm.url}
                                                onChange={(e) => setUpdateForm({ ...updateForm, url: e.target.value })}
                                                className="bg-background font-mono text-sm"
                                            />
                                            <p className="text-[10px] text-muted-foreground">The worker will send a POST request with call details to this URL.</p>
                                        </div>

                                        <div className="h-px w-full bg-border/50" />

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Code className="h-4 w-4 text-muted-foreground" /> Custom Headers (JSON)
                                            </Label>
                                            <Textarea
                                                value={updateForm.headersStr}
                                                onChange={(e) => setUpdateForm({ ...updateForm, headersStr: e.target.value })}
                                                className="bg-background font-mono text-sm h-48 resize-none"
                                            />
                                            <p className="text-[10px] text-yellow-600 bg-yellow-500/10 p-2 rounded border border-yellow-500/20 inline-block mt-2">
                                                Note: For security, existing sensitive keys (like Authorization) are masked as **** when fetched from the server.
                                                If you need to change them, re-enter the full JSON object.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </div>
    );
}