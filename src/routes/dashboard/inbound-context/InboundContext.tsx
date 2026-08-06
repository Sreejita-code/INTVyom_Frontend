import { useEffect, useState, useCallback, useMemo } from "react";
import { Webhook, Plus, Loader2, Trash2, ExternalLink, Globe, Shield, Activity, Search, Timer, ArrowLeft, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { MasterDetailShell } from "@/components/common/MasterDetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callCreateStrategyEndpoint,
  callDeleteStrategyEndpoint,
  callListStrategiesEndpoint,
  callUpdateStrategyEndpoint,
  condenseListStrategiesResponse,
} from "@/services/inboundContext/inboundContextService";
import { StrategyItem } from "@/types/inboundContext";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/toastError";
import { HeaderEditor } from "./HeaderEditor";
import { HeaderRow, buildConfigPatch, buildHeaderPatch, rowsFromHeaders } from "./headerDiff";
import { isInsecureUrl, validateTimeoutSeconds, validateWebhookUrl } from "./strategyValidation";

const DEFAULT_TIMEOUT = "2";

const formatTimestamp = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export default function InboundContextPage() {
    const user = getStoredUser();
    const { toast } = useToast();

    const [strategies, setStrategies] = useState<StrategyItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [selectedStrategy, setSelectedStrategy] = useState<StrategyItem | null>(null);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
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
        timeoutSeconds: DEFAULT_TIMEOUT,
    });
    const [modalHeaderRows, setModalHeaderRows] = useState<HeaderRow[]>([]);

    // Update Form States
    const [updateForm, setUpdateForm] = useState({
        name: "",
        url: "",
        timeoutSeconds: DEFAULT_TIMEOUT,
    });
    const [updateHeaderRows, setUpdateHeaderRows] = useState<HeaderRow[]>([]);

    // FIX: Removed internal selectedStrategy logic and dependencies to completely stop the infinite loop
    const fetchList = useCallback(async () => {
        if (!user?.user_id) {
            setListLoading(false);
            return [] as StrategyItem[];
        }
        setListLoading(true);
        try {
            const json = await callListStrategiesEndpoint(user.user_id);
            const list = condenseListStrategiesResponse(json);
            setStrategies(list);
            return list;
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Failed to load strategies" });
            return [] as StrategyItem[];
        } finally {
            setListLoading(false);
        }
    }, [user?.user_id, toast]); // <-- Safely removed selectedStrategy

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const hydrateForm = useCallback((strategy: StrategyItem) => {
        setUpdateForm({
            name: strategy.name,
            url: strategy.strategy_config?.url || "",
            timeoutSeconds: String(strategy.strategy_config?.timeout_seconds ?? DEFAULT_TIMEOUT),
        });
        setUpdateHeaderRows(rowsFromHeaders(strategy.strategy_config?.headers));
    }, []);

    const handleSelectStrategy = (strategy: StrategyItem) => {
        setSelectedStrategy(strategy);
        setMobileDetailOpen(true);
        hydrateForm(strategy);
    };

    const filteredStrategies = useMemo(() => {
        if (!searchQuery.trim()) return strategies;
        const lowerQ = searchQuery.toLowerCase();
        return strategies.filter(s =>
            s.name.toLowerCase().includes(lowerQ) ||
            (s.strategy_config?.url || "").toLowerCase().includes(lowerQ)
        );
    }, [strategies, searchQuery]);

    const handleCreate = async () => {
        if (!user?.user_id) return;
        if (!modalForm.name.trim()) {
            toast({ variant: "destructive", title: "Validation Error", description: "Strategy name is required" });
            return;
        }

        const urlCheck = validateWebhookUrl(modalForm.url);
        if (!urlCheck.ok) {
            toast({ variant: "destructive", title: "Invalid webhook URL", description: urlCheck.message });
            return;
        }

        const timeoutCheck = validateTimeoutSeconds(modalForm.timeoutSeconds);
        if (!timeoutCheck.ok) {
            toast({ variant: "destructive", title: "Invalid timeout", description: timeoutCheck.message });
            return;
        }

        const headers = buildHeaderPatch(modalHeaderRows);

        setIsCreating(true);
        try {
            const payload = {
                user_id: user.user_id,
                name: modalForm.name.trim(),
                type: "webhook",
                strategy_config: {
                    url: modalForm.url.trim(),
                    ...(headers && { headers }),
                    ...(modalForm.timeoutSeconds.trim() && { timeout_seconds: Number(modalForm.timeoutSeconds) }),
                }
            };

            const { ok, json } = await callCreateStrategyEndpoint(payload);
            if (ok) {
                toast({ title: "Success", description: "Strategy created successfully" });
                setIsModalOpen(false);
                setModalForm({ name: "", url: "", timeoutSeconds: DEFAULT_TIMEOUT });
                setModalHeaderRows([]);
                await fetchList();
            } else {
                toast(toastError(json, "Failed to create strategy"));
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
        if (!updateForm.name.trim()) {
            toast({ variant: "destructive", title: "Validation Error", description: "Strategy name is required" });
            return;
        }

        const urlCheck = validateWebhookUrl(updateForm.url);
        if (!urlCheck.ok) {
            toast({ variant: "destructive", title: "Invalid webhook URL", description: urlCheck.message });
            return;
        }

        const timeoutCheck = validateTimeoutSeconds(updateForm.timeoutSeconds);
        if (!timeoutCheck.ok) {
            toast({ variant: "destructive", title: "Invalid timeout", description: timeoutCheck.message });
            return;
        }

        // Only what changed. Headers merge key by key upstream, so an untouched secret must
        // not appear in the payload at all.
        const configPatch = buildConfigPatch({
            url: updateForm.url,
            originalUrl: selectedStrategy.strategy_config?.url || "",
            timeoutSeconds: updateForm.timeoutSeconds,
            originalTimeoutSeconds: selectedStrategy.strategy_config?.timeout_seconds,
            rows: updateHeaderRows,
        });
        const nameChanged = updateForm.name.trim() !== selectedStrategy.name;

        if (!nameChanged && !configPatch) {
            toast({ title: "Nothing to save", description: "No changes were made to this strategy" });
            return;
        }

        setIsUpdating(true);
        try {
            const payload = {
                user_id: user.user_id,
                ...(nameChanged && { name: updateForm.name.trim() }),
                ...(configPatch && { strategy_config: configPatch }),
            };

            const { ok, json } = await callUpdateStrategyEndpoint(selectedStrategy.strategy_id, payload);
            if (ok) {
                toast({ title: "Success", description: "Strategy updated successfully" });

                // Re-select from the refreshed list rather than merging locally: the server
                // masks secrets and merges headers, so only its copy is the truth.
                const list = await fetchList();
                const refreshed = list.find(s => s.strategy_id === selectedStrategy.strategy_id) || null;
                setSelectedStrategy(refreshed);
                if (refreshed) hydrateForm(refreshed);
            } else {
                toast(toastError(json, "Failed to update strategy"));
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

        setIsDeleting(true);
        try {
            const { ok, json } = await callDeleteStrategyEndpoint({
                userId: user.user_id,
                strategyId: selectedStrategy.strategy_id,
            });

            if (ok) {
                toast({ title: "Success", description: "Strategy deleted successfully" });
                setSelectedStrategy(null);
                setMobileDetailOpen(false);
                await fetchList();
            } else {
                toast(toastError(json, "Failed to delete"));
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <MasterDetailShell
            mobileDetailOpen={mobileDetailOpen}
            listClassName="lg:w-[350px]"
            detailClassName="bg-background overflow-hidden"
            list={
            <>
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
                            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-xl border-none shadow-2xl rounded-xl bg-background max-h-[90vh] overflow-y-auto">
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
                                        {isInsecureUrl(modalForm.url) && (
                                            <p className="status-text-warning text-[10px] flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                Plain http sends the caller's number and your headers in cleartext.
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Timer className="h-4 w-4 text-muted-foreground" /> Timeout (seconds)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0.5}
                                            max={10}
                                            step={0.1}
                                            value={modalForm.timeoutSeconds}
                                            onChange={(e) => setModalForm({ ...modalForm, timeoutSeconds: e.target.value })}
                                            className="bg-muted/30 max-w-[140px]"
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Blocks the start of the call — the caller hears silence for this long if your
                                            endpoint is slow. 0.5 to 10 seconds, default 2.
                                        </p>
                                    </div>

                                    <HeaderEditor rows={modalHeaderRows} onChange={setModalHeaderRows} />
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
            </>
            }
            detail={
            <>
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_0%,transparent_50%)]" />
                </div>

                {!selectedStrategy ? (
                    <EmptyState
                        icon={Webhook}
                        title="Inbound Context Strategies"
                        description="Select a strategy to manage webhook configurations for fetching caller data before an assistant connects. Attach one to a number on the Inbound page."
                        descriptionClassName="max-w-sm"
                    />
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden z-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header */}
                        <div className="p-4 md:p-8 border-b border-border bg-card/10 backdrop-blur-xl flex flex-wrap items-end justify-between gap-4 shrink-0">
                            <div className="space-y-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="lg:hidden -ml-2 text-muted-foreground"
                                    onClick={() => setMobileDetailOpen(false)}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Back
                                </Button>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <Webhook className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight">{selectedStrategy.name}</h2>
                                        <p className="text-xs font-mono text-muted-foreground/60 flex items-center gap-2">
                                            ID: {selectedStrategy.strategy_id} <ExternalLink className="h-3 w-3" />
                                        </p>
                                        {formatTimestamp(selectedStrategy.updated_at) && (
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                Updated {formatTimestamp(selectedStrategy.updated_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={isDeleting}
                                            className="h-8 px-3 shadow-lg shadow-destructive/20"
                                        >
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            Delete Strategy
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete "{selectedStrategy.name}"?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Every inbound number using this strategy is detached from it and keeps
                                                routing calls — just without caller-context lookup. Prompts render
                                                {" "}<span className="font-mono">{"{{context.*}}"}</span> as empty.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete}>Delete strategy</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <div className="status-chip status-chip-info">
                                    {selectedStrategy.type}
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 md:p-10 max-w-4xl mx-auto space-y-8">
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
                                            {isInsecureUrl(updateForm.url) && (
                                                <p className="status-text-warning text-[10px] flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Plain http sends the caller's number and your headers in cleartext.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Timer className="h-4 w-4 text-muted-foreground" /> Timeout (seconds)
                                            </Label>
                                            <Input
                                                type="number"
                                                min={0.5}
                                                max={10}
                                                step={0.1}
                                                value={updateForm.timeoutSeconds}
                                                onChange={(e) => setUpdateForm({ ...updateForm, timeoutSeconds: e.target.value })}
                                                className="bg-background max-w-[140px]"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Blocks the start of the call — the caller hears silence for this long if your
                                                endpoint is slow. 0.5 to 10 seconds, default 2.
                                            </p>
                                        </div>

                                        <div className="h-px w-full bg-border/50" />

                                        <HeaderEditor rows={updateHeaderRows} onChange={setUpdateHeaderRows} />
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </>
            }
        />
    );
}
