import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { storeUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    user_name: "",
    org_name: "",
    user_email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const set = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isSignup
        ? "http://localhost:3000/api/auth/signup"
        : "http://localhost:3000/api/auth/login";

      const body = isSignup
        ? {
            user_name: form.user_name,
            org_name: form.org_name,
            user_email: form.user_email,
            password: form.password,
          }
        : { user_name: form.user_name, password: form.password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      storeUser({
        user_id: data.user_id,
        user_name: form.user_name,
      });

      toast({ title: isSignup ? "Account created!" : "Welcome back!" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            INT<span className="text-primary">_Vyom</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isSignup ? "Create your account" : "Sign in to your dashboard"}
          </p>
        </div>

        <div className="glass rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignup ? "signup" : "login"}
                initial={{ opacity: 0, x: isSignup ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isSignup ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="user_name">Username</Label>
                  <Input
                    id="user_name"
                    placeholder="Enter username"
                    value={form.user_name}
                    onChange={(e) => set("user_name", e.target.value)}
                    required
                    className="bg-muted border-border focus:border-primary"
                  />
                </div>

                {isSignup && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="org_name">Organisation Name</Label>
                      <Input
                        id="org_name"
                        placeholder="Enter organisation"
                        value={form.org_name}
                        onChange={(e) => set("org_name", e.target.value)}
                        required
                        className="bg-muted border-border focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_email">User Email</Label>
                      <Input
                        id="user_email"
                        type="email"
                        placeholder="Enter email"
                        value={form.user_email}
                        onChange={(e) => set("user_email", e.target.value)}
                        required
                        className="bg-muted border-border focus:border-primary"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                    className="bg-muted border-border focus:border-primary"
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading}
              className="w-full neon-glow"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignup ? "Create Account" : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignup
                ? "Already have an account? Login"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
