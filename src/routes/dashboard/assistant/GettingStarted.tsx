import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Bot, Phone, PhoneIncoming, PhoneCall, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissOnboarding, isOnboardingDismissed } from "@/services/storage/storageService";

const steps = [
  {
    icon: Bot,
    title: "Create an assistant",
    helper: "Give it a voice and instructions — you are on this page.",
    path: "/dashboard/assistant",
    cta: "Open Assistants",
  },
  {
    icon: Phone,
    title: "Add a phone number",
    helper: "Connect Twilio or Exotel so people can call you.",
    path: "/dashboard/phone-number",
    cta: "Open Phone Numbers",
  },
  {
    icon: PhoneIncoming,
    title: "Route the number to your assistant",
    helper: "Decide which assistant answers each number.",
    path: "/dashboard/inbound",
    cta: "Open Inbound Routes",
  },
  {
    icon: PhoneCall,
    title: "Make a test call",
    helper: "Call a real number, then check what happened.",
    path: "/dashboard/make-call",
    cta: "Open Make a Call",
  },
  {
    icon: List,
    title: "Read the call logs",
    helper: "Every call leaves a transcript, recording and cost.",
    path: "/dashboard/call-logs",
    cta: "Open Call Logs",
  },
];

/**
 * First-run checklist shown until dismissed. Rendered once, on the Assistants
 * page empty state — the landing page after login.
 */
export function GettingStarted() {
  const [dismissed, setDismissed] = useState(isOnboardingDismissed);

  if (dismissed) return null;

  const handleDismiss = () => {
    dismissOnboarding();
    setDismissed(true);
  };

  return (
    <section
      aria-label="Get started checklist"
      className="relative z-10 mx-auto w-full max-w-xl rounded-xl border border-border/60 bg-card/40 p-4 md:p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">Get started in 5 steps</h3>
          <p className="text-xs text-muted-foreground mt-1">
            From a new assistant to your first real call. Each step opens the right page.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          aria-label="Dismiss getting started guide"
          className="h-7 w-7 shrink-0 mt-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex flex-col gap-2 rounded-lg border border-border/40 bg-background/60 p-2.5 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            >
              {i + 1}
            </span>
            <step.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{step.title}</span>
              <span className="block text-xs text-muted-foreground">{step.helper}</span>
            </span>
            </span>
            <Link
              to={step.path}
              className="shrink-0 self-start rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors sm:self-start sm:mt-1"
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
