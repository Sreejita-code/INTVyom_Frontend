import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { usePersistedFlag } from "@/hooks/usePersistedFlag";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { DashboardSidebar } from "./DashboardSidebar";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, toggleCollapsed] = usePersistedFlag(
    "intvoicekit.sidebar.collapsed",
  );

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
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
      />

      <aside
        className={cn(
          "hidden min-h-0 shrink-0 overflow-hidden border-r border-sidebar-border transition-[width] duration-200 motion-reduce:transition-none md:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <DashboardSidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onSearch={openPalette}
          onLogout={() => navigate("/")}
        />
      </aside>

      <main
        id="main-content"
        className="flex-1 min-w-0 h-full flex flex-col overflow-hidden"
      >
        <div className="md:hidden sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm px-4 flex items-center justify-between">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-[88vw] max-w-80 bg-sidebar border-sidebar-border"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <DashboardSidebar
                onSearch={openPalette}
                onNavigate={() => setMobileNavOpen(false)}
                onLogout={() => navigate("/")}
              />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold tracking-wide text-foreground">
            INT<span className="text-primary">VOICEKIT</span>
          </span>
          <div className="w-9" />
        </div>

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
