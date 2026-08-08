import { Braces } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractPlaceholders } from "@/lib/placeholders";

interface PromptEditorProps {
  prompt: string;
  startInstruction: string;
  onPromptChange: (value: string) => void;
  onStartInstructionChange: (value: string) => void;
}

/**
 * The prompt, and the opening line, and the variables they ask for.
 *
 * These three belong together: `{{...}}` placeholders in either field are filled from the same
 * `metadata` object at call time, and a placeholder you cannot see is a blank space in a live call.
 * Listing what the prompt asks for, right under the prompt, is the only feedback the platform gives
 * before the call happens — a missing key renders as an empty string with no error.
 */
export function PromptEditor({
  prompt,
  startInstruction,
  onPromptChange,
  onStartInstructionChange,
}: PromptEditorProps) {
  const placeholders = extractPlaceholders(prompt, startInstruction);

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-[1.0625rem] font-semibold tracking-tight">Prompt</h3>
        <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
          Who the assistant is and how it should handle the call. Everything else on this page is
          plumbing — this is the part callers actually notice.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label htmlFor="assistant-prompt" className="text-[0.9375rem] font-medium">
              System prompt <span className="text-primary">*</span>
            </Label>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {prompt.length.toLocaleString()} characters
            </span>
          </div>
          <Textarea
            id="assistant-prompt"
            placeholder="You are a support agent for Acme. Keep replies to one or two sentences…"
            className="min-h-[20rem] resize-y font-mono text-sm leading-relaxed"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
        </div>

        <div className="grid gap-2 border-t border-border/40 pt-4">
          <Label htmlFor="assistant-start" className="text-[0.9375rem] font-medium">
            Opening line
          </Label>
          <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
            What the assistant says first, used only when it speaks first. Leave it empty to let the
            model open on its own.
          </p>
          {/* A sentence, not a keyword — and it usually carries placeholders, which make it longer
              than it looks while you are writing it. */}
          <Textarea
            id="assistant-start"
            placeholder="Hi {{name}}, this is Sarah from Acme."
            className="min-h-[4rem] resize-y"
            value={startInstruction}
            onChange={(e) => onStartInstructionChange(e.target.value)}
          />
        </div>

        <div className="grid gap-2 border-t border-border/40 pt-4">
          <h4 className="flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <Braces className="h-3.5 w-3.5" />
            Variables
          </h4>

          {placeholders.length === 0 ? (
            <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
              Write <code className="font-mono text-foreground/80">{"{{name}}"}</code> anywhere above
              to fill it in per call. Values come from the call's metadata, which you set on the Make
              a Call page or in your own API request.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {placeholders.map((p) => (
                  <span
                    key={p.path}
                    title={p.optional ? "Used inside a {{#…}} block — safe to leave empty" : "Renders as an empty string if the call does not supply it"}
                    className="max-w-full truncate rounded-md border border-border/60 bg-background/60 px-2 py-1 font-mono text-[11px] leading-none text-foreground/80"
                  >
                    {`{{${p.path}}}`}
                    {p.optional && <span className="ml-1.5 text-muted-foreground">optional</span>}
                  </span>
                ))}
              </div>
              <p className="max-w-prose text-[0.8125rem] leading-6 text-muted-foreground">
                Each call fills these from its metadata. Send the value flat and write{" "}
                <code className="font-mono text-foreground/80">{"{{name}}"}</code>; send it nested and
                write <code className="font-mono text-foreground/80">{"{{customer.name}}"}</code>. A
                key the call does not supply renders as an empty string — no error, no fallback.
                Platform fields such as{" "}
                <code className="font-mono text-foreground/80">{"{{call.to_number}}"}</code> are
                always available and are not listed here.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
