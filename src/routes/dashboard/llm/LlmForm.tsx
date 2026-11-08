import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AssistantPicker } from "@/components/common/AssistantPicker";
import { ProviderKeyField } from "@/components/common/ProviderKeyField";
import type { ChatMessage, ChatRole, LlmProvider } from "@/types/llm";
import { llmBlockReason } from "./llmRules";

export interface LlmFormValues {
  messages: ChatMessage[];
  provider: LlmProvider | "";
  model: string;
  temperature: string;
  maxTokens: string;
  stream: boolean;
  assistantId: string;
  providerKey: string;
}

/** The first reason sending is blocked, or `null` when the form can be sent. */

interface LlmFormProps {
  values: LlmFormValues;
  onChange: (next: Partial<LlmFormValues>) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
}

export function LlmForm({ values, onChange, onSend, onStop, busy }: LlmFormProps) {
  const blocked = llmBlockReason(values);
  const setMessage = (index: number, patch: Partial<ChatMessage>) =>
    onChange({
      messages: values.messages.map((message, i) => (i === index ? { ...message, ...patch } : message)),
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!blocked && !busy) onSend();
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !blocked && !busy) onSend();
      }}
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Conversation</legend>
        {values.messages.map((message, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <div className="space-y-1">
              <Label htmlFor={`llm-role-${index}`} className="sr-only">
                {`Message ${index + 1} role`}
              </Label>
              <select
                id={`llm-role-${index}`}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={message.role}
                onChange={(event) => setMessage(index, { role: event.target.value as ChatRole })}
              >
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </div>
            <Textarea
              aria-label={`Message ${index + 1} content`}
              rows={3}
              value={message.content}
              onChange={(event) => setMessage(index, { content: event.target.value })}
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ messages: [...values.messages, { role: "user", content: "" }] })}
          >
            Add message
          </Button>
          <span className="text-xs text-muted-foreground">Ctrl or Cmd + Enter sends.</span>
        </div>
        {blocked ? <p className="text-xs text-muted-foreground">{blocked}</p> : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="llm-provider">Provider</Label>
          <select
            id="llm-provider"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.provider}
            onChange={(event) => onChange({ provider: event.target.value as LlmProvider | "" })}
          >
            <option value="">Default (openai)</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="llm-model">Model</Label>
          <Input id="llm-model" className="font-mono" value={values.model} onChange={(event) => onChange({ model: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="llm-temperature">Temperature</Label>
          <Input
            id="llm-temperature"
            aria-label="Temperature"
            type="number"
            step="0.1"
            min={0}
            max={2}
            value={values.temperature}
            onChange={(event) => onChange({ temperature: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="llm-max-tokens">Max tokens</Label>
          <Input
            id="llm-max-tokens"
            aria-label="Max tokens"
            type="number"
            min={1}
            value={values.maxTokens}
            onChange={(event) => onChange({ maxTokens: event.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="llm-stream">Stream the reply</Label>
        <Switch
          id="llm-stream"
          aria-label="Stream the reply"
          checked={values.stream}
          onCheckedChange={(stream) => onChange({ stream })}
        />
      </div>

      <AssistantPicker value={values.assistantId} onChange={(assistantId) => onChange({ assistantId })} />
      <ProviderKeyField value={values.providerKey} onChange={(providerKey) => onChange({ providerKey })} />

      <div className="flex items-center gap-3">
        {busy ? (
          <Button type="button" variant="outline" onClick={onStop} aria-label="Stop">
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={Boolean(blocked)}>
            Send
          </Button>
        )}
        {busy && !values.stream ? (
          <span role="status" className="text-sm text-muted-foreground">
            Waiting for the reply…
          </span>
        ) : null}
      </div>
    </form>
  );
}
