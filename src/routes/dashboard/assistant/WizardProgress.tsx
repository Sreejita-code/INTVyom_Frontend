import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, ListChecks, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callGetWizardStepEndpoint,
  callListWizardStepsEndpoint,
  callValidateWizardStepEndpoint,
  callWizardNavigationEndpoint,
  callWizardStatusEndpoint,
  condenseWizardNavigationResponse,
  condenseWizardStatusResponse,
  condenseWizardStepResponse,
  condenseWizardStepsResponse,
  condenseWizardValidationResponse,
} from "@/services/assistant/assistantService";
import {
  WizardNavigation,
  WizardStatus,
  WizardStep,
  WizardStepDetail,
  WizardStepValidation,
} from "@/types/assistant";

/** Waits for typing to settle, so one keystroke is not four requests. */
const DEBOUNCE_MS = 600;

interface WizardProgressProps {
  /** The create payload for the form as it stands, in the API's own field names. */
  draft: Record<string, unknown>;
}

interface WizardView {
  steps: WizardStep[];
  status: WizardStatus;
  detail: WizardStepDetail | null;
  navigation: WizardNavigation | null;
}

/**
 * The backend's own view of how far along a new assistant is: which builder steps apply to the
 * chosen mode (`tts` and `stt` drop out for realtime and duplex), which of them are complete, the
 * rules for the step you are looking at, and a dry-run check of just that step.
 *
 * Advisory only. It reads the form and never writes to it — the editor below stays the one place
 * a value is changed. If the helper endpoints fail the panel simply is not drawn.
 */
export function WizardProgress({ draft }: WizardProgressProps) {
  const [view, setView] = useState<WizardView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ stepId: string; result: WizardStepValidation } | null>(null);
  const [checking, setChecking] = useState(false);

  const draftKey = JSON.stringify(draft);

  useEffect(() => {
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const [steps, status] = await Promise.all([
          callListWizardStepsEndpoint(draft).then(condenseWizardStepsResponse),
          callWizardStatusEndpoint(draft).then(condenseWizardStatusResponse),
        ]);
        // Default to the first step still to do, so the panel opens on what needs attention.
        const activeId =
          steps.find((s) => s.id === selectedId)?.id ?? steps.find((s) => !status[s.id])?.id ?? steps[0]?.id ?? null;
        const [detail, navigation] = activeId
          ? await Promise.all([
              callGetWizardStepEndpoint(activeId, draft).then(condenseWizardStepResponse),
              callWizardNavigationEndpoint(activeId, draft).then(condenseWizardNavigationResponse),
            ])
          : [null, null];
        if (stale) return;
        if (activeId !== selectedId) setSelectedId(activeId);
        setView({ steps, status, detail, navigation });
      } catch {
        if (!stale) setView(null);
      }
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // `draft` is covered by `draftKey`; depending on the object would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, selectedId]);

  if (!view || view.steps.length === 0) return null;

  const done = view.steps.filter((s) => view.status[s.id]).length;
  const active = view.steps.find((s) => s.id === selectedId);

  const check = async () => {
    if (!active) return;
    setChecking(true);
    try {
      const stepData = Object.fromEntries(active.fields.filter((f) => f in draft).map((f) => [f, draft[f]]));
      const result = await callValidateWizardStepEndpoint(active.id, { stepData, currentConfig: draft }).then(
        condenseWizardValidationResponse,
      );
      setValidation({ stepId: active.id, result });
    } catch {
      setValidation(null);
    } finally {
      setChecking(false);
    }
  };

  const select = (id: string) => {
    setValidation(null);
    setSelectedId(id);
  };

  const rules = Object.entries(view.detail?.rules ?? {});
  const shownValidation = validation?.stepId === active?.id ? validation?.result : null;

  return (
    <section aria-label="Guided setup" className="glass space-y-3 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Guided setup</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {done} of {view.steps.length} steps complete
        </span>
      </div>

      <ol aria-label="Builder steps" className="flex flex-wrap gap-2">
        {view.steps.map((step) => {
          const complete = view.status[step.id];
          return (
            <li key={step.id}>
              <Button
                type="button"
                variant={step.id === selectedId ? "secondary" : "outline"}
                size="sm"
                aria-current={step.id === selectedId ? "step" : undefined}
                onClick={() => select(step.id)}
                className="gap-1.5"
              >
                {complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-label="Complete" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-label="Not complete" />
                )}
                {step.title}
              </Button>
            </li>
          );
        })}
      </ol>

      {active && (
        <div className="space-y-3 rounded-md border border-border/60 bg-background/40 p-3">
          <p className="text-xs leading-5 text-muted-foreground">{active.description}</p>

          {rules.length > 0 && (
            <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
              {rules.map(([field, rule]) => (
                <li key={field}>
                  <span className="font-mono text-foreground/80">{field}</span>
                  {rule.required ? " · required" : ""}
                  {rule.allowedValues.length > 0 ? ` · one of ${rule.allowedValues.join(", ")}` : ""}
                </li>
              ))}
            </ul>
          )}

          {(view.detail?.providers.length ?? 0) > 0 && (
            <p className="text-xs leading-5 text-muted-foreground">
              Providers for this mode: {view.detail?.providers.map((p) => p.label).join(", ")}.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={check} disabled={checking}>
              {checking && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Check this step
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!view.navigation?.previous}
              onClick={() => view.navigation?.previous && select(view.navigation.previous.id)}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              {view.navigation?.previous?.title ?? "Previous"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!view.navigation?.next}
              onClick={() => view.navigation?.next && select(view.navigation.next.id)}
            >
              {view.navigation?.next?.title ?? "Next"}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          {shownValidation && (
            <p
              role={shownValidation.isValid ? "status" : "alert"}
              className={cn("text-xs leading-5", shownValidation.isValid ? "text-primary" : "text-destructive")}
            >
              {shownValidation.isValid ? "This step is valid." : shownValidation.errors.join(" ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
