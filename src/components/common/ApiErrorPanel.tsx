import { AlertTriangle } from "lucide-react";

import type { ApiError } from "@/lib/apiError";

/** What the user can do next, per status. Statuses not listed use the backend message alone. */
const NEXT_STEP: Record<number, string> = {
  0: "Check your connection and try again. Your input is still here.",
  400: "Check the highlighted fields and try again.",
  401: "Your session expired. Sign in again.",
  404: "The assistant you picked is not on this account. Choose another, or leave it blank.",
  413: "This file is over the 25 MB limit. Choose a smaller file.",
  422: "The provider or model rejected the request. Change the option and try again.",
  502: "The provider did not answer. Try again in a moment.",
};

interface ApiErrorPanelProps {
  error: ApiError;
}

/** A failed request: the backend message, its suggestions, and the next step. Announced as an alert. */
export function ApiErrorPanel({ error }: ApiErrorPanelProps) {
  const suggestions = Object.entries(error.suggestions);
  const next = NEXT_STEP[error.status];
  return (
    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-2">
      <p className="flex items-start gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{error.message}</span>
      </p>
      {suggestions.length > 0 ? (
        <ul className="list-disc pl-6 text-sm text-foreground space-y-1">
          {suggestions.map(([slot, hint]) => (
            <li key={slot}>{hint}</li>
          ))}
        </ul>
      ) : null}
      {next ? <p className="text-sm text-muted-foreground">{next}</p> : null}
    </div>
  );
}
