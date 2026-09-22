import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { WEB_CALL_CLIENT_STEPS } from "./webCallGuideSteps";

const livekitUrl = () => import.meta.env.VITE_LIVEKIT_URL || "wss://<your-livekit-server>";

/**
 * The browser half of a web call: what to do with the token the API just handed back.
 *
 * Shares the tab/copy shape with `ApiSnippet.tsx` and stays a separate copy on purpose — two call
 * sites is under this repo's extraction bar, and the two will diverge (this one has no request URL,
 * no language switch tied to the renderers, and no user-ID reveal).
 */
export const WebCallClientGuide = () => {
  const [step, setStep] = useState(WEB_CALL_CLIENT_STEPS[0].id);
  const { copied, copy } = useCopyToClipboard(1500);
  const { toast } = useToast();

  const active = WEB_CALL_CLIENT_STEPS.find((item) => item.id === step);

  const copyCode = async () => {
    if (!active) return;
    const ok = await copy(active.code);
    if (!ok) toast({ variant: "destructive", title: "Error", description: "Could not copy the sample" });
  };

  return (
    <div className="space-y-3">
      <div className="glass rounded-lg p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          LiveKit server URL
        </p>
        <code className="text-sm font-mono text-foreground break-all">{livekitUrl()}</code>
        <p className="text-xs text-muted-foreground">
          The token response does not carry this — connect the token to this URL.
        </p>
      </div>

      <Tabs value={step} onValueChange={setStep} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            {WEB_CALL_CLIENT_STEPS.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {WEB_CALL_CLIENT_STEPS.map((item) => (
          <TabsContent key={item.id} value={item.id} className="space-y-2 mt-0">
            <p className="text-xs text-muted-foreground">{item.summary}</p>
            <ScrollArea className="h-[22rem] rounded-lg border border-border bg-background">
              <pre className="p-4 text-xs font-mono leading-relaxed text-foreground">
                {item.code}
              </pre>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default WebCallClientGuide;
