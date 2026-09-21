import { useEffect, useState } from "react";
import { AlertCircle, Bot, Link2, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiSnippetButton } from "@/components/common/ApiSnippet";
import { MetadataEditor } from "@/components/common/MetadataEditor";
import { RequestSpec } from "@/lib/apiSnippet";
import { MetadataRow, metadataFrom, rawMetadataIsInvalid, rowsForPlaceholders } from "@/lib/callMetadata";
import { extractPlaceholders } from "@/lib/placeholders";
import { modeAccent } from "@/lib/assistantModes";
import { toastError } from "@/lib/toastError";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  callGetAssistantDetailsEndpoint,
  condenseAssistantDetailsResponse,
} from "@/services/assistant/assistantService";
import {
  callJoinMeetingEndpoint,
  condenseMeetingJoinResponse,
} from "@/services/meetingCall/meetingCallService";
import { AssistantItem } from "@/types/assistant";
import { MeetingJoinResult } from "@/types/meetingCall";
import { validateMeetingUrl } from "./meetingUrl";

/** The only platform the endpoint documents. Make it a select when a second one exists. */
const PLATFORM = "google_meet";

const PLACEHOLDER_METADATA_NOTE =
  "Keys in `metadata` fill the {{placeholders}} in the assistant's prompt and start instruction. Nest a value and you reference it with a dot.";

interface MeetingCallTabProps {
  assistants: AssistantItem[];
  assistantsLoading: boolean;
  userId: string | undefined;
}

export function MeetingCallTab({ assistants, assistantsLoading, userId }: MeetingCallTabProps) {
  const { toast } = useToast();

  const [assistantId, setAssistantId] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [botDisplayName, setBotDisplayName] = useState("");
  const [joining, setJoining] = useState(false);
  const [result, setResult] = useState<MeetingJoinResult | null>(null);

  const [rows, setRows] = useState<MetadataRow[]>([]);
  const [rawJson, setRawJson] = useState("");
  const [useRaw, setUseRaw] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);

  // Same prompt read as the agent-call tab in MakeCall.tsx — two copies, no abstraction.
  useEffect(() => {
    if (!userId || !assistantId) {
      setRows((prev) => prev.filter((row) => !row.fromPrompt));
      return;
    }

    let cancelled = false;
    setPromptLoading(true);
    (async () => {
      try {
        const { ok, json } = await callGetAssistantDetailsEndpoint({ userId, assistantId });
        if (cancelled || !ok) return;
        const detail = condenseAssistantDetailsResponse(json) as Record<string, string> | null;
        const placeholders = extractPlaceholders(detail?.assistant_prompt, detail?.assistant_start_instruction);
        setRows((prev) => rowsForPlaceholders(placeholders, prev));
      } catch {
        // A prompt we cannot read just means no prefilled rows; the caller can still add keys.
      } finally {
        if (!cancelled) setPromptLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assistantId, userId]);

  const meetingCallSpec = (specUserId: string): RequestSpec => {
    const metadata = metadataFrom(rows, rawJson, useRaw);
    const invalid = rawMetadataIsInvalid(rawJson, useRaw);
    return {
      id: "meetingCall.join",
      title: "Join a Google Meet call",
      note: invalid
        ? PLACEHOLDER_METADATA_NOTE +
          " Your raw JSON does not parse, so metadata is left out here — and the call would be refused."
        : PLACEHOLDER_METADATA_NOTE,
      method: "POST",
      path: "/api/meeting-call/join",
      body: {
        user_id: specUserId,
        assistant_id: assistantId || "<assistant_id>",
        meeting_url: meetingUrl.trim() || "https://meet.google.com/abc-defg-hij",
        platform: PLATFORM,
        ...(botDisplayName.trim() ? { bot_display_name: botDisplayName.trim() } : {}),
        ...(metadata ? { metadata } : {}),
      },
    };
  };

  const handleJoin = async () => {
    if (!userId) return;
    if (!assistantId) {
      toast({ variant: "destructive", title: "Select an agent" });
      return;
    }
    const url = validateMeetingUrl(meetingUrl);
    if (!url.ok) {
      toast({ variant: "destructive", title: "Invalid meeting link", description: url.message });
      return;
    }
    const metadata = metadataFrom(rows, rawJson, useRaw);
    if (useRaw && rawJson.trim() && !metadata) {
      toast({ variant: "destructive", title: "Metadata is not valid JSON", description: "Fix it, or switch back to rows." });
      return;
    }

    setJoining(true);
    try {
      const { ok, json } = await callJoinMeetingEndpoint({
        user_id: userId,
        assistant_id: assistantId,
        meeting_url: meetingUrl.trim(),
        platform: PLATFORM,
        ...(botDisplayName.trim() ? { bot_display_name: botDisplayName.trim() } : {}),
        ...(metadata ? { metadata } : {}),
      });
      if (ok) {
        toast({
          title: "Joining meeting",
          description: (json as { message?: string })?.message || "The bot is being dispatched to the meeting.",
        });
        setResult(condenseMeetingJoinResponse(json));
      } else {
        setResult(null);
        toast(toastError(json, "Failed to join meeting"));
      }
    } catch {
      setResult(null);
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to API" });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500">
        <AlertCircle className="h-5 w-5 shrink-0 mt-1" />
        <div>
          <p className="text-sm font-medium">The LiveKit connector service must be running</p>
          <p className="text-xs text-amber-500/70 mt-1">
            The bot is put into the meeting by the LiveKit connector service, and the assistant itself runs on
            the agent worker. If either one is down, this request still returns a room and dispatch IDs but
            nothing joins the meeting.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-primary" /> Choose Assistant
          </Label>
          <Select value={assistantId} onValueChange={setAssistantId}>
            <SelectTrigger disabled={assistantsLoading} className="bg-muted/30 border-border/50 h-11">
              <SelectValue placeholder={assistantsLoading ? "Loading assistants..." : "Choose an assistant..."} />
            </SelectTrigger>
            <SelectContent>
              {assistants.map((a) => (
                <SelectItem key={a.assistant_id || a._id} value={a.assistant_id || a._id}>
                  <span className="flex items-center gap-2">
                    <span className="truncate">{a.assistant_name || a.name || "Unnamed assistant"}</span>
                    <span
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
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Video className="h-3.5 w-3.5 text-primary" /> Bot display name
          </Label>
          <Input
            value={botDisplayName}
            onChange={(e) => setBotDisplayName(e.target.value)}
            placeholder="Meeting Assistant"
            className="bg-muted/30 border-border/50 h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-primary" /> Google Meet link
        </Label>
        <p className="text-xs text-muted-foreground">Paste the full invite link from Google Meet.</p>
        <div className="flex flex-col gap-3">
          <Input
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
            className="bg-muted/30 border-border/50 h-11 font-mono flex-1 min-w-0"
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <div className="flex gap-3">
          <Button
            onClick={handleJoin}
            disabled={joining || !assistantId || !meetingUrl.trim()}
            className="h-11 px-8 gap-2 flex-1 sm:flex-none shadow-lg shadow-primary/20 min-w-[140px]"
          >
            {joining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Video className="h-4 w-4" /> Join meeting
              </>
            )}
          </Button>
          <ApiSnippetButton
            buildSpec={meetingCallSpec}
            label="View this meeting join as an API request"
            className="h-11 w-11 shrink-0 border border-border/50"
          />
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="border-t border-border/50">
        <AccordionItem value="variables" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium normal-case tracking-normal text-foreground">Advanced · call variables</AccordionTrigger>
          <AccordionContent className="pt-1">
          <MetadataEditor
            rows={rows}
            onRowsChange={setRows}
            rawJson={rawJson}
            onRawJsonChange={setRawJson}
            useRaw={useRaw}
            onUseRawChange={setUseRaw}
            blurb={
              promptLoading
                ? "Reading this assistant's instructions…"
                : rows.some((r) => r.fromPrompt)
                  ? "The assistant's instructions ask for these details. Anything you leave empty is skipped in the meeting."
                  : "Optional extras for this meeting. If the assistant's instructions mention {{name}}, fill it in here and it shows up as a row."
            }
          />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {result && (
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-muted-foreground">Room</span>
            <span className="truncate font-mono text-xs text-foreground" title={result.roomName}>
              {result.roomName || "—"}
            </span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {result.platform || PLATFORM}
            </span>
          </div>
          {result.meetingUrl && (
            <p className="truncate font-mono text-xs text-muted-foreground" title={result.meetingUrl}>
              {result.meetingUrl}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Agent dispatch <span className="font-mono">{result.agentDispatchId || "—"}</span> · connector dispatch{" "}
            <span className="font-mono">{result.connectorDispatchId || "—"}</span>. The transcript lands in Call Logs.
          </p>
        </div>
      )}
    </div>
  );
}
