import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Bot, KeyRound, LogOut, Phone, Blocks, PhoneCall, Wrench, List, PhoneIncoming, Webhook } from "lucide-react"; // <-- Import Webhook
import { clearUser, getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Make a Call", icon: PhoneCall, path: "/dashboard/assistant?mode=make-call" },
  { label: "Assistant", icon: Bot, path: "/dashboard/assistant" },
  { label: "Tools", icon: Wrench, path: "/dashboard/tools" },
  { label: "Call Logs", icon: List, path: "/dashboard/call-logs" },
  { label: "Phone number", icon: Phone, path: "/dashboard/phone-number" },
  { label: "Inbound Routes", icon: PhoneIncoming, path: "/dashboard/inbound" },
  { label: "Inbound Context", icon: Webhook, path: "/dashboard/inbound-context" }, // <-- Add to Nav
  { label: "API Keys", icon: KeyRound, path: "/dashboard/api-keys" },
  { label: "Integration", icon: Blocks, path: "/dashboard/integration" },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            INT<span className="text-primary">VOICEKIT</span>
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = (location.pathname + location.search) === item.path || location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  active
                    ? "bg-primary/10 text-primary neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
              {user?.user_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="flex-1 truncate">{user?.user_name || "User"}</span>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="watermark">INTVOICEKIT</span>
        </div>

        <div className="relative z-10 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;