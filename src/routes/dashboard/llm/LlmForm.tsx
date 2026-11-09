import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AssistantPicker } from "@/components/common/AssistantPicker";
import { OptionalConfiguration } from "@/components/common/OptionalConfiguration";
import { ProviderKeyField } from "@/components/common/ProviderKeyField";
import { SuggestionInput } from "@/components/common/SuggestionInput";
import type { ChatMessage, ChatRole, LlmProvider } from "@/types/llm";
import { llmBlockReason, llmModelOptions } from "./llmRules";

const DEFAULT_PROVIDER = "__default__";

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

const ROLES: ChatRole[] = ["system", "user", "assistant"];

export function LlmForm({
  values,
  onChange,
  onSend,
  onStop,
  busy,
}: LlmFormProps) {
  const blocked = llmBlockReason(values);
  const sendRef = useRef<HTMLButtonElement>(null);
  const stopped = useRef(false);
  const setMessage = (index: number, patch: Partial<ChatMessage>) =>
    onChange({
      messages: values.messages.map((message, i) =>
        i === index ? { ...message, ...patch } : message,
      ),
    });

  // After a Stop, focus returns to the send control so retrying needs no tabbing.
  useEffect(() => {
    if (!busy && stopped.current) {
      stopped.current = false;
      sendRef.current?.focus();
    }
  }, [busy]);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!blocked && !busy) onSend();
      }}
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key === "Enter" &&
          !blocked &&
          !busy
        )
          onSend();
      }}
    >
      <section
        role="group"
        aria-label="Conversation"
        className="space-y-4 rounded-lg border border-border/60 bg-card/20 p-4"
      >
        <h2 className="text-sm font-medium text-foreground">Conversation</h2>
        {values.messages.map((message, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <Select
              value={message.role}
              onValueChange={(role) =>
                setMessage(index, { role: role as ChatRole })
              }
            >
              <SelectTrigger aria-label={`Message ${index + 1} role`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              aria-label={`Message ${index + 1} content`}
              rows={3}
              value={message.content}
              onChange={(event) =>
                setMessage(index, { content: event.target.value })
              }
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                messages: [...values.messages, { role: "user", content: "" }],
              })
            }
          >
            Add message
          </Button>
          <span className="text-xs text-muted-foreground">
            Ctrl or Cmd + Enter sends.
          </span>
        </div>
        {blocked ? (
          <p className="text-xs text-muted-foreground">{blocked}</p>
        ) : null}
        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          {busy ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopped.current = true;
                onStop();
              }}
              aria-label="Stop"
            >
              Stop
            </Button>
          ) : (
            <Button ref={sendRef} type="submit" disabled={Boolean(blocked)}>
              Send
            </Button>
          )}
          {busy && !values.stream ? (
            <span role="status" className="text-sm text-muted-foreground">
              Waiting for the reply…
            </span>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-medium text-foreground">Generation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="llm-provider">Provider</Label>
            <Select
              value={values.provider || DEFAULT_PROVIDER}
              onValueChange={(next) =>
                onChange({
                  provider:
                    next === DEFAULT_PROVIDER ? "" : (next as LlmProvider),
                })
              }
            >
              <SelectTrigger id="llm-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_PROVIDER}>
                  Default (OpenAI)
                </SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SuggestionInput
            id="llm-model"
            label="Model"
            value={values.model}
            options={llmModelOptions(values.provider)}
            onChange={(model) => onChange({ model })}
            mono
          />
          <div className="space-y-2">
            <Label htmlFor="llm-temperature">Temperature</Label>
            <Input
              id="llm-temperature"
              aria-label="Temperature"
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={values.temperature}
              onChange={(event) =>
                onChange({ temperature: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
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
      </section>

      <OptionalConfiguration
        active={Boolean(values.assistantId || values.providerKey)}
      >
        <AssistantPicker
          value={values.assistantId}
          onChange={(assistantId) => onChange({ assistantId })}
        />
        <ProviderKeyField
          value={values.providerKey}
          onChange={(providerKey) => onChange({ providerKey })}
        />
      </OptionalConfiguration>
    </form>
  );
}
