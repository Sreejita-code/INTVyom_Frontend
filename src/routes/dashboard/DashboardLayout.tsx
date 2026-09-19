import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LogOut, Menu, Search, ChevronsUpDown } from "lucide-react";
import { clearUser, getStoredUser } from "@/services/storage/storageService";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CopyIdButton } from "@/components/common/CopyIdButton";
import { navItems } from "./navItems";
import type { NavItem } from "./navItems";
import { CommandPalette } from "./CommandPalette";

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

  const [navQuery, setNavQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  const openPalette = (query: string) => {
    setPaletteQuery(query);
    setPaletteOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette(navQuery);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navQuery]);

  const filteredNav = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter((item) =>
      `${item.label} ${item.helper} ${item.keywords}`.toLowerCase().includes(q),
    );
  }, [navQuery]);

  const groupedNav = useMemo(() => {
    const groups: { section: string; items: NavItem[] }[] = [];
    for (const item of filteredNav) {
      const group = groups.find((g) => g.section === item.section);
      if (group) group.items.push(item);
      else groups.push({ section: item.section, items: [item] });
    }
    return groups;
  }, [filteredNav]);

  const navSection = (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 pb-2 shrink-0">
        {/* Single search: filters this list as you type, Enter jumps to full search. */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            type="search"
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") openPalette(navQuery);
            }}
            placeholder="Search pages…"
            aria-label="Search pages. Type to filter, Enter for full search."
            className="h-9 bg-muted/30 border-border/50 text-sm pl-8 pr-12"
          />
          <kbd className="absolute right-2.5 top-2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground pointer-events-none">⌘K</kbd>
        </div>
      </div>
      <nav aria-label="Dashboard pages" className="flex-1 p-3 pt-1 space-y-4 overflow-y-auto min-h-0">
        {groupedNav.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">
            No pages match “{navQuery}”. Try “API key”, “phone” or “calls”.
          </p>
        ) : (
          groupedNav.map((group) => (
            <div key={group.section} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {group.section}
              </p>
              {group.items.map((item) => {
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
                    title={item.helper}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                      active
                        ? "bg-primary/10 text-primary neon-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="block min-w-0 flex-1">
                      <span className="block">{item.label}</span>
                      <span className="block text-xs opacity-70 leading-snug line-clamp-2">{item.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </nav>
    </div>
  );

  const goHome = () => {
    setMobileNavOpen(false);
    navigate("/dashboard/assistant");
  };

  const sidebarFooter = (
    <div className="p-3 border-t border-border">
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Open account details"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-left"
          >
            <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0" aria-hidden="true">
              {user?.user_name?.charAt(0).toUpperCase() || "U"}
            </span>
            <span className="flex-1 truncate">{user?.user_name || "User"}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-72 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground truncate">{user?.user_name || "User"}</p>
            <p className="text-xs text-muted-foreground">Signed in to INTVOICEKIT</p>
          </div>
          {user?.user_id && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User ID · who you are</p>
              <CopyIdButton value={user.user_id} label="User ID" />
              <p className="text-xs text-muted-foreground">Used for: <code className="font-mono">user_id</code> on every API request.</p>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout} className="w-full gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    // CHANGED from min-h-svh to h-screen overflow-hidden to lock the layout completely
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} query={paletteQuery} onQueryChange={setPaletteQuery} />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-sidebar flex-col">
        <div className="p-6 border-b border-border">
          <button onClick={goHome} aria-label="Go to home" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="text-xl font-bold tracking-tight text-foreground" aria-hidden="true">
              INT<span className="text-primary">VOICEKIT</span>
            </span>
          </button>
        </div>
        {navSection}
        {sidebarFooter}
      </aside>

      {/* Main */}
      <main id="main-content" className="flex-1 relative min-w-0 overflow-hidden flex flex-col h-full">
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
                  <button onClick={goHome} aria-label="Go to home" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="text-lg font-bold tracking-tight text-foreground" aria-hidden="true">
                      INT<span className="text-primary">VOICEKIT</span>
                    </span>
                  </button>
                </div>
                {navSection}
                {sidebarFooter}
              </div>
            </SheetContent>
          </Sheet>
          <button onClick={goHome} aria-label="Go to home" className="rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="text-sm font-semibold tracking-wide text-foreground" aria-hidden="true">
              INT<span className="text-primary">VOICEKIT</span>
            </span>
          </button>
          <div className="w-9" />
        </div>

        <div className="relative flex-1 min-h-0">
          <div className="relative z-10 h-full min-h-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;