import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    PhoneCall, Loader2, Phone, Webhook, PhoneOff,
    PhoneIncoming, AlertCircle, Mic, MicOff, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from "@livekit/components-react";
import "@livekit/components-styles";

const SIP_API = `${import.meta.env.VITE_BACKEND_URL}/api/sip`;
const PASSTHROUGH_API = `${import.meta.env.VITE_BACKEND_URL}/api/passthrough-call`;
const ASSISTANT_API = `${import.meta.env.VITE_BACKEND_URL}/api/assistant`;

// --- Inner call controls (must be inside LiveKitRoom for context) ---
interface CallControlsProps {
    isMuted: boolean;
    setIsMuted: (v: boolean) => void;
    onHangUp: () => void;
    calledNumber: string;
    callDuration: number;
}

const CallControls: React.FC<CallControlsProps> = ({ isMuted, setIsMuted, onHangUp, calledNumber, callDuration }) => {
    const { localParticipant } = useLocalParticipant();

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        localParticipant?.setMicrophoneEnabled(!next);
    };

    return (
        <div className="flex flex-col items-center gap-6 p-8 pb-10">
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-green-500/15 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-green-500/10 animate-ping animation-delay-150" />
                <div className="relative z-10 w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                    <Phone className="h-10 w-10 text-green-400" />
                </div>
            </div>

            <div className="text-center space-y-1.5">
                <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">Connected</p>
                <h3 className="text-2xl font-black tracking-tight truncate max-w-[280px]">{calledNumber}</h3>
                <p className="text-sm font-mono tabular-nums text-muted-foreground">{formatTime(callDuration)}</p>
            </div>

            <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "h-14 w-14 rounded-full border-2 transition-all",
                            isMuted
                                ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                : "border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
                        )}
                        onClick={toggleMute}
                    >
                        {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>
                    <span className="text-[10px] text-muted-foreground/60 font-medium">{isMuted ? "Unmute" : "Mute"}</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    <Button
                        size="icon"
                        className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/30 transition-transform hover:scale-105"
                        onClick={onHangUp}
                    >
                        <PhoneOff className="h-7 w-7 text-destructive-foreground" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground/60 font-medium">End Call</span>
                </div>
            </div>
        </div>
    );
};

export default function MakeCallPage() {
    const user = getStoredUser();
    const { toast } = useToast();

    // Shared data
    const [allTrunks, setAllTrunks] = useState<any[]>([]);
    const [trunksLoading, setTrunksLoading] = useState(true);

    // Agent Call State
    const [assistants, setAssistants] = useState<any[]>([]);
    const [assistantsLoading, setAssistantsLoading] = useState(true);
    const [agentCallData, setAgentCallData] = useState({
        customer_number: "",
        assistant_id: "",
        trunk_id: "",
    });
    const [agentCallLoading, setAgentCallLoading] = useState(false);

    // Passthrough Call State
    const [passthroughTrunkId, setPassthroughTrunkId] = useState("");
    const [passthroughNumber, setPassthroughNumber] = useState("");
    const [passthroughCalling, setPassthroughCalling] = useState(false);

    // Active passthrough call state
    const [roomToken, setRoomToken] = useState<string>("");
    const [isCallActive, setIsCallActive] = useState<boolean>(false);
    const [calledNumber, setCalledNumber] = useState<string>("");
    const [callDuration, setCallDuration] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    const passthroughTrunks = allTrunks.filter((t: any) => t.passthrough_mode === true);
    const standardTrunks = allTrunks.filter((t: any) => !t.passthrough_mode);

    useEffect(() => {
        const fetchTrunks = async () => {
            if (!user?.user_id) return;
            setTrunksLoading(true);
            try {
                const res = await fetch(`${SIP_API}/list?user_id=${user.user_id}`);
                const json = await res.json();
                if (res.ok) {
                    setAllTrunks(Array.isArray(json.data) ? json.data : []);
                }
            } catch {
                toast({ variant: "destructive", title: "Failed to load trunks" });
            } finally {
                setTrunksLoading(false);
            }
        };

        const fetchAssistants = async () => {
            if (!user?.user_id) return;
            setAssistantsLoading(true);
            try {
                const res = await fetch(`${ASSISTANT_API}/list?user_id=${user.user_id}&limit=100`);
                const json = await res.json();
                if (res.ok) {
                    let list = [];
                    if (Array.isArray(json?.data?.assistants)) list = json.data.assistants;
                    else if (Array.isArray(json?.data)) list = json.data;
                    setAssistants(list);
                }
            } catch {
                toast({ variant: "destructive", title: "Failed to load assistants" });
            } finally {
                setAssistantsLoading(false);
            }
        };

        fetchTrunks();
        fetchAssistants();
    }, [user?.user_id, toast]);

    useEffect(() => {
        if (!isCallActive) return;
        setCallDuration(0);
        const id = setInterval(() => setCallDuration(p => p + 1), 1000);
        return () => clearInterval(id);
    }, [isCallActive]);

    const handleAgentCall = async () => {
        if (!user?.user_id) return;
        if (!agentCallData.customer_number || !agentCallData.assistant_id || !agentCallData.trunk_id) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all fields" });
            return;
        }
        setAgentCallLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/call/outbound`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.user_id,
                    assistant_id: agentCallData.assistant_id,
                    trunk_id: agentCallData.trunk_id,
                    to_number: agentCallData.customer_number,
                }),
            });
            const json = await res.json();
            if (res.ok) {
                toast({ title: "Call Triggered", description: json.message || "Outbound call triggered successfully" });
                setAgentCallData(prev => ({ ...prev, customer_number: "" }));
            } else {
                toast({ variant: "destructive", title: "Error", description: json.error || "Failed to trigger call" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to connect to API" });
        } finally {
            setAgentCallLoading(false);
        }
    };

    const handlePassthroughCallEnded = useCallback(() => {
        setIsCallActive(false);
        setRoomToken("");
        setCalledNumber("");
        setCallDuration(0);
        setIsMuted(false);
    }, []);

    const handlePassthroughCall = async () => {
        if (!passthroughNumber.trim() || !passthroughTrunkId) {
            toast({ variant: "destructive", title: "Phone number and trunk required" });
            return;
        }
        const dialedNumber = passthroughNumber.trim();
        setPassthroughCalling(true);
        try {
            const res = await fetch(`${PASSTHROUGH_API}/passthrough-outbound`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user?.user_id, trunk_id: passthroughTrunkId, to_number: dialedNumber }),
            });
            const json = await res.json();
            if (res.ok) {
                const token: string = json.data?.room_token ?? json.room_token ?? "";
                toast({ title: "Call initiated", description: `Calling ${dialedNumber}…` });
                setPassthroughNumber("");
                if (token) {
                    setCalledNumber(dialedNumber);
                    setRoomToken(token);
                    setIsCallActive(true);
                }
            } else {
                throw new Error(json.error || "Failed to initiate call");
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Call failed", description: e.message });
        } finally {
            setPassthroughCalling(false);
        }
    };

    return (
        <div className="page-shell flex flex-col gap-0 h-full overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border bg-card/20 backdrop-blur-md shrink-0">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <PhoneCall className="h-6 w-6 text-primary" />
                    Make a Call
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Initiate calls via your agents or directly through passthrough SIP trunks.
                </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
                    <Tabs defaultValue="agent" className="w-full">
                        <TabsList className="mb-6 bg-muted/30">
                            <TabsTrigger value="agent" className="gap-2">
                                <Bot className="h-4 w-4" /> Agent Call
                            </TabsTrigger>
                            <TabsTrigger value="passthrough" className="gap-2">
                                <Webhook className="h-4 w-4" /> Passthrough Call
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="agent">
                            <section className="glass rounded-2xl p-6 border border-border/50">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Bot className="h-3.5 w-3.5 text-primary" /> Select Agent
                                            </Label>
                                            <Select
                                                value={agentCallData.assistant_id}
                                                onValueChange={(val) => setAgentCallData({ ...agentCallData, assistant_id: val })}
                                            >
                                                <SelectTrigger disabled={assistantsLoading} className="bg-muted/30 border-border/50 h-11">
                                                    <SelectValue placeholder={assistantsLoading ? "Loading agents..." : "Choose an agent..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {assistants.map((a) => (
                                                        <SelectItem key={a.assistant_id || a._id} value={a.assistant_id || a._id}>
                                                            {a.assistant_name || a.name || "Unnamed Agent"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-primary" /> Select Trunk
                                            </Label>
                                            <Select
                                                value={agentCallData.trunk_id}
                                                onValueChange={(val) => setAgentCallData({ ...agentCallData, trunk_id: val })}
                                            >
                                                <SelectTrigger disabled={trunksLoading} className="bg-muted/30 border-border/50 h-11">
                                                    <SelectValue placeholder={trunksLoading ? "Loading trunks..." : "Choose a trunk..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {standardTrunks.map((t) => (
                                                        <SelectItem key={t._id || t.trunk_id || t.external_trunk_id} value={t._id || t.trunk_id || t.external_trunk_id}>
                                                            {t.trunk_name} <span className="text-[10px] uppercase font-bold text-muted-foreground/60">({t.trunk_type})</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <PhoneIncoming className="h-3.5 w-3.5 text-primary" /> Phone Number
                                        </Label>
                                        <div className="flex gap-4">
                                            <Input
                                                value={agentCallData.customer_number}
                                                onChange={(e) => setAgentCallData({ ...agentCallData, customer_number: e.target.value })}
                                                placeholder="+919876543210"
                                                className="bg-muted/30 border-border/50 h-11 font-mono flex-1"
                                                onKeyDown={(e) => e.key === "Enter" && handleAgentCall()}
                                            />
                                            <Button
                                                onClick={handleAgentCall}
                                                disabled={agentCallLoading || !agentCallData.customer_number.trim() || !agentCallData.trunk_id || !agentCallData.assistant_id}
                                                className="h-11 px-8 gap-2 shrink-0 shadow-lg shadow-primary/20 min-w-[140px]"
                                            >
                                                {agentCallLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PhoneCall className="h-4 w-4" /> Trigger Call</>}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </TabsContent>

                        <TabsContent value="passthrough">
                            <section className="glass rounded-2xl p-6 border border-border/50">
                                {trunksLoading ? (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Loading passthrough trunks…</span>
                                    </div>
                                ) : passthroughTrunks.length === 0 ? (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">No passthrough trunks found</p>
                                            <p className="text-xs text-amber-500/70 mt-0.5">
                                                Go to Phone Numbers and create a trunk with Passthrough Mode enabled.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-primary" /> Select Trunk
                                            </Label>
                                            <Select value={passthroughTrunkId} onValueChange={setPassthroughTrunkId}>
                                                <SelectTrigger className="bg-muted/30 border-border/50 h-11">
                                                    <SelectValue placeholder="Choose a passthrough trunk…" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {passthroughTrunks.map((t) => {
                                                        const id = t._id || t.trunk_id || t.external_trunk_id || "";
                                                        return (
                                                            <SelectItem key={id} value={id}>
                                                                <span className="flex items-center gap-2">
                                                                    {t.trunk_name}
                                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60">{t.trunk_type}</span>
                                                                </span>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex-1 space-y-2 min-w-0">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <PhoneIncoming className="h-3.5 w-3.5 text-primary" /> Phone Number
                                            </Label>
                                            <Input
                                                value={passthroughNumber}
                                                onChange={(e) => setPassthroughNumber(e.target.value)}
                                                placeholder="+919876543210"
                                                className="bg-muted/30 border-border/50 h-11 font-mono"
                                                onKeyDown={(e) => e.key === "Enter" && handlePassthroughCall()}
                                            />
                                        </div>

                                        <Button
                                            onClick={handlePassthroughCall}
                                            disabled={passthroughCalling || !passthroughNumber.trim() || !passthroughTrunkId}
                                            className="h-11 px-6 gap-2 shrink-0 shadow-lg shadow-primary/20 min-w-[130px]"
                                        >
                                            {passthroughCalling ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <PhoneCall className="h-4 w-4" />
                                                    Call Now
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </section>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* LiveKit Call Overlay for Passthrough */}
            {isCallActive && roomToken && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
                        <LiveKitRoom
                            video={false}
                            audio={true}
                            token={roomToken}
                            serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                            connect={true}
                            onDisconnected={handlePassthroughCallEnded}
                        >
                            <RoomAudioRenderer />
                            <CallControls
                                isMuted={isMuted}
                                setIsMuted={setIsMuted}
                                onHangUp={handlePassthroughCallEnded}
                                calledNumber={calledNumber}
                                callDuration={callDuration}
                            />
                        </LiveKitRoom>
                    </div>
                </div>
            )}
        </div>
    );
}