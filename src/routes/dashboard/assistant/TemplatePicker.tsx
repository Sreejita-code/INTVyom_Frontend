import { useEffect, useState } from "react";
import { LayoutTemplate, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AssistantTemplate,
  callGetTemplateEndpoint,
  callListTemplatesEndpoint,
} from "@/services/assistant/assistantService";

interface TemplatePickerProps {
  /** Receives the template's configuration; the caller keeps the name and prompt already typed. */
  onApply: (configuration: Record<string, unknown>) => void;
}

/** "Start from a template" for a new assistant. Hidden when the backend offers none. */
export function TemplatePicker({ onApply }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<AssistantTemplate[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callListTemplatesEndpoint().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const apply = async (id: string) => {
    setApplying(id);
    setError(null);
    try {
      onApply(await callGetTemplateEndpoint(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(null);
    }
  };

  if (templates.length === 0) return null;

  return (
    <section aria-label="Start from a template" className="glass rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Start from a template</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Fills in the mode and the model, voice and transcriber settings. Your name and prompt stay as typed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <Button
            key={t.id}
            variant="outline"
            onClick={() => apply(t.id)}
            disabled={applying !== null}
            aria-label={t.name}
            className="h-auto min-w-0 flex-col items-start gap-1 whitespace-normal p-3 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {applying === t.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.name}
            </span>
            <span className="text-xs font-normal text-muted-foreground">{t.description}</span>
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
