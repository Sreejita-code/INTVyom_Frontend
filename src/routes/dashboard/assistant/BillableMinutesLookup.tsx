import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  callAssistantBillableMinutesEndpoint,
  condenseBillableMinutesResponse,
} from "@/services/assistant/assistantService";

/** Billable minutes this assistant has spent calling one number. The backend requires the number. */
export function BillableMinutesLookup({ assistantId }: { assistantId: string }) {
  const [toNumber, setToNumber] = useState("");
  const [minutes, setMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMinutes(null);
    try {
      const json = await callAssistantBillableMinutesEndpoint({ assistantId, toNumber: toNumber.trim() });
      setMinutes(condenseBillableMinutesResponse(json));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={lookUp} className="space-y-3">
      <p className="text-sm font-medium text-foreground">Billable minutes for a number</p>
      <div className="flex gap-2">
        <Input
          type="tel"
          aria-label="Phone number"
          placeholder="+919876543210"
          value={toNumber}
          onChange={(e) => setToNumber(e.target.value)}
          className="font-mono"
        />
        <Button type="submit" variant="outline" disabled={loading || !toNumber.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
        </Button>
      </div>
      {minutes !== null && (
        <p role="status" className="text-sm text-foreground">
          <span className="font-mono">{minutes}</span> billable minutes
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
