import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Bot, KeyRound, LogOut, Phone, Blocks, PhoneCall, Wrench, List, PhoneIncoming, Webhook, BarChart3, Menu } from "lucide-react";
import { clearUser, getStoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Make a Call", icon: PhoneCall, path: "/dashboard/assistant?mode=make-call" },
  { label: "Assistant", icon: Bot, path: "/dashboard/assistant" },
  { label: "Tools", icon: Wrench, path: "/dashboard/tools" },
  { label: "Call Logs", icon: List, path: "/dashboard/call-logs" },
  { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
  { label: "Phone number", icon: Phone, path: "/dashboard/phone-number" },
  { label: "Inbound Routes", icon: PhoneIncoming, path: "/dashboard/inbound" },
  { label: "Inbound Context", icon: Webhook, path: "/dashboard/inbound-context" },
  { label: "Passthrough Calls", icon: PhoneCall, path: "/dashboard/passthrough-calls" },
  { label: "Passthrough Records", icon: List, path: "/dashboard/passthrough-call-records" },
  { label: "API Keys", icon: KeyRound, path: "/dashboard/api-keys" },
  { label: "Integration", icon: Blocks, path: "/dashboard/integration" },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  const currentFullPath = location.pathname + location.search;
  const exactQueryMatchExists = navItems.some(
    (nav) => nav.path.includes("?") && nav.path === currentFullPath,
  );

  const navSection = (
    // ADDED min-h-0 here so the nav section scrolls independently if there are many items
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
      {navItems.map((item) => {
        const active = item.path.includes("?")
          ? currentFullPath === item.path
          : location.pathname === item.path && !exactQueryMatchExists;

        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setMobileNavOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
              active
                ? "bg-primary/10 text-primary neon-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
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
  );

  return (
    // CHANGED from min-h-svh to h-screen overflow-hidden to lock the layout completely
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-sidebar flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            INT<span className="text-primary">VOICEKIT</span>
          </h1>
        </div>
        {navSection}
        {sidebarFooter}
      </aside>

      {/* Main */}
      <main className="flex-1 relative min-w-0 overflow-hidden flex flex-col h-full">
        {/* Mobile Top Bar */}
        <div className="md:hidden sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur-sm px-4 flex items-center justify-between">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[88vw] max-w-[320px] bg-sidebar border-border">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="h-full flex flex-col">
                <div className="p-5 border-b border-border">
                  <h1 className="text-lg font-bold tracking-tight text-foreground">
                    INT<span className="text-primary">VOICEKIT</span>
                  </h1>
                </div>
                {navSection}
                {sidebarFooter}
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-sm font-semibold tracking-wide text-foreground">
            INT<span className="text-primary">VOICEKIT</span>
          </h1>
          <div className="w-9" />
        </div>

        <div className="relative flex-1 min-h-0">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="watermark">INTVOICEKIT</span>
          </div>

          <div className="relative z-10 h-full min-h-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;