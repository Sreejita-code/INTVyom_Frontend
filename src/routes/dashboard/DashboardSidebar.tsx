import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronsUpDown, LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIdButton } from "@/components/common/CopyIdButton";
import { clearUser, getStoredUser } from "@/services/storage/storageService";
import { cn } from "@/lib/utils";
import { navItems, type NavItem } from "./navItems";

interface DashboardSidebarProps {
  /** Rail mode: icons only, every label moved into a tooltip. */
  collapsed?: boolean;
  /** Omit to hide the collapse control — the mobile sheet has no use for it. */
  onToggleCollapsed?: () => void;
  /** Opens the ⌘K palette with whatever has been typed into the filter. */
  onSearch: (query: string) => void;
  /** Fires after a page is picked, so the mobile sheet can close itself. */
  onNavigate?: () => void;
  onLogout?: () => void;
}

/**
 * The dashboard's primary navigation. Owns its own filter state and knows how
 * to render itself at two widths; the layout only decides which width and
 * whether a collapse control is offered.
 *
 * Rows deliberately show the label alone. Each page's one-line description
 * lives in `navItems` and surfaces on hover and in the ⌘K palette — printing
 * it under all twelve rows made the rail unreadable.
 */
export function DashboardSidebar({
  collapsed = false,
  onToggleCollapsed,
  onSearch,
  onNavigate,
  onLogout,
}: DashboardSidebarProps) {
  const location = useLocation();
  const user = getStoredUser();
  const [query, setQuery] = useState("");

  const currentFullPath = location.pathname + location.search;
  const exactQueryMatchExists = navItems.some(
    (nav) => nav.path.includes("?") && nav.path === currentFullPath,
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? navItems.filter((item) =>
          `${item.label} ${item.helper} ${item.keywords}`.toLowerCase().includes(needle),
        )
      : navItems;

    return matches.reduce<{ section: string; items: NavItem[] }[]>((acc, item) => {
      const group = acc.find((g) => g.section === item.section);
      if (group) group.items.push(item);
      else acc.push({ section: item.section, items: [item] });
      return acc;
    }, []);
  }, [query]);

  const isActive = (item: NavItem) =>
    item.path.includes("?")
      ? currentFullPath === item.path
      : location.pathname === item.path && !exactQueryMatchExists;

  const handleLogout = () => {
    clearUser();
    onLogout?.();
  };

  return (
    <div className="group/sidebar h-full w-full flex flex-col bg-sidebar">
      <SidebarHeader collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} onNavigate={onNavigate} />

      <div className="px-3 py-3 shrink-0">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSearch("")}
                aria-label="Search pages"
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Search pages · ⌘K</TooltipContent>
          </Tooltip>
        ) : (
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch(query);
              }}
              placeholder="Search pages…"
              aria-label="Search pages. Type to filter, Enter for full search."
              className="h-9 pl-9 pr-12 bg-sidebar-accent/40 border-transparent text-sm focus-visible:border-border"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground pointer-events-none">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      <nav aria-label="Dashboard pages" className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {groups.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            No pages match “{query}”. Try “API key”, “phone” or “calls”.
          </p>
        ) : (
          groups.map((group, index) => (
            <div key={group.section} className={index > 0 ? "mt-4" : undefined}>
              {collapsed ? (
                index > 0 && <div className="mx-2 mb-2 border-t border-sidebar-border" aria-hidden="true" />
              ) : (
                <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.section}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink item={item} active={isActive(item)} collapsed={collapsed} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Open account details"
              className={cn(
                "w-full flex items-center rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed ? "justify-center h-10" : "gap-3 px-2 h-10 text-left",
              )}
            >
              <span
                className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0"
                aria-hidden="true"
              >
                {user?.user_name?.charAt(0).toUpperCase() || "U"}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{user?.user_name || "User"}</span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                </>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-72 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground truncate">{user?.user_name || "User"}</p>
              <p className="text-xs text-muted-foreground">Signed in to INTVOICEKIT</p>
            </div>
            {user?.user_id && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User ID · who you are
                </p>
                <CopyIdButton value={user.user_id} label="User ID" />
                <p className="text-xs text-muted-foreground">
                  Used for: <code className="font-mono">user_id</code> on every API request.
                </p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/**
 * Wordmark and collapse control share one slot. Collapsed, the slot shows the
 * monogram and turns into the expand button under the pointer or keyboard
 * focus — the rail never spends a second row on a chevron.
 */
function SidebarHeader({
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: Pick<DashboardSidebarProps, "collapsed" | "onToggleCollapsed" | "onNavigate">) {
  const wordmark = (
    <span className="text-lg font-bold tracking-tight text-foreground" aria-hidden="true">
      INT<span className="text-primary">VOICEKIT</span>
    </span>
  );

  if (collapsed) {
    return (
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border shrink-0">
        {onToggleCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Expand sidebar"
                aria-expanded={false}
                className="group/logo relative w-10 h-10 flex items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className="text-sm font-bold tracking-tight transition-opacity group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0"
                  aria-hidden="true"
                >
                  IV
                </span>
                <PanelLeftOpen
                  className="absolute h-4 w-4 opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100"
                  aria-hidden="true"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <Link to="/dashboard/assistant" onClick={onNavigate} aria-label="INTVOICEKIT home">
            <span className="text-sm font-bold text-primary" aria-hidden="true">
              IV
            </span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border shrink-0">
      <Link
        to="/dashboard/assistant"
        onClick={onNavigate}
        aria-label="INTVOICEKIT home"
        className="flex-1 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {wordmark}
      </Link>
      {onToggleCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground hover:bg-sidebar-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/sidebar:opacity-100"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse sidebar</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center h-10 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "w-10 mx-auto justify-center" : "gap-3 px-2",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-56">
        <p className="font-medium">{item.label}</p>
        <p className="text-muted-foreground">{item.helper}</p>
      </TooltipContent>
    </Tooltip>
  );
}
