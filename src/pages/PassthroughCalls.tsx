import { useEffect, useState, useCallback } from "react";
import {
    PhoneCall, Loader2, Phone, Webhook, PhoneOff,
    PhoneIncoming, AlertCircle, Mic, MicOff
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

interface PassthroughTrunk {
    _id?: string;
    trunk_id?: string;
    external_trunk_id?: string;
    trunk_name: string;
    trunk_type: "twilio" | "exotel";
    passthrough_mode: boolean;
}

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
            {/* Pulsing avatar */}
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-green-500/15 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-green-500/10 animate-ping animation-delay-150" />
                <div className="relative z-10 w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                    <Phone className="h-10 w-10 text-green-400" />
                </div>
            </div>

            {/* Number + timer */}
            <div className="text-center space-y-1.5">
                <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">Connected</p>
                <h3 className="text-2xl font-black tracking-tight truncate max-w-[280px]">{calledNumber}</h3>
                <p className="text-sm font-mono tabular-nums text-muted-foreground">{formatTime(callDuration)}</p>
            </div>

            {/* Controls */}
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

// --- Main page ---
export default function PassthroughCallsPage() {
    const user = getStoredUser();
    const { toast } = useToast();

    const [trunks, setTrunks] = useState<PassthroughTrunk[]>([]);
    const [trunksLoading, setTrunksLoading] = useState(true);
    const [selectedTrunkId, setSelectedTrunkId] = useState("");
    const [toNumber, setToNumber] = useState("");
    const [isCalling, setIsCalling] = useState(false);

    // Active call state
    const [roomToken, setRoomToken] = useState<string>("");
    const [isCallActive, setIsCallActive] = useState<boolean>(false);
    const [calledNumber, setCalledNumber] = useState<string>("");
    const [callDuration, setCallDuration] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    // Timer
    useEffect(() => {
        if (!isCallActive) return;
        setCallDuration(0);
        const id = setInterval(() => setCallDuration(p => p + 1), 1000);
        return () => clearInterval(id);
    }, [isCallActive]);

    const fetchTrunks = useCallback(async () => {
        if (!user?.user_id) return;
        setTrunksLoading(true);
        try {
            const res = await fetch(`${SIP_API}/list?user_id=${user.user_id}`);
            const json = await res.json();
            if (res.ok) {
                const all = Array.isArray(json.data) ? json.data : [];
                setTrunks(all.filter((t: any) => t.passthrough_mode === true));
            }
        } catch {
            toast({ variant: "destructive", title: "Failed to load trunks" });
        } finally {
            setTrunksLoading(false);
        }
    }, [user?.user_id, toast]);

    useEffect(() => { fetchTrunks(); }, [fetchTrunks]);

    const handleCallEnded = useCallback(() => {
        setIsCallActive(false);
        setRoomToken("");
        setCalledNumber("");
        setCallDuration(0);
        setIsMuted(false);
    }, []);

    const handleCall = async () => {
        if (!toNumber.trim() || !selectedTrunkId) {
            toast({ variant: "destructive", title: "Phone number and trunk required" });
            return;
        }
        const dialedNumber = toNumber.trim();
        setIsCalling(true);
        try {
            const res = await fetch(`${PASSTHROUGH_API}/passthrough-outbound`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user?.user_id, trunk_id: selectedTrunkId, to_number: dialedNumber }),
            });
            const json = await res.json();
            if (res.ok) {
                const token: string = json.data?.room_token ?? json.room_token ?? "";
                toast({ title: "Call initiated", description: `Calling ${dialedNumber}…` });
                setToNumber("");
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
            setIsCalling(false);
        }
    };

    return (
        <div className="page-shell flex flex-col gap-0">

            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border bg-card/20 backdrop-blur-md shrink-0">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Webhook className="h-6 w-6 text-primary" />
                    Passthrough Calls
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Direct person-to-person calls via SIP trunk — no assistant involved.
                </p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">

                    {/* Make a Call Card */}
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                            <PhoneCall className="h-3 w-3" /> Make a Call
                        </h3>
                        <div className="glass rounded-2xl p-6 border border-border/50">
                            {trunksLoading ? (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Loading passthrough trunks…</span>
                                </div>
                            ) : trunks.length === 0 ? (
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
                                        <Select value={selectedTrunkId} onValueChange={setSelectedTrunkId}>
                                            <SelectTrigger className="bg-muted/30 border-border/50 h-11">
                                                <SelectValue placeholder="Choose a passthrough trunk…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {trunks.map((t) => {
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
                                            value={toNumber}
                                            onChange={(e) => setToNumber(e.target.value)}
                                            placeholder="+919876543210"
                                            className="bg-muted/30 border-border/50 h-11 font-mono"
                                            onKeyDown={(e) => e.key === "Enter" && handleCall()}
                                        />
                                    </div>

                                    <Button
                                        onClick={handleCall}
                                        disabled={isCalling || !toNumber.trim() || !selectedTrunkId}
                                        className="h-11 px-6 gap-2 shrink-0 shadow-lg shadow-primary/20 min-w-[130px]"
                                    >
                                        {isCalling ? (
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
                        </div>
                    </section>
                </div>
            </ScrollArea>

            {/* LiveKit Call Overlay */}
            {isCallActive && roomToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-[calc(100vw-1.5rem)] sm:w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
                        <LiveKitRoom
                            video={false}
                            audio={true}
                            token={roomToken}
                            serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                            connect={true}
                            onDisconnected={handleCallEnded}
                        >
                            <RoomAudioRenderer />
                            <CallControls
                                isMuted={isMuted}
                                setIsMuted={setIsMuted}
                                onHangUp={handleCallEnded}
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
