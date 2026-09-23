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
  condenseIntegrationResponse,
} from "@/services/integration/integrationService";
import { IntegrationData, ResyncData } from "@/types/integration";
import { toast } from "sonner";
import { Link2, Mic2, ShieldCheck, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Blocks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Integrations = () => {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    /**
     * Which assistant stages each key covers. Most vendors issue one key that serves more than
     * one stage, so storing it once is enough and rotating it re-syncs every stage it backs.
     */
    const PROVIDER_SLOTS: Record<string, string> = {
        cartesia: "Voice · Transcription",
        sarvam: "Voice · Transcription",
        elevenlabs: "Voice · Transcription",
        mistral: "Voice",
        gemini: "Model",
        openai: "Model · Transcription",
        deepgram: "Transcription",
    };

    // CSS `capitalize` mangles camel-case brands ("Elevenlabs", "Openai"), so display names are explicit.
    const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
        cartesia: "Cartesia",
        sarvam: "Sarvam",
        elevenlabs: "ElevenLabs",
        mistral: "Mistral",
        gemini: "Gemini",
        openai: "OpenAI",
        deepgram: "Deepgram",
    };
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [connectedServices, setConnectedServices] = useState<IntegrationData[]>([]);
    const [resync, setResync] = useState<{ [service: string]: ResyncData }>({});
    const timers = useRef<{ [service: string]: ReturnType<typeof setTimeout> }>({});
    const user = getStoredUser();

    const pollResync = async (service: string) => {
        if (!user?.api_key) return;
        // drop any pending poll for this service so we never stack concurrent pollers
        if (timers.current[service]) clearTimeout(timers.current[service]);
        try {
            const { ok, status, json } = await callResyncStatusEndpoint({ serviceName: service });
            if (!ok) {
                // A 404 means no re-sync has run for this service yet; anything else is a real failure.
                setResync(prev => {
                    const n = { ...prev };
                    if (status === 404) delete n[service];
                    else n[service] = { status: "error", error: json.error };
                    return n;
                });
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
        if (!user?.api_key) return;
        try {
            const json = await callResyncIntegrationEndpoint({ service_name: service });
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

    const providers = ["cartesia", "sarvam", "elevenlabs", "mistral", "gemini", "openai", "deepgram"];

    const fetchIntegrations = async () => {
        if (!user?.api_key) return;
        const results: IntegrationData[] = [];
        const unreachable: string[] = [];

        await Promise.all(providers.map(async (provider) => {
            try {
                const { ok, status, json } = await callGetIntegrationEndpoint({ serviceName: provider });
                const integration = ok ? condenseIntegrationResponse(json) : null;
                if (integration) results.push(integration);
                else if (status !== 404) unreachable.push(PROVIDER_DISPLAY_NAMES[provider] ?? provider);
            } catch {
                unreachable.push(PROVIDER_DISPLAY_NAMES[provider] ?? provider);
            }
        }));
        results.sort((a, b) => providers.indexOf(a.service_name) - providers.indexOf(b.service_name));
        setConnectedServices(results);
        if (unreachable.length > 0) {
            toast.error(`Couldn't check ${unreachable.join(", ")}. Refresh to try again.`);
        }
        // resume any re-sync job still running after a reload (404 = no-op for idle providers)
        results.forEach(s => pollResync(s.service_name));
    };

    useEffect(() => {
        fetchIntegrations();
    }, [user?.api_key]);

    const handleSave = async () => {
        if (!user?.api_key || !selectedProvider || !apiKey) {
            toast.error("Please provide a provider key");
            return;
        }

        setIsLoading(true);
        try {
            const data = await callStoreIntegrationEndpoint({
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

    return (
        <div className="page-shell overflow-auto">
            <div className="page-padding max-w-5xl mx-auto space-y-10 md:space-y-12 pb-20">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Blocks className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Provider Keys
                        </h1>
                        <p className="text-sm text-muted-foreground">Keys for OpenAI, Gemini, ElevenLabs and other voice providers. Your assistants use these — they are not your VoiceKit API key.</p>
                    </div>
                </div>
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
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                Connected
                            </h2>
                        </div>

                        {/* Made grid tighter: 2, 3, or 4 columns based on screen size */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {connectedServices.map((service) => (
                                <Card
                                    key={service.service_name}
                                    className="glass overflow-hidden group hover:border-primary/50 transition-colors duration-200 shadow-sm border border-border/50"
                                >
                                    <CardContent className="p-0">
                                        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary/40" />
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                                                        {service.service_type}
                                                    </span>
                                                    <h3 className="text-lg font-bold leading-tight">{PROVIDER_DISPLAY_NAMES[service.service_name] ?? service.service_name}</h3>
                                                </div>
                                                <div className="p-1.5 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors w-10 h-10 flex items-center justify-center overflow-hidden border border-primary/20">
                                                    <img
                                                        src={`/${service.service_name}.png`}
                                                        alt={service.service_name}
                                                        className="max-w-full max-h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.innerHTML = `<div class="text-xl font-bold uppercase">${service.service_name.charAt(0)}</div>`;
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-background/50 p-2 rounded-lg border border-border">
                                                <p className="font-mono text-xs truncate text-muted-foreground" title="Stored key — only the last four characters are shown">
                                                    Key ending {service.api_key_last4 || "····"}
                                                </p>
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
                                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-1" />
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
                                                            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${running ? "animate-spin" : ""}`} />
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
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Mic2 className="w-5 h-5 text-primary" />
                        Available Providers
                    </h2>
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
                                className={`w-full text-left transition-colors duration-200 relative group overflow-hidden rounded-xl border ${selectedProvider === provider
                                    ? "border-primary/30 bg-primary/10"
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
                                    <CardTitle className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">
                                        {PROVIDER_DISPLAY_NAMES[provider] ?? provider}
                                    </CardTitle>
                                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        {PROVIDER_SLOTS[provider]}
                                    </p>
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
                                                <CardDescription className="text-xs">Paste your {provider} key below. This is not your VoiceKit API key.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4 p-4 pt-0">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`apiKey-${provider}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{provider} key</Label>
                                                    <Input
                                                        id={`apiKey-${provider}`}
                                                        type="password"
                                                        autoComplete="new-password"
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