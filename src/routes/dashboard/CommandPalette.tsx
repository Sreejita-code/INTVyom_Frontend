import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CircleHelp } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { navItems } from "./navItems";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Controlled search text so the sidebar can pre-fill it. */
  query: string;
  onQueryChange: (query: string) => void;
}

const quickActions = [
  {
    label: "IDs and keys guide",
    helper: "User ID vs assistant ID vs keys",
    path: "/dashboard/developer",
  },
  {
    label: "Make a test call",
    helper: "Try an assistant on a real number",
    path: "/dashboard/make-call",
  },
];

/**
 * Global search across every dashboard page. Open with Cmd+K / Ctrl+K.
 * Navigation only — it takes you to the page, it never runs an action.
 */
export function CommandPalette({ open, onOpenChange, query, onQueryChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const sections: { section: string; items: typeof navItems }[] = [];
    for (const item of navItems) {
      const group = sections.find((g) => g.section === item.section);
      if (group) group.items.push(item);
      else sections.push({ section: item.section, items: [item] });
    }
    return sections;
  }, []);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Search all pages</DialogTitle>
        <Command label="Search all pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
      <CommandInput value={query} onValueChange={onQueryChange} placeholder="Search pages, keys, IDs… (try “API key” or “phone”)" aria-label="Search all pages" />
      <CommandList>
        <CommandEmpty>No pages match. Try “API key”, “phone” or “calls”.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.section} heading={group.section}>
            {group.items.map((item) => (
              <CommandItem key={item.path} value={`${item.label} ${item.helper} ${item.keywords}`} onSelect={() => go(item.path)}>
                <item.icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.helper}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Quick actions">
          {quickActions.map((action) => (
            <CommandItem key={action.label} value={`${action.label} ${action.helper}`} onSelect={() => go(action.path)}>
              <CircleHelp className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{action.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{action.helper}</span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
