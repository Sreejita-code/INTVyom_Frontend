import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { callListAssistantsEndpoint, condenseListAssistantsResponse } from "@/services/assistant/assistantService";

const NONE = "__none__";

interface AssistantPickerProps {
  value: string;
  onChange: (assistantId: string) => void;
}

/**
 * Optional assistant whose settings fill in the fields left blank. Loads through the data layer, so
 * an error can be retried without losing the rest of the page.
 */
export function AssistantPicker({ value, onChange }: AssistantPickerProps) {
  const query = useQuery({
    queryKey: ["playground-assistants"],
    queryFn: async () => {
      const res = await callListAssistantsEndpoint({ limit: 100 });
      if (!res.ok) throw new Error("Could not load assistants");
      return condenseListAssistantsResponse(res.json);
    },
  });

  const id = "playground-assistant";
  const label = <Label htmlFor={id}>Assistant (optional)</Label>;

  if (query.isError) {
    return (
      <div className="space-y-2">
        {label}
        <p role="alert" className="text-sm text-destructive">
          Could not load assistants. The page still works without one.
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const assistants = query.data ?? [];
  if (query.isSuccess && assistants.length === 0) {
    return (
      <div className="space-y-2">
        {label}
        <p className="text-sm text-muted-foreground">
          No assistants yet. Fields stay blank and the request uses the defaults.{" "}
          <Link className="underline" to="/dashboard/assistant">
            Create one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label}
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
        <SelectTrigger id={id} disabled={query.isLoading}>
          <SelectValue placeholder={query.isLoading ? "Loading assistants…" : "Use defaults"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Use defaults</SelectItem>
          {assistants.map((assistant) => (
            <SelectItem key={assistant.assistant_id} value={assistant.assistant_id}>
              {assistant.assistant_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value ? (
        <p className="text-xs text-muted-foreground">Blank fields use this assistant's settings.</p>
      ) : null}
    </div>
  );
}
