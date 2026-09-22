import { ReactNode, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";

import { Button, ButtonProps } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  API_KEY_PLACEHOLDER,
  RequestSpec,
  SNIPPET_LANGUAGES,
  SNIPPET_LANGUAGE_LABELS,
  SnippetLanguage,
  buildRequestUrl,
  renderSnippet,
} from "@/lib/apiSnippet";
import { getStoredUser } from "@/services/storage/storageService";

interface ApiSnippetButtonProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  /** Builds the request from the values currently on screen. */
  buildSpec: () => RequestSpec;
  /** Tooltip and accessible name for the trigger. */
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
  /** Rendered under the snippet. The web call uses it for what the browser does with the token. */
  footer?: ReactNode;
  /** Heading for `footer`. */
  footerTitle?: string;
}

// A blank env var would render a relative URL, which is not runnable when pasted into a shell.
const backendUrl = () => import.meta.env.VITE_BACKEND_URL || "https://<your-backend>";

export const ApiSnippetButton = ({
  buildSpec,
  label = "View as API request",
  children,
  disabled,
  footer,
  footerTitle,
  variant = "ghost",
  size,
  className,
}: ApiSnippetButtonProps) => {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const [revealSecrets, setRevealSecrets] = useState(false);
  const { copied, copy } = useCopyToClipboard(1500);
  const { toast } = useToast();
  const user = getStoredUser();

  // Only built while the sheet is open: the builders do real work (assistant payloads run the
  // provider validation), so calling one on every keystroke of a form would be wasteful and noisy.
  const spec = open ? buildSpec() : null;

  const options = {
    baseUrl: backendUrl(),
    apiKey: revealSecrets && user?.api_key ? user.api_key : API_KEY_PLACEHOLDER,
  };

  const copySnippet = async () => {
    if (!spec) return;
    const ok = await copy(renderSnippet(language, spec, options));
    if (!ok) toast({ variant: "destructive", title: "Error", description: "Could not copy the snippet" });
  };

  const trigger = children ? (
    <Button variant={variant} size={size} className={className} disabled={disabled}>
      <Code2 className="h-4 w-4 mr-2" />
      {children}
    </Button>
  ) : (
    <Button
      variant={variant}
      size={size ?? "icon"}
      className={className}
      disabled={disabled}
      aria-label={label}
    >
      <Code2 className="h-4 w-4" />
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-card border-border flex flex-col gap-0 p-0"
      >
        {spec && (
        <>
        <SheetHeader className="p-4 md:p-6 pb-4 border-b border-border space-y-3 text-left">
          <div>
            <SheetTitle className="text-lg font-semibold">{spec.title}</SheetTitle>
            {spec.note ? (
              <SheetDescription className="mt-2">{spec.note}</SheetDescription>
            ) : null}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="status-chip status-chip-info shrink-0">{spec.method}</span>
            <code className="text-xs font-mono text-muted-foreground truncate">
              {buildRequestUrl(spec, options)}
            </code>
          </div>
        </SheetHeader>

        {/* With a footer the whole body scrolls as one column; without one the snippet keeps
            growing to fill the sheet, the way it did before the footer existed. */}
        <div className={footer ? "flex-1 min-h-0 overflow-y-auto" : "contents"}>
        <Tabs
          value={language}
          onValueChange={(value) => setLanguage(value as SnippetLanguage)}
          className={footer ? "flex flex-col" : "flex-1 min-h-0 flex flex-col"}
        >
          <div className="flex items-center justify-between gap-2 px-4 md:px-6 pt-4">
            <TabsList>
              {SNIPPET_LANGUAGES.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {SNIPPET_LANGUAGE_LABELS[item]}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="outline" size="sm" onClick={copySnippet}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {SNIPPET_LANGUAGES.map((item) => (
            <TabsContent
              key={item}
              value={item}
              className={`mt-4 px-4 md:px-6 pb-4 data-[state=inactive]:hidden${
                footer ? "" : " flex-1 min-h-0"
              }`}
            >
              <ScrollArea
                className={`rounded-lg border border-border bg-background ${
                  footer ? "h-[24rem]" : "h-full"
                }`}
              >
                <pre className="p-4 text-xs font-mono leading-relaxed text-foreground">
                  {renderSnippet(item, spec, options)}
                </pre>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        {footer ? (
          <div className="border-t border-border p-4 md:p-6 space-y-3">
            {footerTitle ? (
              <h4 className="text-sm font-semibold text-foreground">{footerTitle}</h4>
            ) : null}
            {footer}
          </div>
        ) : null}
        </div>

        <div className="border-t border-border p-4 md:p-6 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Show my real API key</p>
              <p className="text-xs text-muted-foreground break-words">
                {!user?.api_key ? (
                  "No API key is stored for this session, so the snippet keeps the placeholder."
                ) : revealSecrets ? (
                  <span className="text-destructive">
                    The snippet now contains your real API key. Anyone who sees it can act as you — do
                    not paste it anywhere shared.
                  </span>
                ) : (
                  <>
                    Off, the <code className="font-mono">Authorization</code> header prints{" "}
                    <code className="font-mono">{API_KEY_PLACEHOLDER}</code>. Set that variable in your
                    shell, or turn this on to copy a runnable request.
                  </>
                )}
              </p>
            </div>
            <Switch
              checked={revealSecrets}
              onCheckedChange={setRevealSecrets}
              disabled={!user?.api_key}
              aria-label="Show my real API key"
            />
          </div>
        </div>
        </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ApiSnippetButton;
