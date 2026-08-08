import { useEffect, useMemo, useState, useCallback } from "react";
import { List, Loader2, Play, Search, FileText, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callGetAssistantCallLogsEndpoint,
  callListAssistantsEndpoint,
  condenseCallLogsResponse,
  condenseListAssistantsResponse,
} from "@/services/assistant/assistantService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { modeAccent } from "@/lib/assistantModes";

export default function CallLogsPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  const [assistants, setAssistants] = useState<any[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  // 50 rather than 10: the only search this page can offer is over the rows already loaded
  // (the upstream call-logs endpoint has no number or status filter), so the page has to be big
  // enough for that search to be worth using.
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  
  const [sortBy, setSortBy] = useState("started_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Update state to handle Date objects for the Calendar component
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Dialog State
  const [selectedTranscripts, setSelectedTranscripts] = useState<any[] | null>(null);
  const [selectedMetadata, setSelectedMetadata] = useState<Record<string, unknown> | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null); // Added recording state

  const [search, setSearch] = useState("");

  // 1. Fetch Assistants for the Dropdown
  const fetchAssistants = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const { ok, json } = await callListAssistantsEndpoint({ userId: user.user_id });
      if (ok) {
        // Keep `assistant_mode` — dropping it made every chip in the picker read "pipeline".
        setAssistants(condenseListAssistantsResponse(json).map((item) => ({
          assistant_id: item.assistant_id,
          assistant_name: item.assistant_name,
          assistant_mode: item.assistant_mode,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch assistants", error);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  // 2. Fetch Logs
  const fetchLogs = useCallback(async () => {
    if (!user?.user_id || !selectedAssistant) return;
    
    setLoading(true);
    try {
      const json = await callGetAssistantCallLogsEndpoint({
        userId: user.user_id,
        assistantId: selectedAssistant,
        page,
        limit,
        sortBy,
        sortOrder,
        startDate,
        endDate,
      });

      const { logs, totalPages, total } = condenseCallLogsResponse(json);
      setLogs(logs);
      setTotalPages(totalPages);
      setTotalLogs(total);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, selectedAssistant, page, limit, sortBy, sortOrder, startDate, endDate, toast]);

  // Fetch logs when relevant state changes
  useEffect(() => {
    if (selectedAssistant) {
      fetchLogs();
    } else {
      setLogs([]);
      setTotalLogs(0);
    }
  }, [selectedAssistant, page, limit, sortBy, sortOrder]);

  // Manual search trigger for date filters
  const handleApplyFilters = () => {
    setPage(1); // Reset to first page
    fetchLogs();
  };

  // Page-scoped only — see the note beside the input.
  const visibleLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((log) => {
      if (String(log.to_number ?? "").toLowerCase().includes(needle)) return true;
      return (log.transcripts ?? []).some((t: { text?: string }) =>
        String(t?.text ?? "").toLowerCase().includes(needle),
      );
    });
  }, [logs, search]);

  const formatDuration = (minutes: number) => {
    if (!minutes) return "0s";
    const seconds = Math.round(minutes * 60);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="page-shell flex flex-col">
      
      {/* Header & Controls */}
      <div className="p-4 md:p-6 border-b border-border bg-card/20 backdrop-blur-md space-y-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <List className="h-6 w-6 text-primary" />
            Call Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">View past conversations, transcripts, and recordings.</p>
        </div>

        {/* The assistant is a prerequisite, not a peer filter — every control below is dead
            without it — so it gets its own row above them rather than a slot among them. */}
        <div className="grid min-w-0 gap-2 glass rounded-xl border border-border/50 p-4">
          <Label htmlFor="assistant-picker">Assistant</Label>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Select value={selectedAssistant} onValueChange={(v) => { setSelectedAssistant(v); setPage(1); }}>
              <SelectTrigger
                id="assistant-picker"
                className="h-10 min-w-0 flex-1 bg-background sm:max-w-md [&_[data-tagline]]:hidden"
              >
                <SelectValue placeholder="Choose an assistant to see its calls…" />
              </SelectTrigger>
              <SelectContent>
                {assistants.map((a) => (
                  <SelectItem key={a.assistant_id} value={a.assistant_id}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate">{a.assistant_name}</span>
                      <span
                        data-tagline
                        className={cn(
                          "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                          modeAccent(a.assistant_mode).chip,
                        )}
                      >
                        {a.assistant_mode || "pipeline"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAssistant && !loading && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {totalLogs.toLocaleString()} {totalLogs === 1 ? "call" : "calls"} in range
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-9 items-end gap-3 glass p-4 rounded-xl border border-border/50">
          {/* Start Date Calendar Picker */}
          <div className="grid min-w-0 gap-2 xl:col-span-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background h-10",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date Calendar Picker */}
          <div className="grid min-w-0 gap-2 xl:col-span-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background h-10",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid min-w-0 gap-2 xl:col-span-2">
            <Label>Order by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="started_at">When the call started</SelectItem>
                <SelectItem value="ended_at">When the call ended</SelectItem>
                <SelectItem value="call_duration_minutes">How long it lasted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid min-w-0 gap-2 xl:col-span-2">
            <Label>Direction</Label>
            {/* Labelled for the field being sorted: "Descending" tells you nothing about whether
                you are about to see the newest calls or the longest ones. */}
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{sortBy === "call_duration_minutes" ? "Longest first" : "Newest first"}</SelectItem>
                <SelectItem value="asc">{sortBy === "call_duration_minutes" ? "Shortest first" : "Oldest first"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleApplyFilters} disabled={!selectedAssistant || loading} className="w-full xl:w-auto xl:col-span-1 shrink-0 gap-2 h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            Apply
          </Button>
        </div>

        {/* Client-side, and it says so. `GET /assistant/call-logs/{id}` takes only paging, a date
            range and a sort — there is no number or status filter to hand this to. */}
        <div className="grid min-w-0 gap-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-10 bg-background pl-9"
              placeholder="Search this page — number or transcript text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedAssistant}
            />
          </div>
          <p className="text-[0.8125rem] leading-6 text-muted-foreground">
            Filters the {logs.length} {logs.length === 1 ? "call" : "calls"} loaded below. The
            call-log API cannot search across pages — narrow the date range to bring more into view.
          </p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6 relative">
        {!selectedAssistant ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
            <List className="h-16 w-16 mb-4 opacity-20" />
            <p>Please select an assistant above to view its call logs.</p>
          </div>
        ) : loading && logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden glass shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>To Number</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead className="text-right">Transcripts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      {search.trim()
                        ? `Nothing on this page matches "${search.trim()}".`
                        : "No call logs found for the selected criteria."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleLogs.map((log, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{new Date(log.started_at).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">{new Date(log.started_at).toLocaleTimeString()}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.to_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-background">
                          {formatDuration(log.call_duration_minutes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.recording_path ? (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setSelectedRecording(log.recording_path)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Listen to recording
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No recording</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={!log.transcripts || log.transcripts.length === 0}
                          onClick={() => {
                            setSelectedTranscripts(log.transcripts);
                            // Not in the documented log schema — shown only when a record carries it.
                            setSelectedMetadata(
                              log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
                                ? (log.metadata as Record<string, unknown>)
                                : null,
                            );
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            {logs.length > 0 && (
              <div className="p-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 bg-card/30">
                <span className="text-sm text-muted-foreground">
                  {search.trim()
                    ? `Showing ${visibleLogs.length} of ${logs.length} on this page`
                    : `Showing ${logs.length} of ${totalLogs} logs`}
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                    Previous
                  </Button>
                  <span className="text-sm px-2 font-medium">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcript Dialog */}
      <Dialog
        open={!!selectedTranscripts}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedTranscripts(null);
          setSelectedMetadata(null);
        }}
      >
        {/* Changed to max-w-4xl for a wider box, and h-[85vh] for a taller, fixed-height box */}
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Call Transcript
            </DialogTitle>
          </DialogHeader>

          {/* The variables this call was placed with, when the record carries them. */}
          {selectedMetadata && Object.keys(selectedMetadata).length > 0 && (
            <dl className="grid gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Variables</dt>
              {Object.entries(selectedMetadata).map(([key, value]) => (
                <dd key={key} className="flex min-w-0 flex-wrap gap-x-2 font-mono">
                  <span className="shrink-0 text-muted-foreground">{key}</span>
                  <span className="min-w-0 break-all">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </span>
                </dd>
              ))}
            </dl>
          )}

          {/* Added h-full to explicitly bound the scroll area within the flex container */}
          <ScrollArea className="flex-1 h-full p-4 bg-muted/20 rounded-md border pr-4">
            <div className="space-y-4">
              {selectedTranscripts?.map((t, idx) => {
                const isAgent = t.speaker?.toLowerCase() === 'agent' || t.speaker?.toLowerCase() === 'assistant';
                return (
                  <div key={idx} className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                    <span className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider px-1">
                      {t.speaker} • {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                      isAgent ? 'bg-card border border-border rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm'
                    }`}>
                      {t.text}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
