import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { PhoneIncoming, Plus, Loader2, Trash2, ExternalLink, Bot, Shield, Link2, Unlink, Search, Check, ChevronsUpDown, ArrowLeft, Webhook } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { MasterDetailShell } from "@/components/common/MasterDetailShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callAssignInboundEndpoint,
  callDeleteInboundMappingEndpoint,
  callDetachInboundEndpoint,
  callListInboundMappingsEndpoint,
  callUpdateInboundMappingEndpoint,
  condenseListInboundMappingsResponse,
} from "@/services/inbound/inboundService";
import { callListAssistantsEndpoint, condenseListAssistantsResponse } from "@/services/assistant/assistantService";
import { callListTrunksEndpoint, condenseListTrunksResponse } from "@/services/sip/sipService";
import { callListStrategiesEndpoint, condenseListStrategiesResponse } from "@/services/inboundContext/inboundContextService";
import { InboundItem, InboundAssistantOption } from "@/types/inbound";
import { InboundStrategyOption } from "@/types/inboundContext";
import { ExotelNumber } from "@/types/sip";
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
import { toastError } from "@/lib/toastError";

/** Sentinel for "nothing attached" in the comboboxes; sent to the API as null. */
const NONE = "none";

export default function InboundPage() {
    const user = getStoredUser();
    const { toast } = useToast();

    // Data States
    const [inbounds, setInbounds] = useState<InboundItem[]>([]);
    const [assistants, setAssistants] = useState<InboundAssistantOption[]>([]);
    const [strategies, setStrategies] = useState<InboundStrategyOption[]>([]);
    const [exotelNumbers, setExotelNumbers] = useState<ExotelNumber[]>([]);

    // UI States
    const [listLoading, setListLoading] = useState(true);
    const [selectedInbound, setSelectedInbound] = useState<InboundItem | null>(null);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [numberSearchQuery, setNumberSearchQuery] = useState("");

    // Dropdown open states
    const [openPhoneDropdown, setOpenPhoneDropdown] = useState(false);
    const [openModalAssistantDropdown, setOpenModalAssistantDropdown] = useState(false);
    const [openModalStrategyDropdown, setOpenModalStrategyDropdown] = useState(false);
    const [openMainAssistantDropdown, setOpenMainAssistantDropdown] = useState(false);
    const [openMainStrategyDropdown, setOpenMainStrategyDropdown] = useState(false);

    // Form States
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDetaching, setIsDetaching] = useState(false);

    const [modalForm, setModalForm] = useState({
        phone_number: "",
        assistant_id: NONE,
        strategy_id: NONE
    });

    const [updateAssistantId, setUpdateAssistantId] = useState<string>(NONE);
    const [updateStrategyId, setUpdateStrategyId] = useState<string>(NONE);

    const fetchData = useCallback(async () => {
        if (!user?.user_id) return;

        try {
            // Fetch Assistants
            const astRes = await callListAssistantsEndpoint({ userId: user.user_id });

            if (astRes.ok) {
                setAssistants(condenseListAssistantsResponse(astRes.json).map((ast) => ({
                    assistant_id: ast.assistant_id,
                    name: ast.assistant_name
                })));
            }

            // Fetch SIP Trunks (Filter for Exotel)
            const sipRes = await callListTrunksEndpoint(user.user_id);
            if (sipRes.ok) {
                const exotel = condenseListTrunksResponse(sipRes.json)
                    .filter((t: any) => t.trunk_type === 'exotel' && t.trunk_config?.exotel_number)
                    .map((t: any) => ({
                        trunk_id: t.external_trunk_id || t._id,
                        number: t.trunk_config.exotel_number,
                        name: t.trunk_name || "Exotel Trunk"
                    }));
                setExotelNumbers(exotel);
            }

            // Fetch Context Strategies (optional attachment for each number)
            const strategyJson = await callListStrategiesEndpoint(user.user_id);
            setStrategies(condenseListStrategiesResponse(strategyJson).map((st) => ({
                strategy_id: st.strategy_id,
                name: st.name
            })));
        } catch (error) {
            console.error("Failed to fetch prerequisite data:", error);
            // Without this the dropdowns just look empty, which reads as "you have none".
            toast({
                variant: "destructive",
                title: "Could not load assistants, numbers or strategies",
                description: "The dropdowns may be incomplete. Refresh to try again.",
            });
        }
    }, [user?.user_id, toast]);

    // FIX: Removed selectedInbound dependencies and added showLoading flag to prevent infinite loops
    const fetchList = async (showLoading = true) => {
        if (!user?.user_id) {
            setListLoading(false);
            return;
        }
        if (showLoading) setListLoading(true);
        try {
            const json = await callListInboundMappingsEndpoint(user.user_id);
            setInbounds(condenseListInboundMappingsResponse(json) as InboundItem[]);
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
        setUpdateAssistantId(inbound.assistant_id || NONE);
        setUpdateStrategyId(inbound.inbound_context_strategy_id || NONE);
        setMobileDetailOpen(true);
    };

    const filteredInbounds = useMemo(() => {
        if (!numberSearchQuery.trim()) return inbounds;
        const lowerQ = numberSearchQuery.toLowerCase();
        return inbounds.filter(i =>
            i.phone_number.toLowerCase().includes(lowerQ) ||
            (i.assistant_name && i.assistant_name.toLowerCase().includes(lowerQ)) ||
            (i.inbound_context_strategy_name && i.inbound_context_strategy_name.toLowerCase().includes(lowerQ))
        );
    }, [inbounds, numberSearchQuery]);

    const strategyNameFor = (id: string) => strategies.find(s => s.strategy_id === id)?.name;

    const handleAssignInbound = async () => {
        if (!user?.user_id) return;
        if (!modalForm.phone_number) {
            toast({ variant: "destructive", title: "Validation Error", description: "Phone number is required" });
            return;
        }
        if (!modalForm.assistant_id || modalForm.assistant_id === NONE) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select an assistant to attach" });
            return;
        }

        setIsCreating(true);
        try {
            const payload = {
                user_id: user.user_id,
                assistant_id: modalForm.assistant_id,
                service: "exotel",
                inbound_config: {
                    phone_number: modalForm.phone_number
                },
                // Optional: omitted entirely means the number routes with no caller-context lookup.
                ...(modalForm.strategy_id !== NONE && { inbound_context_strategy_id: modalForm.strategy_id })
            };

            const { ok, json } = await callAssignInboundEndpoint(payload);

            if (ok) {
                toast({ title: "Success", description: "Inbound number assigned successfully" });
                setIsModalOpen(false);
                setModalForm({ phone_number: "", assistant_id: NONE, strategy_id: NONE });
                await fetchList(false); // Fetch silently in background
            } else {
                toast(toastError(json, "Failed to assign number"));
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" });
        } finally {
            setIsCreating(false);
        }
    };

    const assistantChanged = updateAssistantId !== (selectedInbound?.assistant_id || NONE);
    const strategyChanged = updateStrategyId !== (selectedInbound?.inbound_context_strategy_id || NONE);

    const handleUpdateMapping = async () => {
        if (!selectedInbound || !user?.user_id) return;
        if (!assistantChanged && !strategyChanged) return;

        setIsUpdating(true);

        try {
            // Send only what changed; the API rejects an update with no fields.
            const payload = {
                user_id: user.user_id,
                ...(assistantChanged && { assistant_id: updateAssistantId === NONE ? null : updateAssistantId }),
                ...(strategyChanged && { inbound_context_strategy_id: updateStrategyId === NONE ? null : updateStrategyId }),
            };

            const { ok, json } = await callUpdateInboundMappingEndpoint(selectedInbound.inbound_id, payload);

            if (ok) {
                toast({ title: "Success", description: "Mapping updated successfully" });

                // Optimistic UI Update instantly reflects changes
                const attachedAssistant = assistants.find(a => a.assistant_id === updateAssistantId);
                setSelectedInbound(prev => prev ? {
                    ...prev,
                    assistant_id: updateAssistantId === NONE ? null : updateAssistantId,
                    assistant_name: attachedAssistant ? attachedAssistant.name : null,
                    inbound_context_strategy_id: updateStrategyId === NONE ? null : updateStrategyId,
                    inbound_context_strategy_name: updateStrategyId === NONE ? null : strategyNameFor(updateStrategyId) || null
                } : null);

                await fetchList(false); // Fetch silently in background
            } else {
                toast(toastError(json, "Failed to update mapping"));
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
            const { ok, json } = await callDetachInboundEndpoint({
                userId: user.user_id,
                inboundId: selectedInbound.inbound_id,
            });
            if (ok) {
                toast({ title: "Success", description: "Assistant and strategy detached" });

                // Optimistic Update — detach clears both attachments server-side.
                setSelectedInbound(prev => prev ? {
                    ...prev,
                    assistant_id: null,
                    assistant_name: null,
                    inbound_context_strategy_id: null,
                    inbound_context_strategy_name: null
                } : null);
                setUpdateAssistantId(NONE);
                setUpdateStrategyId(NONE);

                await fetchList(false); // Fetch silently in background
            } else {
                toast(toastError(json, "Failed to detach"));
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

        setIsDeleting(true);
        try {
            const { ok, json } = await callDeleteInboundMappingEndpoint({
                userId: user.user_id,
                inboundId: selectedInbound.inbound_id,
            });

            if (ok) {
                toast({ title: "Success", description: "Inbound mapping deleted successfully" });
                setSelectedInbound(null);
                setMobileDetailOpen(false);
                await fetchList(false);
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

    const strategyEmptyState = (
        <CommandEmpty>
            <span className="text-xs text-muted-foreground">
                No strategies yet.{" "}
                <Link to="/dashboard/inbound-context" className="text-primary underline underline-offset-2">
                    Create one
                </Link>{" "}
                to fetch caller data before the assistant speaks.
            </span>
        </CommandEmpty>
    );

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
                            <PhoneIncoming className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-foreground">Inbound Routes</span>
                        </div>

                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-8 px-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Plus className="h-4 w-4 mr-1" /> Assign
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md border-none shadow-2xl rounded-xl bg-background">
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
                                            <PopoverContent className="w-[min(380px,calc(100vw-2rem))] p-0" align="start">
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
                                                    {modalForm.assistant_id === NONE
                                                        ? <span className="text-muted-foreground">Select an assistant...</span>
                                                        : assistants.find((a) => a.assistant_id === modalForm.assistant_id)?.name || "Search assistants..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[min(380px,calc(100vw-2rem))] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search assistants by name or ID..." />
                                                    <CommandList>
                                                        <CommandEmpty>No assistants found.</CommandEmpty>
                                                        <CommandGroup>
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

                                    {/* Searchable Context Strategy Dropdown (optional) */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Context Strategy <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                                        </Label>
                                        <Popover open={openModalStrategyDropdown} onOpenChange={setOpenModalStrategyDropdown}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openModalStrategyDropdown}
                                                    className="w-full justify-between bg-muted/30 h-11"
                                                >
                                                    {modalForm.strategy_id === NONE
                                                        ? <span className="text-muted-foreground">No context lookup</span>
                                                        : strategyNameFor(modalForm.strategy_id) || "Search strategies..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[min(380px,calc(100vw-2rem))] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search strategies by name or ID..." />
                                                    <CommandList>
                                                        {strategyEmptyState}
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value={NONE}
                                                                onSelect={() => {
                                                                    setModalForm({ ...modalForm, strategy_id: NONE });
                                                                    setOpenModalStrategyDropdown(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", modalForm.strategy_id === NONE ? "opacity-100" : "opacity-0")} />
                                                                <span className="text-muted-foreground">No context lookup</span>
                                                            </CommandItem>
                                                            {strategies.map((st) => (
                                                                <CommandItem
                                                                    key={st.strategy_id}
                                                                    value={`${st.name} ${st.strategy_id}`}
                                                                    onSelect={() => {
                                                                        setModalForm({ ...modalForm, strategy_id: st.strategy_id });
                                                                        setOpenModalStrategyDropdown(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", modalForm.strategy_id === st.strategy_id ? "opacity-100" : "opacity-0")} />
                                                                    <Webhook className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    {st.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-[10px] text-muted-foreground">
                                            Calls a webhook before the assistant speaks, so the prompt can use caller data.
                                            Leave it off and the number routes normally with no added delay.
                                        </p>
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
                                                <span className="text-amber-500/80 italic flex items-center gap-1"><Unlink className="h-3 w-3" /> Unassigned</span>
                                            )}
                                        </p>
                                        {item.inbound_context_strategy_name && (
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate flex items-center gap-1">
                                                <Webhook className="h-3 w-3" /> {item.inbound_context_strategy_name}
                                            </p>
                                        )}
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

                {!selectedInbound ? (
                    <EmptyState
                        icon={PhoneIncoming}
                        title="Inbound Routing"
                        description="Select a mapping from the sidebar to configure where incoming calls are routed."
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
                            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
                                <div className="flex gap-2">
                                    {(selectedInbound.assistant_id || selectedInbound.inbound_context_strategy_id) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isDetaching}
                                                    className="h-8 px-3 status-btn-warning"
                                                >
                                                    {isDetaching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlink className="h-4 w-4 mr-2" />}
                                                    Detach
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Detach {selectedInbound.phone_number}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This clears both the assistant and the context strategy. The number stays
                                                        listed and keeps its configuration, but incoming calls stop routing until
                                                        you attach an assistant again.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDetachInbound}>Detach</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={isDeleting}
                                                className="h-8 px-3 shadow-lg shadow-destructive/20"
                                            >
                                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                Delete Route
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete the route for {selectedInbound.phone_number}?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    The mapping is removed and the number is released for reuse. Calls to it stop
                                                    routing immediately. This cannot be undone — you would have to assign the
                                                    number again from scratch.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteInbound}>Delete route</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <div className="flex flex-wrap gap-2 md:justify-end">
                                    <div className="status-chip status-chip-info">
                                        {selectedInbound.service}
                                    </div>
                                    {selectedInbound.inbound_context_strategy_name ? (
                                        <div className="status-chip status-chip-info flex items-center gap-1">
                                            <Webhook className="h-3 w-3" /> {selectedInbound.inbound_context_strategy_name}
                                        </div>
                                    ) : (
                                        <div className="status-chip text-muted-foreground">No context lookup</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 md:p-10 max-w-4xl mx-auto space-y-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Shield className="h-3 w-3" /> Routing Configuration
                                    </h3>
                                    <div className="glass rounded-2xl p-8 space-y-8 border border-border/50">

                                        <div className="space-y-4">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                                <Bot className="h-3 w-3" /> Search & Assign Assistant
                                            </Label>

                                            {/* Main Panel Searchable Assistant Dropdown */}
                                            <Popover open={openMainAssistantDropdown} onOpenChange={setOpenMainAssistantDropdown}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openMainAssistantDropdown}
                                                        className="w-full sm:max-w-[400px] justify-between h-12 bg-background border-border"
                                                    >
                                                        {updateAssistantId === NONE
                                                            ? <span className="status-text-warning font-medium">Unassigned (Do not route)</span>
                                                            : assistants.find((a) => a.assistant_id === updateAssistantId)?.name || "Search assistants..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search assistants by name or ID..." />
                                                        <CommandList>
                                                            <CommandEmpty>No assistants found.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    value={NONE}
                                                                    onSelect={() => {
                                                                        setUpdateAssistantId(NONE);
                                                                        setOpenMainAssistantDropdown(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", updateAssistantId === NONE ? "opacity-100" : "opacity-0")} />
                                                                    <Unlink className="h-4 w-4 mr-2 status-text-warning" />
                                                                    <span className="status-text-warning font-medium">Unassigned</span>
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

                                            {updateAssistantId === NONE && (
                                                <div className="status-alert-warning text-sm p-4 rounded-xl inline-flex items-center gap-2">
                                                    ⚠️ Incoming calls to this number will not be routed until you assign and save an AI assistant.
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px w-full bg-border/50" />

                                        <div className="space-y-4">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                                                <Webhook className="h-3 w-3" /> Caller Context Strategy
                                            </Label>

                                            <Popover open={openMainStrategyDropdown} onOpenChange={setOpenMainStrategyDropdown}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openMainStrategyDropdown}
                                                        className="w-full sm:max-w-[400px] justify-between h-12 bg-background border-border"
                                                    >
                                                        {updateStrategyId === NONE
                                                            ? <span className="text-muted-foreground">None — no context lookup</span>
                                                            : strategyNameFor(updateStrategyId)
                                                                || selectedInbound.inbound_context_strategy_name
                                                                || "Search strategies..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search strategies by name or ID..." />
                                                        <CommandList>
                                                            {strategyEmptyState}
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    value={NONE}
                                                                    onSelect={() => {
                                                                        setUpdateStrategyId(NONE);
                                                                        setOpenMainStrategyDropdown(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", updateStrategyId === NONE ? "opacity-100" : "opacity-0")} />
                                                                    <span className="text-muted-foreground">None — no context lookup</span>
                                                                </CommandItem>
                                                                {strategies.map((st) => (
                                                                    <CommandItem
                                                                        key={st.strategy_id}
                                                                        value={`${st.name} ${st.strategy_id}`}
                                                                        onSelect={() => {
                                                                            setUpdateStrategyId(st.strategy_id);
                                                                            setOpenMainStrategyDropdown(false);
                                                                        }}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", updateStrategyId === st.strategy_id ? "opacity-100" : "opacity-0")} />
                                                                        <Webhook className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                        {st.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            <p className="text-xs text-muted-foreground max-w-xl">
                                                The strategy attaches to this number, not to the assistant — the same assistant can
                                                answer different numbers with different strategies. A failing lookup never drops the
                                                call; the prompt just renders <span className="font-mono">{"{{context.*}}"}</span> empty.{" "}
                                                <Link to="/dashboard/inbound-context" className="text-primary underline underline-offset-2">
                                                    Manage strategies
                                                </Link>
                                            </p>
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleUpdateMapping}
                                                disabled={isUpdating || (!assistantChanged && !strategyChanged)}
                                                className="w-full sm:w-auto h-12 px-8 shadow-lg shadow-primary/20"
                                            >
                                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Route"}
                                            </Button>
                                        </div>
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
