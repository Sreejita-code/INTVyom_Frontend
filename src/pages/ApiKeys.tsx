import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyData {
  api_key: string;
}

const ApiKeys = () => {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Record<number, boolean>>({});
  const user = getStoredUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchKeys = async () => {
      if (!user?.user_name) return;
      try {
        const res = await fetch(
          `http://localhost:3000/api/auth/get_api?user_name=${encodeURIComponent(user.user_name)}`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setKeys(data);
        } else if (data.api_key) {
          setKeys([data]);
        }
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

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied!", description: "API key copied to clipboard" });
  };

  const toggleVisibility = (index: number) => {
    setVisible((v) => ({ ...v, [index]: !v[index] }));
  };

  const maskKey = (key: string) =>
    key.substring(0, 4) + "••••••••••••" + key.substring(key.length - 4);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Manage your API keys for integration
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No API keys found
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <code className="text-sm font-mono text-foreground flex-1 truncate">
                  {visible[i] ? k.api_key : maskKey(k.api_key)}
                </code>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleVisibility(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {visible[i] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyKey(k.api_key)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ApiKeys;
