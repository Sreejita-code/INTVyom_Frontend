import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredUser } from "@/services/storage/storageService";
import {
  callGetIntegrationEndpoint,
  callResyncIntegrationEndpoint,
  callResyncStatusEndpoint,
  callStoreIntegrationEndpoint,
} from "@/services/integration/integrationService";
import { IntegrationData, ResyncData } from "@/types/integration";
import { toast } from "sonner";
import { Link2, Mic2, Eye, EyeOff, ShieldCheck, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Integrations = () => {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [connectedServices, setConnectedServices] = useState<IntegrationData[]>([]);
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
    const [resync, setResync] = useState<{ [service: string]: ResyncData }>({});
    const timers = useRef<{ [service: string]: ReturnType<typeof setTimeout> }>({});
    const user = getStoredUser();

    const pollResync = async (service: string) => {
        if (!user?.user_id) return;
        // drop any pending poll for this service so we never stack concurrent pollers
        if (timers.current[service]) clearTimeout(timers.current[service]);
        try {
            const { ok, json } = await callResyncStatusEndpoint({ userId: user.user_id, serviceName: service });
            if (!ok) {
                // no re-sync has run for this (user, service) yet — nothing to sync
                setResync(prev => { const n = { ...prev }; delete n[service]; return n; });
                return;
            }
            if (!json.success || !json.data) return;
            const data: ResyncData = json.data;
            setResync(prev => ({ ...prev, [service]: data }));
            if (data.status === "running") {
                timers.current[service] = setTimeout(() => pollResync(service), 2000);
            }
        } catch (error) {
            console.error(`Error polling resync for ${service}:`, error);
        }
    };

    const handleResync = async (service: string) => {
        if (!user?.user_id) return;
        try {
            const json = await callResyncIntegrationEndpoint({ user_id: user.user_id, service_name: service });
            if (json.success) {
                setResync(prev => ({ ...prev, [service]: { status: "running", processed: 0 } }));
                pollResync(service);
            } else {
                toast.error(json.error || "Failed to start re-sync");
            }
        } catch (error) {
            toast.error("An error occurred while starting re-sync");
        }
    };

    // clear pending pollers on unmount
    useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

    // UPDATED: Added "openai" to the list of available providers
    const providers = ["cartesia", "sarvam", "elevenlabs", "mistral", "gemini", "openai"];

    const fetchIntegrations = async () => {
        if (!user?.user_id) return;
        const results: IntegrationData[] = [];

        for (const provider of providers) {
            try {
                const data = await callGetIntegrationEndpoint({ userId: user.user_id, serviceName: provider });
                if (data.success && data.data) {
                    results.push(data.data);
                }
            } catch (error) {
                console.error(`Error fetching ${provider} integration:`, error);
            }
        }
        setConnectedServices(results);
        // resume any re-sync job still running after a reload (404 = no-op for idle providers)
        results.forEach(s => pollResync(s.service_name));
    };

    useEffect(() => {
        fetchIntegrations();
    }, [user?.user_id]);

    const handleSave = async () => {
        if (!user?.user_id || !selectedProvider || !apiKey) {
            toast.error("Please provide an API key");
            return;
        }

        setIsLoading(true);
        try {
            const data = await callStoreIntegrationEndpoint({
                user_id: user.user_id,
                service_name: selectedProvider,
                api_key: apiKey,
            });

            if (data.success) {
                toast.success(data.message);
                const savedProvider = selectedProvider;
                setApiKey("");
                setSelectedProvider(null);
                fetchIntegrations();
                if (data.resync?.status === "running") {
                    setResync(prev => ({ ...prev, [savedProvider]: { status: "running", processed: 0 } }));
                    pollResync(savedProvider);
                }
            } else {
                toast.error(data.error || "Failed to save integration");
            }
        } catch (error) {
            toast.error("An error occurred while saving integration");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleKeyVisibility = (serviceName: string) => {
        setShowKeys(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
    };

    return (
        <div className="page-shell overflow-auto">
            <div className="page-padding max-w-5xl mx-auto space-y-10 md:space-y-12 pb-20">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Integrations
                </h1>
                <p className="text-muted-foreground text-lg">Manage model and voice provider keys used by your assistants.</p>
            </motion.div>

            {/* Connected Section */}
            <AnimatePresence>
                {connectedServices.length > 0 && (
                    <motion.div
                        key="connected-section"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                Connected
                            </h2>
                            <div className="h-[1px] flex-1 bg-border/50 mx-4" />
                        </div>

                        {/* Made grid tighter: 2, 3, or 4 columns based on screen size */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {connectedServices.map((service) => (
                                <Card
                                    key={service.service_name}
                                    className="glass overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-sm border border-border/50"
                                >
                                    <CardContent className="p-0">
                                        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/40" />
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                                                        {service.service_type}
                                                    </span>
                                                    <h3 className="text-lg font-bold capitalize leading-tight">{service.service_name}</h3>
                                                </div>
                                                <div className="p-1.5 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors w-10 h-10 flex items-center justify-center overflow-hidden border border-primary/20">
                                                    <img
                                                        src={`/${service.service_name}.png`}
                                                        alt={service.service_name}
                                                        className="max-w-full max-h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.innerHTML = `<div class="text-xs font-bold uppercase">${service.service_name.charAt(0)}</div>`;
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => toggleKeyVisibility(service.service_name)}
                                                className="cursor-pointer group/key relative bg-background/50 p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap pr-6 text-muted-foreground group-hover/key:text-foreground transition-colors">
                                                        {showKeys[service.service_name] ? service.api_key : "••••••••••••••••"}
                                                    </div>
                                                    <div className="absolute right-2.5 text-muted-foreground group-hover/key:text-primary transition-colors">
                                                        {showKeys[service.service_name] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Re-sync status */}
                                            {(() => {
                                                const rs = resync[service.service_name];
                                                const running = rs?.status === "running";
                                                return (
                                                    <div className="space-y-2">
                                                        {running && (
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                                <span>Syncing {rs.processed ?? 0}/{rs.total ?? 0}</span>
                                                            </div>
                                                        )}
                                                        {rs?.status === "completed" && (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-xs text-green-600">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                    <span>{rs.succeeded ?? 0} synced</span>
                                                                </div>
                                                                {rs.failed && rs.failed.length > 0 && (
                                                                    <ul className="text-xs text-destructive list-disc pl-4">
                                                                        {rs.failed.map(f => (
                                                                            <li key={f.assistant_id} className="break-words">{f.assistant_id}: {f.error}</li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        )}
                                                        {rs?.status === "error" && (
                                                            <div className="flex items-start gap-2 text-xs text-destructive">
                                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                                <span className="break-words min-w-0">Sync failed{rs.error ? `: ${rs.error}` : ""}</span>
                                                            </div>
                                                        )}
                                                        {rs?.status === "interrupted" && (
                                                            <div className="flex items-center gap-2 text-xs text-amber-600">
                                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                                <span>Sync stopped</span>
                                                            </div>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full h-8 text-xs"
                                                            disabled={running}
                                                            onClick={() => handleResync(service.service_name)}
                                                        >
                                                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${running ? "animate-spin" : ""}`} />
                                                            Re-sync
                                                        </Button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Providers Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Mic2 className="w-5 h-5 text-primary" />
                        Available Providers
                    </h2>
                    <div className="h-[1px] flex-1 bg-border/50 mx-4" />
                </div>

                {/* Made grid tighter here as well */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {providers.map((provider, index) => (
                        <motion.div
                            key={provider}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-4 relative"
                        >
                            <button
                                onClick={() => setSelectedProvider(selectedProvider === provider ? null : provider)}
                                className={`w-full text-left transition-all duration-300 relative group overflow-hidden rounded-xl border ${selectedProvider === provider
                                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(172,66,50,0.15)]"
                                    : "border-border hover:border-primary/50 bg-card"
                                    }`}
                            >
                                <Card className={`h-24 border-none bg-transparent relative z-10 flex flex-col items-center justify-center p-4`}>
                                    <div className="mb-2 w-10 h-10 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={`/${provider}.png`}
                                            alt={`${provider} logo`}
                                            className="max-w-full max-h-full object-contain filter brightness-110 group-hover:scale-110 transition-transform duration-300"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML = `<div class="text-xl font-bold uppercase">${provider.charAt(0)}</div>`;
                                            }}
                                        />
                                    </div>
                                    <CardTitle className="text-sm font-bold capitalize tracking-tight group-hover:text-primary transition-colors">
                                        {provider}
                                    </CardTitle>
                                </Card>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>

                            <AnimatePresence>
                                {selectedProvider === provider && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                        className="overflow-hidden z-30 mt-2 w-full"
                                    >
                                        <Card className="neon-border bg-card/90 backdrop-blur-xl shadow-2xl border-primary/30">
                                            <CardHeader className="p-4 pb-2">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Link2 className="w-4 h-4 text-primary" />
                                                    Configure {provider}
                                                </CardTitle>
                                                <CardDescription className="text-xs">Paste your API key below.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4 p-4 pt-0">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`apiKey-${provider}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Key</Label>
                                                    <Input
                                                        id={`apiKey-${provider}`}
                                                        type="password"
                                                        placeholder="sk-..."
                                                        value={apiKey}
                                                        onChange={(e) => setApiKey(e.target.value)}
                                                        className="bg-background border-border/50 h-9 text-sm font-mono focus:ring-primary/50"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={handleSave}
                                                        disabled={isLoading || !apiKey}
                                                        className="flex-1 h-9 text-sm font-bold"
                                                    >
                                                        {isLoading ? "Saving..." : "Connect"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-9 px-4 text-sm"
                                                        onClick={() => setSelectedProvider(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
            </div>
        </div>
    );
};

export default Integrations;