import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Phone, Plus, Loader2, Trash2, ExternalLink, Shield, Globe, Hash, Info, User, Lock, MapPin, ArrowLeft, Webhook } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { MasterDetailShell } from "@/components/common/MasterDetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { toastError } from "@/lib/toastError";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callCreateOutboundTrunkEndpoint,
  callDeleteTrunkEndpoint,
  callGetTrunkDetailsEndpoint,
  callListTrunksEndpoint,
  condenseListTrunksResponse,
  condenseTrunkDetailsResponse,
} from "@/services/sip/sipService";
import { TrunkConfigSummary, TrunkDetail, TrunkItem } from "@/types/sip";
import { JsonSample } from "@/components/common/JsonSample";
import { PASSTHROUGH_WEBHOOK_SAMPLE } from "@/lib/webhookSamples";

/** Shown next to the URL in the create modal and again on a saved trunk. */
const PassthroughWebhookSample = () => (
    <JsonSample
        title="See what we POST to this URL"
        value={PASSTHROUGH_WEBHOOK_SAMPLE}
        note="Fires when the call ends, on every outcome including busy, no_answer and timeout. No assistant runs on a passthrough call, so assistant_id is null, transcripts is empty and there is no usage block."
    />
);

/** Numbers the API returned for a trunk: Twilio lists `numbers`, Exotel carries one `exotel_number`. */
const trunkNumbers = (trunk: { trunk_config?: TrunkConfigSummary }): string[] =>
    trunk.trunk_config?.numbers?.length
        ? trunk.trunk_config.numbers
        : trunk.trunk_config?.exotel_number
            ? [trunk.trunk_config.exotel_number]
            : [];

export default function PhoneNumberPage() {
    const user = getStoredUser();
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    const [trunks, setTrunks] = useState<TrunkItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [selectedTrunk, setSelectedTrunk] = useState<TrunkDetail | null>(null);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal state
    const [activeTab, setActiveTab] = useState<"twilio" | "exotel">("twilio");
    const [isCreating, setIsCreating] = useState(false);
    const [modalForm, setModalForm] = useState({
        trunk_name: "",
        address: "",
        numbers: "",
        username: "",
        password: "",
        exotel_number: "",
        passthrough_mode: false,
        passthrough_webhook_url: ""
    });
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchList = useCallback(async () => {
        if (!user?.api_key) {
            setListLoading(false);
            return;
        }
        setListLoading(true);
        try {
            const { ok, json } = await callListTrunksEndpoint();
            if (ok) {
                const data = condenseListTrunksResponse(json);
                setTrunks(data);
                // Auto-open the add modal only when there are no existing trunks
                if (data.length === 0) {
                    setIsModalOpen(true);
                }
            } else {
                toast(toastError(json, "Failed to load phone lines"));
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Failed to load phone lines" });
        } finally {
            setListLoading(false);
        }
    }, [user?.api_key, toast]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Handle ?new=true param (kept for backward compatibility, e.g. direct links)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('new') === 'true') {
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    // Accept 'any' temporarily or strict type but extracting safely
    const handleSelectTrunk = async (trunk: any) => {
        if (!user?.api_key) return;

        setSelectedTrunk(null);
        setDetailLoading(true);

        // SAFELY EXTRACT THE ID:
        const trunkId = trunk.trunk_id || trunk._id || trunk.external_trunk_id;

        if (!trunkId) {
             toast({ variant: "destructive", title: "Error", description: "Could not find ID for this trunk." });
             setDetailLoading(false);
             return;
        }

        try {
            const json = await callGetTrunkDetailsEndpoint({ trunkId });
            setSelectedTrunk(condenseTrunkDetailsResponse(json) as TrunkDetail);
            setMobileDetailOpen(true);
            
        } catch (error) {
            console.warn("Falling back to local list data for details", error);
            // Fallback: created a partial detail object from the list item
            setSelectedTrunk({
                _id: trunk._id || trunk.trunk_id,
                external_trunk_id: trunk.external_trunk_id || trunk.trunk_id,
                trunk_name: trunk.trunk_name,
                trunk_type: trunk.trunk_type,
                trunk_config: trunk.trunk_config || {},
                passthrough_mode: trunk.passthrough_mode ?? false,
                passthrough_webhook_url: trunk.passthrough_webhook_url,
                createdAt: trunk.trunk_created_at || trunk.createdAt,
                updatedAt: trunk.trunk_created_at || trunk.updatedAt,
            });
            setMobileDetailOpen(true);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCreateTrunk = async () => {
        if (!user?.api_key) {
            toast({ variant: "destructive", title: "Auth Error", description: "User ID not found" });
            return;
        }

        if (!modalForm.trunk_name) {
            toast({ variant: "destructive", title: "Validation Error", description: "Line nickname is required" });
            return;
        }

        setIsCreating(true);
        try {
            const trunk_config: any = {};
            if (activeTab === "twilio") {
                if (!modalForm.address || !modalForm.numbers || !modalForm.username || !modalForm.password) {
                    toast({ variant: "destructive", title: "Validation Error", description: "All Twilio fields are required" });
                    setIsCreating(false);
                    return;
                }
                trunk_config.address = modalForm.address;
                trunk_config.numbers = modalForm.numbers.split(",").map(n => n.trim()).filter(n => n);
                trunk_config.username = modalForm.username;
                trunk_config.password = modalForm.password;
            } else {
                if (!modalForm.exotel_number) {
                    toast({ variant: "destructive", title: "Validation Error", description: "Exotel number is required" });
                    setIsCreating(false);
                    return;
                }
                trunk_config.exotel_number = modalForm.exotel_number;
            }

            const payload: any = {
                trunk_name: modalForm.trunk_name,
                trunk_type: activeTab,
                trunk_config,
                passthrough_mode: modalForm.passthrough_mode,
            };
            if (modalForm.passthrough_mode && modalForm.passthrough_webhook_url) {
                payload.passthrough_webhook_url = modalForm.passthrough_webhook_url;
            }

            const { ok, json } = await callCreateOutboundTrunkEndpoint(payload);

            if (ok) {
                toast({ title: "Success", description: "Outbound trunk created successfully" });
                setIsModalOpen(false);
                setModalForm({
                    trunk_name: "",
                    address: "",
                    numbers: "",
                    username: "",
                    password: "",
                    exotel_number: "",
                    passthrough_mode: false,
                    passthrough_webhook_url: ""
                });
                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: (json as { error?: string })?.error || "Failed to connect line" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTrunk = async () => {
        if (!selectedTrunk || !user?.api_key) return;

        if (!window.confirm("Are you sure you want to remove this phone line?")) return;

        setIsDeleting(true);
        try {
            const { ok, json } = await callDeleteTrunkEndpoint({ trunkId: selectedTrunk._id });

            if (ok) {
                toast({ title: "Removed", description: "Phone line removed successfully" });
                setSelectedTrunk(null);
                setMobileDetailOpen(false);
                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: (json as { error?: string })?.error || "Failed to remove line" });
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
            collapseKey="phone-numbers"
            detailClassName="bg-background overflow-hidden"
            list={
            <>
                <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-foreground">Phone Numbers</span>
                    </div>

                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="h-8 px-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-4xl p-0 h-[min(500px,90vh)] flex overflow-hidden border-none shadow-2xl rounded-xl">
                            {/* Modal Left Sidebar */}
                            <div className="hidden sm:flex w-48 bg-muted/30 border-r border-border flex-col">
                                <div className="p-6 border-b border-border">
                                    <DialogTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Provider</DialogTitle>
                                </div>
                                <div className="flex-1 p-3 space-y-2">
                                    <button
                                        onClick={() => setActiveTab("twilio")}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200",
                                            activeTab === "twilio"
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                        )}
                                    >
                                        <Globe className="h-4 w-4" />
                                        Twilio
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("exotel")}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200",
                                            activeTab === "exotel"
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                        )}
                                    >
                                        <Phone className="h-4 w-4" />
                                        Exotel
                                    </button>
                                </div>
                            </div>

                            {/* Modal Right Side Form */}
                            <div className="flex-1 flex flex-col bg-background">
                                <DialogHeader className="p-6 border-b border-border bg-card/10 backdrop-blur-sm">
                                    <DialogTitle className="text-xl">Connect {activeTab === 'twilio' ? 'Twilio' : 'Exotel'}</DialogTitle>
                                    <p className="text-xs text-muted-foreground mt-1 font-normal">
                                        A phone line connects INTVOICEKIT to {activeTab === 'twilio' ? 'Twilio' : 'Exotel'} so your assistants can call and receive calls. Copy the values below from your provider's dashboard.
                                    </p>
                                </DialogHeader>

                                <ScrollArea className="flex-1 p-4 sm:p-8">
                                    <div className="space-y-6 max-w-lg mx-auto">
                                        <div className="space-y-2">
                                            <Label htmlFor="trunk_name" className="text-sm font-medium">Line nickname</Label>
                                            <Input
                                                id="trunk_name"
                                                value={modalForm.trunk_name}
                                                onChange={(e) => setModalForm({ ...modalForm, trunk_name: e.target.value })}
                                                placeholder="e.g. Twilio Production"
                                                className="bg-muted/30 border-border/50 focus:border-primary"
                                            />
                                            <p className="text-xs text-muted-foreground">A name only you see, so you can tell lines apart.</p>
                                        </div>

                                        {activeTab === "twilio" ? (
                                            <div className="space-y-6 animate-in fade-in duration-200">
                                                <div className="space-y-2">
                                                    <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-primary" /> Twilio address
                                                    </Label>
                                                    <Input
                                                        id="address"
                                                        value={modalForm.address}
                                                        onChange={(e) => setModalForm({ ...modalForm, address: e.target.value })}
                                                        placeholder="example.pstn.twilio.com"
                                                        className="bg-muted/30 border-border/50"
                                                    />
                                                    <p className="text-xs text-muted-foreground">Find it in the Twilio dashboard under Elastic SIP Trunking → Termination.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="numbers" className="text-sm font-medium flex items-center gap-2">
                                                        <Hash className="h-4 w-4 text-primary" /> Phone numbers
                                                    </Label>
                                                    <Input
                                                        id="numbers"
                                                        value={modalForm.numbers}
                                                        onChange={(e) => setModalForm({ ...modalForm, numbers: e.target.value })}
                                                        placeholder="+15550100000, +15550100001"
                                                        className="bg-muted/30 border-border/50"
                                                    />
                                                    <p className="text-xs text-muted-foreground">The numbers on this line, separated by commas.</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                                                            <User className="h-4 w-4 text-primary" /> Twilio Account SID
                                                        </Label>
                                                        <Input
                                                            id="username"
                                                            autoComplete="off"
                                                            value={modalForm.username}
                                                            onChange={(e) => setModalForm({ ...modalForm, username: e.target.value })}
                                                            placeholder="Account SID"
                                                            className="bg-muted/30 border-border/50 font-mono text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                                                            <Lock className="h-4 w-4 text-primary" /> Twilio Auth Token
                                                        </Label>
                                                        <Input
                                                            id="password"
                                                            type="password"
                                                            autoComplete="new-password"
                                                            value={modalForm.password}
                                                            onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                                                            placeholder="Auth Token"
                                                            className="bg-muted/30 border-border/50 font-mono text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 animate-in fade-in duration-200">
                                                <Label htmlFor="exotel_number" className="text-sm font-medium flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-primary" /> Exotel number
                                                </Label>
                                                <Input
                                                    id="exotel_number"
                                                    value={modalForm.exotel_number}
                                                    onChange={(e) => setModalForm({ ...modalForm, exotel_number: e.target.value })}
                                                    placeholder="+918044319240"
                                                    className="bg-muted/30 border-border/50"
                                                />
                                                <p className="text-xs text-muted-foreground">Your Exotel virtual number, exactly as shown in Exotel.</p>
                                            </div>
                                        )}
                                        {/* Passthrough Mode */}
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <Webhook className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">Human agent calls, no assistant</p>
                                                        <p className="text-xs text-muted-foreground">A person in the browser talks to the phone caller directly. No assistant, no transcript. Cannot be changed after the trunk is created, and the trunk can then only place passthrough calls.</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={modalForm.passthrough_mode}
                                                    onCheckedChange={(checked) => setModalForm({ ...modalForm, passthrough_mode: checked, passthrough_webhook_url: checked ? modalForm.passthrough_webhook_url : "" })}
                                                />
                                            </div>

                                            {modalForm.passthrough_mode && (
                                                <div className="space-y-2 animate-in fade-in duration-200">
                                                    <Label htmlFor="passthrough_webhook_url" className="text-sm font-medium flex items-center gap-2">
                                                        <Webhook className="h-4 w-4 text-primary" /> End-of-call notification URL
                                                    </Label>
                                                    <Input
                                                        id="passthrough_webhook_url"
                                                        value={modalForm.passthrough_webhook_url}
                                                        onChange={(e) => setModalForm({ ...modalForm, passthrough_webhook_url: e.target.value })}
                                                        placeholder="https://your-server.com/webhook"
                                                        className="bg-muted/30 border-border/50 focus:border-primary font-mono text-xs"
                                                    />
                                                    <p className="text-xs text-muted-foreground">We POST a call summary here once the call ends. Calls themselves are not sent to this address.</p>
                                                    <PassthroughWebhookSample />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>

                                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateTrunk} disabled={isCreating} className="min-w-[120px]">
                                        {isCreating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Connect line"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                        {listLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                <span className="text-xs text-muted-foreground animate-pulse">Loading phone lines...</span>
                            </div>
                        ) : trunks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Phone className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-sm font-medium mb-1">No phone numbers</h3>
                                <p className="text-xs text-muted-foreground max-w-[180px]">
                                    Connect your first Twilio or Exotel line to get started.
                                </p>
                            </div>
                        ) : (
                            trunks.map((item) => {
                                // Extract consistent ID for UI matching
                                const itemId = item.trunk_id || item._id || item.external_trunk_id;
                                
                                return (
                                    <div
                                        key={itemId}
                                        onClick={() => handleSelectTrunk(item)}
                                        className={cn(
                                            "group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors duration-200 border",
                                            (selectedTrunk?.external_trunk_id === itemId || selectedTrunk?._id === itemId)
                                                ? "bg-primary/10 border-primary/30"
                                                : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                            (selectedTrunk?.external_trunk_id === itemId || selectedTrunk?._id === itemId)
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={cn(
                                                "text-sm font-semibold truncate",
                                                (selectedTrunk?.external_trunk_id === itemId || selectedTrunk?._id === itemId) ? "text-primary" : "text-foreground"
                                            )}>
                                                {item.trunk_name}
                                            </h4>
                                            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground/60 mt-1">
                                                {item.trunk_type}
                                            </p>
                                        </div>
                                        {(selectedTrunk?.external_trunk_id === itemId || selectedTrunk?._id === itemId) && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </>
            }
            detail={
            <>
                {!selectedTrunk ? (
                    detailLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8 relative z-10">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm font-medium animate-pulse">Loading details...</p>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Phone}
                            title="Pick a phone setup to see it"
                            description="Each entry connects Twilio or Exotel numbers so people can call your assistants. Select one on the left, or add a new one."
                        />
                    )
                ) : (
                    <div key={selectedTrunk._id} className="flex-1 flex flex-col h-full overflow-hidden z-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header */}
                        <div className="p-4 md:p-8 border-b border-border bg-card/10 backdrop-blur-xl flex flex-wrap items-end justify-between gap-4">
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
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <Phone className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight">{selectedTrunk.trunk_name}</h2>
                                        <p className="text-xs font-mono text-muted-foreground/60 flex items-center gap-2">
                                            ID: {selectedTrunk.external_trunk_id || selectedTrunk._id} <ExternalLink className="h-3 w-3" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                                <div className="flex gap-2">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDeleteTrunk}
                                        disabled={isDeleting}
                                        className="h-8 px-3 shadow-lg shadow-destructive/20"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete
                                    </Button>
                                </div>
                                <div className={cn(
                                    "status-chip self-start md:self-end",
                                    selectedTrunk.trunk_type === "twilio"
                                        ? "status-chip-info"
                                        : "status-chip-neutral"
                                )}>
                                    {selectedTrunk.trunk_type}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Updated {selectedTrunk.updatedAt ? new Date(selectedTrunk.updatedAt).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 md:p-10 max-w-5xl mx-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                    {/* Left Column: Basic Info */}
                                    <div className="lg:col-span-1 space-y-8">
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Info className="h-3 w-3" /> Information
                                            </h3>
                                            <div className="glass rounded-lg p-6 space-y-6">
                                                <div className="space-y-1">
                                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Provider</Label>
                                                    <p className="text-sm font-semibold capitalize">{selectedTrunk.trunk_type}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Created On</Label>
                                                    <p className="text-sm font-semibold">
                                                        {selectedTrunk.createdAt ? new Date(selectedTrunk.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Unknown'}
                                                    </p>
                                                </div>
                                                {selectedTrunk.trunk_config?.address && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs uppercase font-bold text-muted-foreground">SIP Address</Label>
                                                        <p className="text-sm font-mono break-all">{selectedTrunk.trunk_config.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Configuration */}
                                    <div className="lg:col-span-2 space-y-8">

                                        {/* Passthrough Section */}
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Webhook className="h-3 w-3" /> Passthrough
                                            </h3>
                                            <div className="glass rounded-lg p-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold">Passthrough Mode</p>
                                                        <p className="text-xs text-muted-foreground">A person in the browser talks to the phone caller directly, with no assistant</p>
                                                    </div>
                                                    <div className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-bold border",
                                                        selectedTrunk.passthrough_mode
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                            : "bg-muted/50 text-muted-foreground border-border/50"
                                                    )}>
                                                        {selectedTrunk.passthrough_mode ? "Enabled" : "Disabled"}
                                                    </div>
                                                </div>
                                                {selectedTrunk.passthrough_mode && selectedTrunk.passthrough_webhook_url && (
                                                    <div className="space-y-1 pt-2 border-t border-border/50">
                                                        <Label className="text-xs uppercase font-bold text-muted-foreground">End-of-call notification URL</Label>
                                                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                                            <p className="text-xs font-mono break-all text-primary">{selectedTrunk.passthrough_webhook_url}</p>
                                                        </div>
                                                        <PassthroughWebhookSample />
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Shield className="h-3 w-3" /> Configuration
                                            </h3>
                                            <div className="glass rounded-lg p-6 space-y-4">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                                    <Hash className="h-3 w-3" /> {selectedTrunk.trunk_type === "exotel" ? "Exotel number" : "Registered numbers"}
                                                </Label>
                                                {trunkNumbers(selectedTrunk).length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {trunkNumbers(selectedTrunk).map((n) => (
                                                            <div key={n} className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-mono">
                                                                <Phone className="h-3 w-3" /> {n}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        Numbers aren't shown for this trunk yet. Credentials are never shown here.
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </>
            }
        />
    );
}
