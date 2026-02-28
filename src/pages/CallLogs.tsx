import { useEffect, useState, useCallback } from "react";
import { List, Loader2, Play, Search, FileText, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:3005/api/assistant";

export default function CallLogsPage() {
  const user = getStoredUser();
  const { toast } = useToast();

  const [assistants, setAssistants] = useState<any[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  
  const [sortBy, setSortBy] = useState("started_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Update state to handle Date objects for the Calendar component
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Dialog State
  const [selectedTranscripts, setSelectedTranscripts] = useState<any[] | null>(null);

  // 1. Fetch Assistants for the Dropdown
  const fetchAssistants = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const res = await fetch(`${API_BASE}/list?user_id=${user.user_id}`);
      const json = await res.json();
      if (res.ok) {
        let list = [];
        if (Array.isArray(json?.data?.assistants)) list = json.data.assistants;
        else if (Array.isArray(json?.data)) list = json.data;
        else if (Array.isArray(json)) list = json;
        setAssistants(list.map((item: any) => ({
          assistant_id: item.assistant_id || item._id,
          assistant_name: item.assistant_name || item.name || "Unnamed Assistant",
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
      const queryParams = new URLSearchParams({
        user_id: user.user_id,
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      // Append dates if provided (Ensure proper start of day and end of day formatting)
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        queryParams.append("start_date", start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryParams.append("end_date", end.toISOString());
      }

      const res = await fetch(`${API_BASE}/call-logs/${selectedAssistant}?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.data) {
        setLogs(json.data.logs || []);
        setTotalPages(json.data.pagination?.total_pages || 1);
        setTotalLogs(json.data.pagination?.total || 0);
      } else {
        throw new Error(json.error || json.message || "Failed to fetch logs");
      }
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

  const formatDuration = (minutes: number) => {
    if (!minutes) return "0s";
    const seconds = Math.round(minutes * 60);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      
      {/* Header & Controls */}
      <div className="p-6 border-b border-border bg-card/20 backdrop-blur-md space-y-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <List className="h-6 w-6 text-primary" />
            Call Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">View past conversations, transcripts, and recordings.</p>
        </div>

        <div className="flex flex-wrap items-end gap-4 glass p-4 rounded-xl border border-border/50">
          <div className="grid gap-2 flex-1 min-w-[200px]">
            <Label>Select Assistant *</Label>
            <Select value={selectedAssistant} onValueChange={(v) => { setSelectedAssistant(v); setPage(1); }}>
              <SelectTrigger className="bg-background h-10">
                <SelectValue placeholder="Choose an assistant..." />
              </SelectTrigger>
              <SelectContent>
                {assistants.map((a) => (
                  <SelectItem key={a.assistant_id} value={a.assistant_id}>
                    {a.assistant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Calendar Picker */}
          <div className="grid gap-2 w-44">
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
          <div className="grid gap-2 w-44">
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

          <div className="grid gap-2 w-36">
            <Label>Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="started_at">Started At</SelectItem>
                <SelectItem value="ended_at">Ended At</SelectItem>
                <SelectItem value="call_duration_minutes">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 w-32">
            <Label>Order</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleApplyFilters} disabled={!selectedAssistant || loading} className="shrink-0 gap-2 h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            Apply
          </Button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-6 relative">
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
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No call logs found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => (
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
                          <audio controls src={log.recording_path} className="h-8 w-48" preload="none" />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No recording</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={!log.transcripts || log.transcripts.length === 0}
                          onClick={() => setSelectedTranscripts(log.transcripts)}
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
              <div className="p-4 border-t border-border/50 flex items-center justify-between bg-card/30">
                <span className="text-sm text-muted-foreground">
                  Showing {logs.length} of {totalLogs} logs
                </span>
                <div className="flex items-center gap-2">
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
      <Dialog open={!!selectedTranscripts} onOpenChange={(open) => !open && setSelectedTranscripts(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Call Transcript
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4 bg-muted/20 rounded-md border">
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
    </div>
  );
}