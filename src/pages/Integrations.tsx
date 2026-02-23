import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredUser } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, Link2, Mic2, Eye, EyeOff, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IntegrationData {
    service_type: string;
    service_name: string;
    api_key: string;
}

const Integrations = () => {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [connectedServices, setConnectedServices] = useState<IntegrationData[]>([]);
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
    const user = getStoredUser();

    const fetchIntegrations = async () => {
        if (!user?.user_id) return;

        const providers = ["cartesia", "sarvam"];
        const results: IntegrationData[] = [];

        for (const provider of providers) {
            try {
                const response = await fetch(
                    `http://localhost:3000/api/integration/get?user_id=${user.user_id}&service_name=${provider}`
                );
                const data = await response.json();
                if (data.success && data.data) {
                    results.push(data.data);
                }
            } catch (error) {
                console.error(`Error fetching ${provider} integration:`, error);
            }
        }
        setConnectedServices(results);
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
            const response = await fetch("http://localhost:3000/api/integration/store", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    service_type: "TTS",
                    service_name: selectedProvider,
                    api_key: apiKey,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setApiKey("");
                setSelectedProvider(null);
                fetchIntegrations();
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
        <div className="p-8 max-w-5xl mx-auto space-y-12 pb-20">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Integrations
                </h1>
                <p className="text-muted-foreground text-lg">Power your virtual assistants with world-class voice providers.</p>
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
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                                Connected
                            </h2>
                            <div className="h-[1px] flex-1 bg-border/50 mx-4" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {connectedServices.map((service) => (
                                <Card
                                    key={service.service_name}
                                    className="glass overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-xl border-2 border-border/50"
                                >
                                    <CardContent className="p-0">
                                        <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/40" />
                                        <div className="p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                                                        {service.service_type} Provider
                                                    </span>
                                                    <h3 className="text-xl font-bold capitalize">{service.service_name}</h3>
                                                </div>
                                                <div className="p-2 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors w-12 h-12 flex items-center justify-center overflow-hidden border border-primary/20">
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
                                                className="cursor-pointer group/key relative bg-background/50 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap pr-8">
                                                        {showKeys[service.service_name] ? service.api_key : "••••••••••••••••••••••••"}
                                                    </div>
                                                    <div className="absolute right-4 text-muted-foreground group-hover/key:text-primary transition-colors">
                                                        {showKeys[service.service_name] ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Providers Section */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Mic2 className="w-6 h-6 text-primary" />
                        Voice Providers
                    </h2>
                    <div className="h-[1px] flex-1 bg-border/50 mx-4" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {["cartesia", "sarvam"].map((provider, index) => (
                        <motion.div
                            key={provider}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-6"
                        >
                            <button
                                onClick={() => setSelectedProvider(selectedProvider === provider ? null : provider)}
                                className={`w-full text-left transition-all duration-300 relative group overflow-hidden rounded-2xl border-2 ${selectedProvider === provider
                                    ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(172,66,50,0.2)]"
                                    : "border-border hover:border-primary/50"
                                    }`}
                            >
                                <Card className={`h-32 border-none bg-transparent relative z-10 flex flex-col items-center justify-center p-6`}>
                                    <div className="mb-2 w-16 h-16 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={`/${provider}.png`}
                                            alt={`${provider} logo`}
                                            className="max-w-full max-h-full object-contain filter brightness-110 group-hover:scale-110 transition-transform duration-300"
                                            onError={(e) => {
                                                // Fallback if image not found
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML = `<div class="text-2xl font-bold uppercase">${provider.charAt(0)}</div>`;
                                            }}
                                        />
                                    </div>
                                    <CardTitle className="text-xl font-bold capitalize tracking-tight group-hover:text-primary transition-colors">
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
                                        className="overflow-hidden"
                                    >
                                        <Card className="neon-border bg-card/50 backdrop-blur-md shadow-2xl">
                                            <CardHeader>
                                                <CardTitle className="text-xl flex items-center gap-2">
                                                    <Link2 className="w-5 h-5 text-primary" />
                                                    Configure {provider}
                                                </CardTitle>
                                                <CardDescription>Paste your API key below to link your provider account.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-5">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`apiKey-${provider}`} className="text-sm font-semibold uppercase tracking-wider">API Key</Label>
                                                    <Input
                                                        id={`apiKey-${provider}`}
                                                        type="password"
                                                        placeholder="Enter your API key"
                                                        value={apiKey}
                                                        onChange={(e) => setApiKey(e.target.value)}
                                                        className="bg-background/80 border-border/50 h-12 text-lg font-mono focus:ring-primary/50"
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button
                                                        onClick={handleSave}
                                                        disabled={isLoading}
                                                        className="flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all"
                                                    >
                                                        {isLoading ? "Validating..." : "Connect Provider"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 px-6"
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
    );
};

export default Integrations;
