import { useEffect, useState, useCallback } from "react";
import {
    Loader2, Filter, Calendar as CalendarIcon,
    Search, PhoneOff, Clock, ChevronLeft, ChevronRight, Download, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PASSTHROUGH_API = `${import.meta.env.VITE_BACKEND_URL}/api/passthrough-call`;

interface CallRecord {
    room_name?: string;
    queue_id?: string;
    assistant_id?: string | null;
    assistant_name?: string | null;
    is_passthrough?: boolean;
    to_number?: string;
    call_status?: string;
    call_status_reason?: string | null;
    answered_at?: string | null;
    recording_path?: string | null;
    recording_egress_id?: string;
    started_at?: string;
    ended_at?: string;
    call_duration_minutes?: number;
    billable_duration_minutes?: number;
}

const STATUS_STYLES: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    busy: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "no-answer": "bg-muted/50 text-muted-foreground border-border/50",
    ringing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export default function PassthroughCallRecordsPage() {
    const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
    const user = getStoredUser();
    const { toast } = useToast();

    const [records, setRecords] = useState<CallRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterNumber, setFilterNumber] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [offset, setOffset] = useState(0);
    const [limit] = useState(10);
    const [hasMore, setHasMore] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);

    const fetchRecords = useCallback(async (resetOffset = false) => {
        if (!user?.user_id) return;
        const currentOffset = resetOffset ? 0 : offset;
        if (resetOffset) setOffset(0);

        setLoading(true);
        try {
            const params = new URLSearchParams({
                user_id: user.user_id,
                limit: limit.toString(),
                offset: currentOffset.toString(),
            });
            if (filterNumber.trim()) params.set("to_number", filterNumber.trim());
            if (filterStatus && filterStatus !== "all") params.set("call_status", filterStatus);
            if (startDate) {
                const d = new Date(startDate); d.setHours(0, 0, 0, 0);
                params.set("start_date", d.toISOString());
            }
            if (endDate) {
                const d = new Date(endDate); d.setHours(23, 59, 59, 999);
                params.set("end_date", d.toISOString());
            }

            const res = await fetch(`${PASSTHROUGH_API}/call-records?${params.toString()}`);
            const json = await res.json();
            if (res.ok) {
                const data = Array.isArray(json.data?.records) ? json.data.records : [];
                const total = json.data?.pagination?.total ?? data.length;
                setRecords(data);
                setTotalRecords(total);
                setHasMore(currentOffset + limit < total);
            } else {
                throw new Error(json.error || "Failed to fetch records");
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [user?.user_id, offset, limit, filterNumber, filterStatus, startDate, endDate, toast]);

    useEffect(() => { fetchRecords(); }, []);

    const handleApplyFilters = () => fetchRecords(true);

    const handleClear = () => {
        setFilterNumber("");
        setFilterStatus("all");
        setStartDate(undefined);
        setEndDate(undefined);
        setTimeout(() => fetchRecords(true), 0);
    };

    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return (
        <div className="page-shell flex flex-col gap-0">

            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border bg-card/20 backdrop-blur-md shrink-0">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-6 w-6 text-primary" />
                    Passthrough Call Records
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    History of all passthrough calls — no assistant, direct SIP.
                </p>
            </div>

            {/* Filters */}
            <div className="p-4 md:p-6 border-b border-border bg-card/10 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 items-end gap-3">

                    <div className="space-y-2 xl:col-span-3">
                        <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                value={filterNumber}
                                onChange={(e) => setFilterNumber(e.target.value)}
                                placeholder="+1555…"
                                className="bg-background h-10 pl-8 font-mono text-sm"
                                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="bg-background h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="no-answer">No Answer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start font-normal bg-background h-10 text-sm", !startDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {startDate ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Pick date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start font-normal bg-background h-10 text-sm", !endDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {endDate ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Pick date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex gap-2 xl:col-span-3">
                        <Button onClick={handleApplyFilters} disabled={loading} className="flex-1 h-10 gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                            Apply
                        </Button>
                        <Button variant="outline" className="h-10 px-3" onClick={handleClear}>
                            Clear
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                <div className="glass rounded-xl border border-border/50 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead>Date / Time</TableHead>
                                <TableHead>To Number</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Recording</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <Loader2 className="h-7 w-7 animate-spin text-primary/50" />
                                            <span className="text-sm animate-pulse">Loading records…</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground opacity-40">
                                            <PhoneOff className="h-12 w-12" />
                                            <p className="text-sm">No call records found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((rec, idx) => (
                                    <TableRow key={rec.queue_id ?? idx} className="hover:bg-muted/20">
                                        <TableCell>
                                            {rec.started_at ? (
                                                <>
                                                    <div className="font-medium text-sm">{new Date(rec.started_at).toLocaleDateString()}</div>
                                                    <div className="text-xs text-muted-foreground">{new Date(rec.started_at).toLocaleTimeString()}</div>
                                                </>
                                            ) : <span className="text-muted-foreground text-sm">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">{rec.to_number || "—"}</span>
                                        </TableCell>
                                        <TableCell>
                                            {rec.call_status ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn("capitalize text-xs font-semibold", STATUS_STYLES[rec.call_status.toLowerCase()] ?? "bg-muted/50 text-muted-foreground border-border/50")}
                                                >
                                                    {rec.call_status}
                                                </Badge>
                                            ) : <span className="text-muted-foreground text-sm">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono bg-background text-xs">
                                                {formatDuration(rec.call_duration_minutes)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {rec.recording_path ? (
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    onClick={() => setSelectedRecording(rec.recording_path!)}
                                                >
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Listen to recording
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No recording</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {records.length > 0 && (
                        <div className="p-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 bg-card/30">
                            <span className="text-sm text-muted-foreground">
                                Showing {offset + 1}–{Math.min(offset + records.length, totalRecords)} of {totalRecords}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setOffset(o => Math.max(0, o - limit))}
                                    disabled={offset === 0 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium px-2">Page {page} of {totalPages}</span>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setOffset(o => o + limit)}
                                    disabled={!hasMore || loading}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recording Player Dialog */}
            <Dialog open={!!selectedRecording} onOpenChange={(open) => !open && setSelectedRecording(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5 text-primary" />
                            Call Recording
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col p-4 bg-muted/20 rounded-xl border border-border/50 shadow-inner mt-2">
                        <audio
                            controls
                            src={selectedRecording || ""}
                            className="w-full"
                            autoPlay
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
