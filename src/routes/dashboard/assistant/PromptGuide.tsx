import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const TIPS: { title: string; body: string }[] = [
  {
    title: "Mix XML and Markdown",
    body: "Wrap each section in an XML tag (role, rules, flow) and use Markdown lists inside it. The tags give the model clear boundaries; the lists keep each section easy to scan.",
  },
  {
    title: "Keep it short",
    body: "Write the smallest prompt that gets the behaviour you want. Every extra paragraph is one more thing the model can follow badly.",
  },
  {
    title: "Say each thing once",
    body: "Write clear, direct instructions and do not repeat them in other sections. Duplicates drift apart when you edit one and forget the other, and then the model gets two answers.",
  },
  {
    title: "Write for the ear",
    body: "Callers hear the reply. Ask for one or two short sentences, and no lists, headings or emoji in what the assistant says.",
  },
  {
    title: "Use variables for per-call facts",
    body: "Put names, plans and dates in {{placeholders}} filled from call metadata, instead of writing them into the prompt.",
  },
];

const EXAMPLE = `<role>
You are Sarah, a support agent for Acme.
</role>

<rules>
- Reply in one or two short sentences.
- Ask one question at a time.
- If you do not know, offer a callback.
</rules>

<flow>
1. Greet {{name}} and ask how you can help.
2. Resolve the issue or book a callback.
3. Confirm and end the call.
</flow>`;

/**
 * A pop-over of prompting advice, beside the system prompt it is about. Static guidance only: it
 * never reads or writes the prompt, so it cannot change what a call does.
 */
export function PromptGuide() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5" />
          Prompt tips
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Tips for writing a system prompt"
        className="max-h-[min(32rem,70vh)] w-[min(26rem,calc(100vw-2rem))] space-y-4 overflow-y-auto p-4"
      >
        <p className="text-sm font-semibold">Writing a good system prompt</p>
        <ul className="space-y-3">
          {TIPS.map((tip) => (
            <li key={tip.title} className="space-y-1">
              <p className="text-[0.8125rem] font-medium">{tip.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{tip.body}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] font-medium">A starting shape</p>
          <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 p-3 font-mono text-[11px] leading-5">
            {EXAMPLE}
          </pre>
        </div>
      </PopoverContent>
    </Popover>
  );
}
