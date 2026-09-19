import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Link2, Loader2, MonitorPlay, Terminal } from "lucide-react";

import { ApiSnippetButton } from "@/components/common/ApiSnippet";
import { Button } from "@/components/ui/button";
import { CopyIdButton } from "@/components/common/CopyIdButton";
import { getStoredUser } from "@/services/storage/storageService";
import { callGetApiKeysEndpoint, condenseGetApiKeysResponse, ApiKeyData } from "@/services/auth/authService";
import { useToast } from "@/hooks/use-toast";
import { developerActions } from "./developerActions";
import { WebCallClientGuide } from "./WebCallClientGuide";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://<your-backend>";

const maskValue = (value: string) =>
  value.length > 8 ? `${value.substring(0, 4)}••••••••••••${value.substring(value.length - 4)}` : value;

interface SecretRowProps {
  label: string;
  value: string;
  /** Secrets are masked until revealed; a base URL is not a secret and shows in full. */
  secret?: boolean;
}

const SecretRow = ({ label, value, secret }: SecretRowProps) => {
  const [visible, setVisible] = useState(false);
  const shown = !secret || visible ? value : maskValue(value);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <CopyIdButton value={value} displayValue={shown} label={label} className="w-full [&>code]:flex-1 [&>code]:text-sm [&>code]:text-foreground" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {secret && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? `Hide ${label}` : `Show ${label}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Developer = () => {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchKeys = async () => {
      if (!user?.user_name) {
        setLoading(false);
        return;
      }
      try {
        const data = await callGetApiKeysEndpoint(user.user_name);
        setKeys(condenseGetApiKeysResponse(data));
      } catch {
        toast({
          title: "Error",
          description: "Failed to fetch API keys",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, []);

  return (
    <div className="page-shell overflow-auto">
      <div className="page-padding max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Your API Keys</h2>
              <p className="text-sm text-muted-foreground">
                Copy the IDs and keys your code needs. Each box says what it is and where you use it.
              </p>
            </div>
          </div>

          <section aria-label="Which ID or key do I need" className="glass rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Which ID or key do I need?</h3>
            <ul className="grid gap-2 sm:grid-cols-2 text-xs">
              <li className="rounded-md border border-border/60 bg-muted/20 p-3">
                <span className="status-chip status-chip-info">User ID</span>
                <p className="mt-2 text-muted-foreground">Who you are. Send as <code className="font-mono">user_id</code> on every API request. Find yours below.</p>
              </li>
              <li className="rounded-md border border-border/60 bg-muted/20 p-3">
                <span className="status-chip status-chip-neutral">Assistant ID</span>
                <p className="mt-2 text-muted-foreground">Which assistant runs. One per assistant — copy it from the Assistants page.</p>
              </li>
              <li className="rounded-md border border-border/60 bg-muted/20 p-3">
                <span className="status-chip status-chip-neutral">LiveKit key</span>
                <p className="mt-2 text-muted-foreground">Joins a voice room in the browser. Listed below next to your User ID.</p>
              </li>
              <li className="rounded-md border border-border/60 bg-muted/20 p-3">
                <span className="status-chip status-chip-warning">Provider key</span>
                <p className="mt-2 text-muted-foreground">Pays OpenAI, Gemini, ElevenLabs, etc. Stored on the Provider Keys page, never pasted here.</p>
              </li>
            </ul>
          </section>

          <section className="glass rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Backend address · Base URL</h3>
              <span className="status-chip status-chip-neutral">Not a secret</span>
            </div>
            <SecretRow label="Backend address (Base URL)" value={backendUrl} />
            <p className="text-xs text-muted-foreground">
              What: where your backend lives. Where used: front of every API path below.
              Your User ID below is what identifies you — keep that server-side.
            </p>
          </section>

          <section className="glass rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Your account credentials</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Used for: every API request from your code. Assistant IDs live on the Assistants page —
              one per assistant, not per account.
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-10 glass rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : keys.length === 0 ? (
              <div className="glass rounded-lg p-4 space-y-2">
                {user?.user_id ? (
                  <>
                    <SecretRow label="User ID · who you are" value={user.user_id} secret />
                    <p className="text-xs text-muted-foreground">Used for: <code className="font-mono">user_id</code> on every API request.</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to see your credentials.</p>
                )}
              </div>
            ) : (
              keys.map((k, i) => (
                <div key={i} className="glass rounded-lg p-4 space-y-4">
                  <div className="space-y-1">
                    <SecretRow label="User ID · who you are" value={k.user_id} secret />
                    <p className="text-xs text-muted-foreground">Used for: <code className="font-mono">user_id</code> on every API request.</p>
                  </div>
                  <div className="space-y-1">
                    <SecretRow label="LiveKit API key · joins voice rooms" value={k.api_key} secret />
                    <p className="text-xs text-muted-foreground">Used for: connecting to a voice room in the browser. Not the same as an assistant ID.</p>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="glass rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Actions</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Reference requests with example values. The same button sits next to the real action
              on each page, where it shows the exact payload you have configured.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {developerActions.map((action) => {
                const preview = action.buildSpec("");
                return (
                  <div
                    key={preview.id + action.name}
                    className="glass rounded-lg p-4 flex flex-col gap-3 min-w-0"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{action.name}</p>
                      <p className="text-xs text-muted-foreground">{action.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="status-chip status-chip-neutral shrink-0">
                        {preview.method}
                      </span>
                      <code className="text-xs font-mono text-muted-foreground truncate">
                        {preview.path}
                      </code>
                    </div>
                    <ApiSnippetButton
                      buildSpec={action.buildSpec}
                      label={action.name}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View request
                    </ApiSnippetButton>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="glass rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <MonitorPlay className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Receive the call in your frontend
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              The token above is half of a web call. These samples take it from there — connect to
              the room, play the assistant, type to it, and render the transcript as it is spoken.
            </p>
            <WebCallClientGuide />
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default Developer;
