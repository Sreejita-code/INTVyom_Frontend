import { useEffect, useState, useCallback, useMemo } from "react";
import { PhoneIncoming, Plus, Loader2, Trash2, ExternalLink, Bot, Shield, Link2, Unlink, Search, Check, ChevronsUpDown } from "lucide-react";
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/inbound`;
const ASSISTANT_API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/assistant`;
const SIP_API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api/sip`;

interface InboundItem {
    inbound_id: string;
    phone_number: string;
    phone_number_normalized: string;
    assistant_id: string | null;
    assistant_name: string | null;
    service: string;
    created_at?: string;
    updated_at?: string;
}

interface AssistantItem {
    assistant_id: string;
    name: string;
}

interface ExotelNumber {
    trunk_id: string;
    number: string;
    name: string;
}

export default function InboundPage() {
    const user = getStoredUser();
    const { toast } = useToast();

    // Data States
    const [inbounds, setInbounds] = useState<InboundItem[]>([]);
    const [assistants, setAssistants] = useState<AssistantItem[]>([]);
    const [exotelNumbers, setExotelNumbers] = useState<ExotelNumber[]>([]);

    // UI States
    const [listLoading, setListLoading] = useState(true);
    const [selectedInbound, setSelectedInbound] = useState<InboundItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [numberSearchQuery, setNumberSearchQuery] = useState("");

    // Dropdown open states
    const [openPhoneDropdown, setOpenPhoneDropdown] = useState(false);
    const [openModalAssistantDropdown, setOpenModalAssistantDropdown] = useState(false);
    const [openMainAssistantDropdown, setOpenMainAssistantDropdown] = useState(false);

    // Form States
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDetaching, setIsDetaching] = useState(false);

    const [modalForm, setModalForm] = useState({
        phone_number: "",
        assistant_id: "none"
    });

    const [updateAssistantId, setUpdateAssistantId] = useState<string>("none");

    const fetchData = useCallback(async () => {
        if (!user?.user_id) return;

        try {
            // Fetch Assistants
            const astRes = await fetch(`${ASSISTANT_API_BASE}/list?user_id=${user.user_id}`);
            const astJson = await astRes.json();

            if (astRes.ok) {
                let rawAssistants: any[] = [];
                if (Array.isArray(astJson?.data?.assistants)) rawAssistants = astJson.data.assistants;
                else if (Array.isArray(astJson?.data)) rawAssistants = astJson.data;
                else if (Array.isArray(astJson?.assistants)) rawAssistants = astJson.assistants;
                else if (Array.isArray(astJson)) rawAssistants = astJson;

                const formattedAssistants = rawAssistants.map((ast: any) => ({
                    assistant_id: ast.assistant_id || ast.external_assistant_id || ast._id || ast.id,
                    name: ast.name || ast.assistant_name || "Unnamed Assistant"
                }));

                setAssistants(formattedAssistants);
            }

            // Fetch SIP Trunks (Filter for Exotel)
            const sipRes = await fetch(`${SIP_API_BASE}/list?user_id=${user.user_id}`);
            const sipJson = await sipRes.json();
            if (sipRes.ok) {
                const rawSips = Array.isArray(sipJson) ? sipJson : (Array.isArray(sipJson.data) ? sipJson.data : []);

                const exotel = rawSips
                    .filter((t: any) => t.trunk_type === 'exotel' && t.trunk_config?.exotel_number)
                    .map((t: any) => ({
                        trunk_id: t.external_trunk_id || t._id,
                        number: t.trunk_config.exotel_number,
                        name: t.trunk_name || "Exotel Trunk"
                    }));
                setExotelNumbers(exotel);
            }
        } catch (error) {
            console.error("Failed to fetch prerequisite data:", error);
        }
    }, [user?.user_id]);

    // FIX: Removed selectedInbound dependencies and added showLoading flag to prevent infinite loops
    const fetchList = async (showLoading = true) => {
        if (!user?.user_id) {
            setListLoading(false);
            return;
        }
        if (showLoading) setListLoading(true);
        try {
            const res = await fetch(`${API_BASE}/list?user_id=${user.user_id}`);
            const json = await res.json();
            if (res.ok) {
                const data = Array.isArray(json.data) ? json.data : [];
                setInbounds(data);
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Failed to load inbound mappings" });
        } finally {
            if (showLoading) setListLoading(false);
        }
    };

    // FIX: Ensure it only mounts on user load
    useEffect(() => {
        fetchData();
        fetchList(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.user_id]);

    const handleSelectInbound = (inbound: InboundItem) => {
        setSelectedInbound(inbound);
        setUpdateAssistantId(inbound.assistant_id || "none");
    };

    const filteredInbounds = useMemo(() => {
        if (!numberSearchQuery.trim()) return inbounds;
        const lowerQ = numberSearchQuery.toLowerCase();
        return inbounds.filter(i =>
            i.phone_number.toLowerCase().includes(lowerQ) ||
            (i.assistant_name && i.assistant_name.toLowerCase().includes(lowerQ))
        );
    }, [inbounds, numberSearchQuery]);

    const handleAssignInbound = async () => {
        if (!user?.user_id) return;
        if (!modalForm.phone_number) {
            toast({ variant: "destructive", title: "Validation Error", description: "Phone number is required" });
            return;
        }

        setIsCreating(true);
        try {
            const payload = {
                user_id: user.user_id,
                assistant_id: modalForm.assistant_id === "none" ? null : modalForm.assistant_id,
                service: "exotel",
                inbound_config: {
                    phone_number: modalForm.phone_number
                }
            };

            const res = await fetch(`${API_BASE}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Inbound number assigned successfully" });
                setIsModalOpen(false);
                setModalForm({ phone_number: "", assistant_id: "none" });
                await fetchList(false); // Fetch silently in background
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to assign number" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateMapping = async () => {
        if (!selectedInbound || !user?.user_id) return;
        setIsUpdating(true);

        try {
            const payload = {
                user_id: user.user_id,
                assistant_id: updateAssistantId === "none" ? null : updateAssistantId
            };

            const res = await fetch(`${API_BASE}/update/${selectedInbound.inbound_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Mapping updated successfully" });
                
                // Optimistic UI Update instantly reflects changes
                const attachedAssistant = assistants.find(a => a.assistant_id === updateAssistantId);
                setSelectedInbound(prev => prev ? {
                    ...prev,
                    assistant_id: updateAssistantId === "none" ? null : updateAssistantId,
                    assistant_name: attachedAssistant ? attachedAssistant.name : null
                } : null);

                await fetchList(false); // Fetch silently in background
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to update mapping" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDetachInbound = async () => {
        if (!selectedInbound || !user?.user_id) return;
        setIsDetaching(true);
        try {
            const res = await fetch(`${API_BASE}/detach/${selectedInbound.inbound_id}?user_id=${user.user_id}`, {
                method: "POST"
            });
            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Assistant detached successfully" });
                
                // Optimistic Update
                setSelectedInbound(prev => prev ? {
                    ...prev,
                    assistant_id: null,
                    assistant_name: null
                } : null);
                setUpdateAssistantId("none");

                await fetchList(false); // Fetch silently in background
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to detach" });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsDetaching(false);
        }
    };

    const handleDeleteInbound = async () => {
        if (!selectedInbound || !user?.user_id) return;
        if (!window.confirm("Are you sure you want to delete this inbound mapping entirely? This releases the number.")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_BASE}/delete/${selectedInbound.inbound_id}?user_id=${user.user_id}`, {
                method: "DELETE"
            });

            const json = await res.json();
            if (res.ok) {
                toast({ title: "Success", description: "Inbound mapping deleted successfully" });
                setSelectedInbound(null);
                await fetchList(false);
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
                            <PhoneIncoming className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-foreground">Inbound Routes</span>
                        </div>

                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-8 px-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Plus className="h-4 w-4 mr-1" /> Assign
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md border-none shadow-2xl rounded-xl bg-background">
                                <DialogHeader className="p-6 border-b border-border bg-card/10">
                                    <DialogTitle className="text-xl flex items-center gap-2">
                                        <Link2 className="h-5 w-5 text-primary" /> Assign Inbound Number
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="p-6 space-y-6">
                                    {/* Searchable Phone Number Dropdown */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Select Exotel Number</Label>
                                        <Popover open={openPhoneDropdown} onOpenChange={setOpenPhoneDropdown}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openPhoneDropdown}
                                                    className="w-full justify-between bg-muted/30 h-11"
                                                >
                                                    {modalForm.phone_number
                                                        ? exotelNumbers.find((n) => n.number === modalForm.phone_number)?.number || modalForm.phone_number
                                                        : "Search available numbers..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[380px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search phone numbers or trunk name..." />
                                                    <CommandList>
                                                        <CommandEmpty>No Exotel numbers found. Please create a trunk first.</CommandEmpty>
                                                        <CommandGroup>
                                                            {exotelNumbers.map((num) => (
                                                                <CommandItem
                                                                    key={num.number}
                                                                    value={`${num.number} ${num.name}`} // Allows searching by number OR trunk name
                                                                    onSelect={() => {
                                                                        setModalForm({ ...modalForm, phone_number: num.number });
                                                                        setOpenPhoneDropdown(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", modalForm.phone_number === num.number ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex flex-col">
                                                                        <span>{num.number}</span>
                                                                        <span className="text-[10px] text-muted-foreground">{num.name}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Searchable Assistant Dropdown */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Attach Assistant</Label>
                                        <Popover open={openModalAssistantDropdown} onOpenChange={setOpenModalAssistantDropdown}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openModalAssistantDropdown}
                                                    className="w-full justify-between bg-muted/30 h-11"
                                                >
                                                    {modalForm.assistant_id === "none"
                                                        ? <span className="text-yellow-600 font-medium">Unassigned (Do not route)</span>
                                                        : assistants.find((a) => a.assistant_id === modalForm.assistant_id)?.name || "Search assistants..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[380px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search assistants by name or ID..." />
                                                    <CommandList>
                                                        <CommandEmpty>No assistants found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value="none"
                                                                onSelect={() => {
                                                                    setModalForm({ ...modalForm, assistant_id: "none" });
                                                                    setOpenModalAssistantDropdown(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", modalForm.assistant_id === "none" ? "opacity-100" : "opacity-0")} />
                                                                <Unlink className="h-4 w-4 mr-2 text-yellow-600" />
                                                                <span className="text-yellow-600 font-medium">Unassigned</span>
                                                            </CommandItem>
                                                            {assistants.map((ast) => (
                                                                <CommandItem
                                                                    key={ast.assistant_id}
                                                                    value={`${ast.name} ${ast.assistant_id}`} // Allows searching by name OR ID
                                                                    onSelect={() => {
                                                                        setModalForm({ ...modalForm, assistant_id: ast.assistant_id });
                                                                        setOpenModalAssistantDropdown(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", modalForm.assistant_id === ast.assistant_id ? "opacity-100" : "opacity-0")} />
                                                                    <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    {ast.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/10">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAssignInbound} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Number"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search routes..."
                            value={numberSearchQuery}
                            onChange={(e) => setNumberSearchQuery(e.target.value)}
                            className="pl-9 bg-muted/50 border-border/50 focus:border-primary"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                        {listLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                <span className="text-xs text-muted-foreground animate-pulse">Fetching inbound mappings...</span>
                            </div>
                        ) : filteredInbounds.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Search className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-sm font-medium mb-1">No Routes Found</h3>
                                <p className="text-xs text-muted-foreground">Modify your search or assign a new Exotel number.</p>
                            </div>
                        ) : (
                            filteredInbounds.map((item) => (
                                <div
                                    key={item.inbound_id}
                                    onClick={() => handleSelectInbound(item)}
                                    className={cn(
                                        "group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                                        selectedInbound?.inbound_id === item.inbound_id
                                            ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_-5px_rgba(var(--primary),0.2)]"
                                            : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                        selectedInbound?.inbound_id === item.inbound_id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    )}>
                                        <PhoneIncoming className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={cn(
                                            "text-sm font-semibold truncate",
                                            selectedInbound?.inbound_id === item.inbound_id ? "text-primary" : "text-foreground"
                                        )}>
                                            {item.phone_number}
                                        </h4>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mt-0.5 truncate flex items-center gap-1">
                                            {item.assistant_name ? (
                                                <><Bot className="h-3 w-3" /> {item.assistant_name}</>
                                            ) : (
                                                <span className="text-yellow-600/70 italic flex items-center gap-1"><Unlink className="h-3 w-3" /> Unassigned</span>
                                            )}
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

                {!selectedInbound ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 relative z-10 animate-in fade-in duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                            <PhoneIncoming className="h-10 w-10 text-primary/30" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">Inbound Routing</h2>
                        <p className="max-w-xs text-center text-sm text-muted-foreground leading-relaxed">
                            Select a mapping from the sidebar to configure where incoming calls are routed.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-hidden z-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header */}
                        <div className="p-8 border-b border-border bg-card/10 backdrop-blur-xl flex items-end justify-between shrink-0">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <PhoneIncoming className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight">{selectedInbound.phone_number}</h2>
                                        <p className="text-xs font-mono text-muted-foreground/60 flex items-center gap-2">
                                            Normalized: {selectedInbound.phone_number_normalized} <ExternalLink className="h-3 w-3" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex gap-2">
                                    {selectedInbound.assistant_id && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDetachInbound}
                                            disabled={isDetaching}
                                            className="h-8 px-3 border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/10"
                                        >
                                            {isDetaching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
                                            Detach Assistant
                                        </Button>
                                    )}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDeleteInbound}
                                        disabled={isDeleting}
                                        className="h-8 px-3 shadow-lg shadow-destructive/20"
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        Delete Route
                                    </Button>
                                </div>
                                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    {selectedInbound.service}
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-10 max-w-4xl mx-auto space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Shield className="h-3 w-3" /> Routing Configuration
                                    </h3>
                                    <div className="glass rounded-2xl p-8 space-y-8 border border-border/50">

                                        <div className="space-y-4">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                                <Bot className="h-3 w-3" /> Search & Assign Assistant
                                            </Label>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

                                                {/* Main Panel Searchable Assistant Dropdown */}
                                                <Popover open={openMainAssistantDropdown} onOpenChange={setOpenMainAssistantDropdown}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openMainAssistantDropdown}
                                                            className="w-full sm:w-[400px] justify-between h-12 bg-background border-border"
                                                        >
                                                            {updateAssistantId === "none"
                                                                ? <span className="text-yellow-600 font-medium">Unassigned (Do not route)</span>
                                                                : assistants.find((a) => a.assistant_id === updateAssistantId)?.name || "Search assistants..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search assistants by name or ID..." />
                                                            <CommandList>
                                                                <CommandEmpty>No assistants found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        value="none"
                                                                        onSelect={() => {
                                                                            setUpdateAssistantId("none");
                                                                            setOpenMainAssistantDropdown(false);
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", updateAssistantId === "none" ? "opacity-100" : "opacity-0")} />
                                                                        <Unlink className="h-4 w-4 mr-2 text-yellow-600" />
                                                                        <span className="text-yellow-600 font-medium">Unassigned</span>
                                                                    </CommandItem>
                                                                    {assistants.map((ast) => (
                                                                        <CommandItem
                                                                            key={ast.assistant_id}
                                                                            value={`${ast.name} ${ast.assistant_id}`} // Allows searching by name OR ID
                                                                            onSelect={() => {
                                                                                setUpdateAssistantId(ast.assistant_id);
                                                                                setOpenMainAssistantDropdown(false);
                                                                            }}
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4", updateAssistantId === ast.assistant_id ? "opacity-100" : "opacity-0")} />
                                                                            <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                            {ast.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>

                                                <Button
                                                    onClick={handleUpdateMapping}
                                                    disabled={isUpdating || (updateAssistantId === (selectedInbound.assistant_id || "none"))}
                                                    className="w-full sm:w-auto h-12 px-8 shadow-lg shadow-primary/20"
                                                >
                                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Route"}
                                                </Button>
                                            </div>

                                            {updateAssistantId === "none" && (
                                                <div className="text-sm text-yellow-600/80 bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 mt-4 inline-flex items-center gap-2">
                                                    ⚠️ Incoming calls to this number will not be routed until you assign and save an AI assistant.
                                                </div>
                                            )}
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