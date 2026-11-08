import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RequestSpec,
  SNIPPET_LANGUAGES,
  SNIPPET_LANGUAGE_LABELS,
  SnippetLanguage,
  SnippetOptions,
  renderSnippet,
} from "@/lib/apiSnippet";

interface SnippetPanelProps {
  spec: RequestSpec;
  options: SnippetOptions;
  language: SnippetLanguage;
  onLanguageChange: (language: SnippetLanguage) => void;
  copied: boolean;
  onCopy: () => void;
  /** Fills the space the parent gives it (the sheet without a footer); otherwise a fixed height. */
  fill?: boolean;
}

/** Language tabs, copy button and the rendered snippet for one request. Presentational only. */
export const SnippetPanel = ({
  spec,
  options,
  language,
  onLanguageChange,
  copied,
  onCopy,
  fill = true,
}: SnippetPanelProps) => (
  <Tabs
    value={language}
    onValueChange={(value) => onLanguageChange(value as SnippetLanguage)}
    className={fill ? "flex-1 min-h-0 flex flex-col" : "flex flex-col"}
  >
    <div className="flex items-center justify-between gap-2 px-4 md:px-6 pt-4">
      <TabsList>
        {SNIPPET_LANGUAGES.map((item) => (
          <TabsTrigger key={item} value={item}>
            {SNIPPET_LANGUAGE_LABELS[item]}
          </TabsTrigger>
        ))}
      </TabsList>
      <Button variant="outline" size="sm" onClick={onCopy}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>

    {SNIPPET_LANGUAGES.map((item) => (
      <TabsContent
        key={item}
        value={item}
        className={`mt-4 px-4 md:px-6 pb-4 data-[state=inactive]:hidden${fill ? " flex-1 min-h-0" : ""}`}
      >
        <ScrollArea className={`rounded-lg border border-border bg-background ${fill ? "h-full" : "h-[24rem]"}`}>
          <pre className="p-4 text-xs font-mono leading-relaxed text-foreground">
            {renderSnippet(item, spec, options)}
          </pre>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </TabsContent>
    ))}
  </Tabs>
);
