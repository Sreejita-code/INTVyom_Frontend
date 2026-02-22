import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Phone, Plus, Loader2, Save, Trash2, ExternalLink, Shield, Globe, Hash, Info, User, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const API_BASE = "http://localhost:3000/api/sip";

interface TrunkItem {
    trunk_id: string;
    trunk_name: string;
    trunk_type: "twilio" | "exotel";
    trunk_created_at: string;
}

interface TrunkDetail {
    _id: string;
    user_id: string;
    external_trunk_id: string;
    trunk_name: string;
    trunk_type: "twilio" | "exotel";
    trunk_config: {
        address?: string;
        numbers?: string[];
        username?: string;
        password?: string;
        exotel_number?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export default function PhoneNumberPage() {
    const user = getStoredUser();
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    const [trunks, setTrunks] = useState<TrunkItem[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [selectedTrunk, setSelectedTrunk] = useState<TrunkDetail | null>(null);
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
        exotel_number: ""
    });
    const [isDeleting, setIsDeleting] = useState(false);

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
                setTrunks(Array.isArray(json.data) ? json.data : []);
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Failed to load SIP trunks" });
        } finally {
            setListLoading(false);
        }
    }, [user?.user_id, toast]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Handle ?new=true param
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('new') === 'true') {
            setIsModalOpen(true);
            // Clean up URL to avoid re-opening on refresh
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    const handleSelectTrunk = async (trunk: TrunkItem) => {
        if (!user?.user_id) return;

        setSelectedTrunk(null);
        setDetailLoading(true);

        try {
            // Trying to fetch details. If it fails, we use the basic info we have.
            const res = await fetch(`${API_BASE}/details/${trunk.trunk_id}?user_id=${user.user_id}`);
            const json = await res.json();
            if (res.ok) {
                setSelectedTrunk(json.trunk || json.data);
            } else {
                // Fallback: created a partial detail object from the list item
                setSelectedTrunk({
                    _id: trunk.trunk_id,
                    user_id: user.user_id,
                    external_trunk_id: trunk.trunk_id,
                    trunk_name: trunk.trunk_name,
                    trunk_type: trunk.trunk_type,
                    trunk_config: {}, // Config usually hidden in list
                    createdAt: trunk.trunk_created_at,
                    updatedAt: trunk.trunk_created_at,
                });
            }
        } catch (error) {
            console.error(error);
            // Fallback
            setSelectedTrunk({
                _id: trunk.trunk_id,
                user_id: user.user_id,
                external_trunk_id: trunk.trunk_id,
                trunk_name: trunk.trunk_name,
                trunk_type: trunk.trunk_type,
                trunk_config: {},
                createdAt: trunk.trunk_created_at,
                updatedAt: trunk.trunk_created_at,
            });
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCreateTrunk = async () => {
        if (!user?.user_id) {
            toast({ variant: "destructive", title: "Auth Error", description: "User ID not found" });
            return;
        }

        if (!modalForm.trunk_name) {
            toast({ variant: "destructive", title: "Validation Error", description: "Trunk name is required" });
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

            const payload = {
                user_id: user.user_id,
                trunk_name: modalForm.trunk_name,
                trunk_type: activeTab,
                trunk_config
            };

            const res = await fetch(`${API_BASE}/create-outbound-trunk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Outbound trunk created successfully" });
                setIsModalOpen(false);
                setModalForm({
                    trunk_name: "",
                    address: "",
                    numbers: "",
                    username: "",
                    password: "",
                    exotel_number: ""
                });
                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to create trunk" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTrunk = async () => {
        if (!selectedTrunk || !user?.user_id) return;

        if (!window.confirm("Are you sure you want to delete this SIP trunk?")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_BASE}/delete/${selectedTrunk._id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.user_id })
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "SIP trunk deleted successfully" });
                setSelectedTrunk(null);
                await fetchList();
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to delete trunk" });
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
            <div className="w-80 border-r border-border flex flex-col bg-card/30">
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
                        <DialogContent className="max-w-4xl p-0 h-[500px] flex overflow-hidden border-none shadow-2xl rounded-xl">
                            {/* Modal Left Sidebar */}
                            <div className="w-48 bg-muted/30 border-r border-border flex flex-col">
                                <div className="p-6 border-b border-border">
                                    <DialogTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Provider</DialogTitle>
                                </div>
                                <div className="flex-1 p-3 space-y-2">
                                    <button
                                        onClick={() => setActiveTab("twilio")}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
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
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
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
                                    <DialogTitle className="text-xl">Configure {activeTab === 'twilio' ? 'Twilio' : 'Exotel'} Trunk</DialogTitle>
                                </DialogHeader>

                                <ScrollArea className="flex-1 p-8">
                                    <div className="space-y-6 max-w-md mx-auto">
                                        <div className="space-y-2">
                                            <Label htmlFor="trunk_name" className="text-sm font-medium">Trunk Name</Label>
                                            <Input
                                                id="trunk_name"
                                                value={modalForm.trunk_name}
                                                onChange={(e) => setModalForm({ ...modalForm, trunk_name: e.target.value })}
                                                placeholder="e.g. Twilio Production"
                                                className="bg-muted/30 border-border/50 focus:border-primary"
                                            />
                                        </div>

                                        {activeTab === "twilio" ? (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="space-y-2">
                                                    <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-primary" /> Address
                                                    </Label>
                                                    <Input
                                                        id="address"
                                                        value={modalForm.address}
                                                        onChange={(e) => setModalForm({ ...modalForm, address: e.target.value })}
                                                        placeholder="example.pstn.twilio.com"
                                                        className="bg-muted/30 border-border/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="numbers" className="text-sm font-medium flex items-center gap-2">
                                                        <Hash className="h-4 w-4 text-primary" /> Numbers (comma separated)
                                                    </Label>
                                                    <Input
                                                        id="numbers"
                                                        value={modalForm.numbers}
                                                        onChange={(e) => setModalForm({ ...modalForm, numbers: e.target.value })}
                                                        placeholder="+15550100000, +15550100001"
                                                        className="bg-muted/30 border-border/50"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                                                            <User className="h-4 w-4 text-primary" /> Username
                                                        </Label>
                                                        <Input
                                                            id="username"
                                                            value={modalForm.username}
                                                            onChange={(e) => setModalForm({ ...modalForm, username: e.target.value })}
                                                            placeholder="Account SID"
                                                            className="bg-muted/30 border-border/50 font-mono text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                                                            <Lock className="h-4 w-4 text-primary" /> Password
                                                        </Label>
                                                        <Input
                                                            id="password"
                                                            type="password"
                                                            value={modalForm.password}
                                                            onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                                                            placeholder="Auth Token"
                                                            className="bg-muted/30 border-border/50 font-mono text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <Label htmlFor="exotel_number" className="text-sm font-medium flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-primary" /> Exotel Number
                                                </Label>
                                                <Input
                                                    id="exotel_number"
                                                    value={modalForm.exotel_number}
                                                    onChange={(e) => setModalForm({ ...modalForm, exotel_number: e.target.value })}
                                                    placeholder="+918044319240"
                                                    className="bg-muted/30 border-border/50"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateTrunk} disabled={isCreating} className="min-w-[120px]">
                                        {isCreating ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Create Trunk"
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
                                <span className="text-xs text-muted-foreground animate-pulse">Fetching trunks...</span>
                            </div>
                        ) : trunks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Phone className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-sm font-medium mb-1">No phone numbers</h3>
                                <p className="text-xs text-muted-foreground max-w-[180px]">
                                    Add your first Twilio or Exotel trunk to get started.
                                </p>
                            </div>
                        ) : (
                            trunks.map((item) => (
                                <div
                                    key={item.trunk_id}
                                    onClick={() => handleSelectTrunk(item)}
                                    className={cn(
                                        "group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                                        selectedTrunk?.external_trunk_id === item.trunk_id
                                            ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]"
                                            : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                        selectedTrunk?.external_trunk_id === item.trunk_id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    )}>
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={cn(
                                            "text-sm font-semibold truncate",
                                            selectedTrunk?.external_trunk_id === item.trunk_id ? "text-primary" : "text-foreground"
                                        )}>
                                            {item.trunk_name}
                                        </h4>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mt-0.5">
                                            {item.trunk_type}
                                        </p>
                                    </div>
                                    {selectedTrunk?.external_trunk_id === item.trunk_id && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Panel Details */}
            <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_0%,transparent_50%)]" />
                </div>

                {!selectedTrunk ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 relative z-10">
                        {detailLoading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-sm font-medium animate-pulse">Loading details...</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                                <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                                    <Phone className="h-10 w-10 text-primary/30" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Trunk Details</h2>
                                <p className="max-w-xs text-center text-sm text-muted-foreground leading-relaxed">
                                    Select a phone number trunk from the sidebar to view its configuration and status.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden z-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-border bg-card/10 backdrop-blur-xl flex items-end justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <Phone className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight">{selectedTrunk.trunk_name}</h2>
                                        <p className="text-xs font-mono text-muted-foreground/60 flex items-center gap-2">
                                            ID: {selectedTrunk.external_trunk_id} <ExternalLink className="h-3 w-3" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
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
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                    selectedTrunk.trunk_type === "twilio"
                                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}>
                                    {selectedTrunk.trunk_type}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Updated {new Date(selectedTrunk.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-10 max-w-5xl mx-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                    {/* Left Column: Basic Info */}
                                    <div className="lg:col-span-1 space-y-8">
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Info className="h-3 w-3" /> Information
                                            </h3>
                                            <div className="glass rounded-2xl p-6 space-y-6">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Provider</Label>
                                                    <p className="text-sm font-semibold capitalize">{selectedTrunk.trunk_type}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Created On</Label>
                                                    <p className="text-sm font-semibold">{new Date(selectedTrunk.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                                </div>
                                                {selectedTrunk.trunk_type === "twilio" && (
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">SIP Address</Label>
                                                        <p className="text-sm font-mono break-all">{selectedTrunk.trunk_config.address || 'N/A'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Configuration */}
                                    <div className="lg:col-span-2 space-y-8">
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Shield className="h-3 w-3" /> Configuration
                                            </h3>
                                            <div className="glass rounded-2xl p-8 space-y-8">
                                                {selectedTrunk.trunk_type === "twilio" ? (
                                                    <>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                                                    <User className="h-3 w-3" /> Account SID
                                                                </Label>
                                                                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                                                    <p className="text-sm font-mono truncate">{selectedTrunk.trunk_config.username || 'Not set'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                                                    <Lock className="h-3 w-3" /> Auth Token
                                                                </Label>
                                                                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex items-center justify-between">
                                                                    <p className="text-sm font-mono">••••••••••••••••</p>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                                                        <Info className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                                                <Hash className="h-3 w-3" /> Registered Numbers
                                                            </Label>
                                                            <div className="flex flex-wrap gap-3">
                                                                {selectedTrunk.trunk_config.numbers && selectedTrunk.trunk_config.numbers.length > 0 ? (
                                                                    selectedTrunk.trunk_config.numbers.map(n => (
                                                                        <div key={n} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold">
                                                                            <Phone className="h-3 w-3" /> {n}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-sm text-muted-foreground italic">No numbers registered</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Exotel Number</Label>
                                                        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                                <Phone className="h-6 w-6" />
                                                            </div>
                                                            <p className="text-2xl font-black tracking-tight">{selectedTrunk.trunk_config.exotel_number || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </div>
    );
}
