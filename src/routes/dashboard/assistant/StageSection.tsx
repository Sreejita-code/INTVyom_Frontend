import { ReactNode } from "react";
import { CornerDownRight, LucideIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * Radix mirrors the *selected* `SelectItem`'s children into the trigger. Our items are two lines —
 * a label and a tagline — and the trigger is a fixed 40px tall, so the tagline used to spill out of
 * it. Hiding the tagline in the trigger keeps the dropdown's two-line items and the trigger's one.
 */
export const TRIGGER_ONE_LINE = "[&_[data-tagline]]:hidden";

interface StageSectionProps {
  /** Position in the audio path — the sections really are a sequence, so they are numbered. */
  step: number;
  title: string;
  /** One line under the title saying what this stage does on a real call. */
  blurb?: string;
  icon: LucideIcon;
  /** Live summary of the current selection, one chip per part. */
  summary: string[];
  /**
   * A side channel rather than a step in the chain — drawn hanging off the stage above it, with an
   * elbow instead of a number. Used for the pipeline transcript tap, which does not sit between the
   * caller and the model: the model hears the audio itself and the tap only writes the transcript.
   */
  nested?: boolean;
  /** A real trap on a live stage — the selection saves but does something else at call time. */
  warn?: string;
  /** Something worth knowing that is not a problem. Quieter than `warn`, and never amber. */
  note?: string;
  /** Last stage in the chain — its rail does not continue downward. */
  last?: boolean;
  children: ReactNode;
  advanced?: ReactNode;
  advancedCount?: number;
}

/**
 * One stage of the audio path, hung off a vertical rail.
 *
 * A call runs speech in, model, speech out, and which of those actually exist depends on the mode —
 * so the caller decides which stages to render at all. Nothing is drawn greyed out to represent a
 * stage the mode does not run: a locked box that looks adjustable teaches the wrong mental model of
 * the chain, which is the thing this screen exists to communicate.
 */
export function StageSection({
  step,
  title,
  blurb,
  icon: Icon,
  summary,
  nested,
  warn,
  note,
  last,
  children,
  advanced,
  advancedCount = 0,
}: StageSectionProps) {
  return (
    <section className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-x-5">
      {/* Rail */}
      <div className="relative flex flex-col items-center" aria-hidden="true">
        {nested ? (
          <span className="flex h-8 w-8 items-center justify-center text-muted-foreground/60">
            <CornerDownRight className="h-4 w-4" />
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-xs font-bold text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.05)]">
            {step}
          </span>
        )}
        {!last && (
          <span
            className={cn(
              "mt-3 w-px flex-1",
              nested
                ? "bg-[linear-gradient(to_bottom,hsl(var(--border))_50%,transparent_50%)] bg-[length:1px_9px]"
                : "bg-gradient-to-b from-primary/30 to-border",
            )}
          />
        )}
      </div>

      {/* Body */}
      <div className={cn("min-w-0", nested ? "pb-12 pt-1" : "pb-12")}>
        <header className="grid gap-3 pb-4">
          <div className="grid min-w-0 gap-1">
            <h3
              className={cn(
                "flex min-w-0 items-center gap-2.5 font-semibold tracking-tight",
                nested ? "text-[0.9375rem] text-muted-foreground" : "text-[1.0625rem]",
              )}
            >
              <Icon
                className={cn("h-[1.125rem] w-[1.125rem] shrink-0", nested ? "text-muted-foreground" : "text-primary")}
              />
              <span className="min-w-0 break-words">{title}</span>
            </h3>
            {blurb && <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">{blurb}</p>}
          </div>

          {summary.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {summary.map((part, index) => (
                // `title` keeps the full value reachable: a voice id is a 36-character UUID that
                // would otherwise be the widest thing on the page.
                <span
                  key={`${part}-${index}`}
                  title={part}
                  className="max-w-full truncate rounded-md border border-border/50 bg-background/60 px-2 py-1 font-mono text-[11px] leading-none text-muted-foreground"
                >
                  {part}
                </span>
              ))}
            </div>
          )}
        </header>

        {warn && (
          <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3 text-[0.8125rem] leading-6 text-amber-500/90">
            {warn}
          </p>
        )}

        {note && (
          <p className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-[0.8125rem] leading-6 text-muted-foreground">
            {note}
          </p>
        )}

        <div
          className={cn(
            "min-w-0 rounded-2xl border border-border/60 bg-card/60 px-5 py-1 sm:px-6",
            nested && "bg-card/40",
          )}
        >
          <div className="divide-y divide-border/40">
            {children}

            {advanced && (
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced" className="border-t-0">
                  <AccordionTrigger className="py-4">
                    Advanced{advancedCount > 0 && ` · ${advancedCount}`}
                  </AccordionTrigger>
                  <AccordionContent className="divide-y divide-border/40 pt-0">{advanced}</AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
