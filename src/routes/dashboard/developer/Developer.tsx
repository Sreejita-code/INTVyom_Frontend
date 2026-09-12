import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Eye, EyeOff, KeyRound, Link2, Loader2, Terminal } from "lucide-react";

import { ApiSnippetButton } from "@/components/common/ApiSnippet";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/services/storage/storageService";
import { callGetApiKeysEndpoint, condenseGetApiKeysResponse, ApiKeyData } from "@/services/auth/authService";
import { useToast } from "@/hooks/use-toast";
import { developerActions } from "./developerActions";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://<your-backend>";

const maskValue = (value: string) =>
  value.length > 8 ? `${value.substring(0, 4)}••••••••••••${value.substring(value.length - 4)}` : value;

interface SecretRowProps {
  label: string;
  value: string;
  /** Secrets are masked until revealed; a base URL is not a secret and shows in full. */
  secret?: boolean;
  onCopy: (value: string) => void;
}

const SecretRow = ({ label, value, secret, onCopy }: SecretRowProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="flex items-center justify-between gap-4">
        <code className="text-sm font-mono text-foreground flex-1 truncate">
          {!secret || visible ? value : maskValue(value)}
        </code>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(value)}
            aria-label={`Copy ${label}`}
            className="text-muted-foreground hover:text-primary"
          >
            <Copy className="h-4 w-4" />
          </Button>
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

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

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
              <h2 className="text-xl font-semibold text-foreground">Developer</h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to drive INTVoicekit from your own code.
              </p>
            </div>
          </div>

          <section className="glass rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Base URL</h3>
            </div>
            <SecretRow label="Backend" value={backendUrl} onCopy={copyValue} />
            <p className="text-xs text-muted-foreground">
              Every path below hangs off this origin. Requests identify you with your user ID —
              treat it like a credential and keep it server-side.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Your credentials</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 glass rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : keys.length === 0 ? (
              <div className="glass rounded-lg p-4 space-y-4">
                {user?.user_id ? (
                  <SecretRow label="User ID" value={user.user_id} secret onCopy={copyValue} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in to see your credentials.</p>
                )}
              </div>
            ) : (
              keys.map((k, i) => (
                <div key={i} className="glass rounded-lg p-4 space-y-4">
                  <SecretRow label="User ID" value={k.user_id} secret onCopy={copyValue} />
                  <SecretRow label="LiveKit API key" value={k.api_key} secret onCopy={copyValue} />
                </div>
              ))
            )}
          </section>

          <section className="space-y-3">
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
        </motion.div>
      </div>
    </div>
  );
};

export default Developer;
