import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FieldOption } from "./providerCatalog";
import type { PriceTag, PriceTier } from "./pricing";

const TIERS: PriceTier[] = [1, 2, 3, 4];

/**
 * For a `SelectItem` whose row carries a price column. Radix wraps the row's text in a shrink-to-fit
 * span, so without this every row is as wide as its own content and the price columns land at
 * different x positions. Stretching that wrapper makes them line up down the list.
 */
export const PRICED_ITEM_CLASS = "[&>span:last-child]:min-w-0 [&>span:last-child]:flex-1";

/** Four dots, filled up to the tier: a glance at how this model ranks against the others in its list. */
function TierDots({ tier }: { tier: PriceTier }) {
  return (
    <span role="img" aria-label={`Relative cost ${tier} of 4`} className="flex items-center gap-[3px]">
      {TIERS.map((step) => (
        <span
          key={step}
          className={cn("h-1.5 w-1.5 rounded-full", step <= tier ? "bg-primary" : "bg-muted-foreground/25")}
        />
      ))}
    </span>
  );
}

/**
 * The price on the right of a dropdown row. Tagged `data-tagline` so the closed trigger drops it —
 * the chosen model's price is shown in full under the select by `PriceNote` instead.
 */
export function PriceMark({ price }: { price: PriceTag }) {
  return (
    <span
      data-tagline
      className="flex w-[10.5rem] shrink-0 flex-col items-start gap-1.5 self-stretch border-l border-border/40 py-0.5 pl-3 text-left"
    >
      <span className="whitespace-nowrap font-mono text-[0.8125rem] tabular-nums leading-5 text-foreground">{price.headline}</span>
      <span className="whitespace-nowrap text-[10px] uppercase leading-none tracking-wider text-muted-foreground">{price.unit}</span>
      {price.tier && <TierDots tier={price.tier} />}
    </span>
  );
}

/** One dropdown row: the name and hint on the left, the price on the right when there is one. */
export function OptionRow({ option, mono, labelClassName }: { option: FieldOption; mono?: boolean; labelClassName?: string }) {
  return (
    <span className="flex w-full min-w-0 items-start justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-1 py-0.5">
        <span className={cn("break-words text-sm", mono && "font-mono", labelClassName)}>{option.label}</span>
        {option.hint && (
          <span data-tagline className="text-xs leading-5 text-muted-foreground">
            {option.hint}
          </span>
        )}
      </span>
      {option.price && <PriceMark price={option.price} />}
    </span>
  );
}

/** What the chosen model costs, in full, so nobody has to open the dropdown again to remember. */
export function PriceNote({ price, className }: { price?: PriceTag; className?: string }) {
  if (!price) return null;
  return (
    <div
      className={cn(
        "mt-2 flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/40 px-3 py-2",
        className,
      )}
    >
      <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[0.8125rem] tabular-nums text-foreground">{price.headline}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{price.unit}</span>
          {price.tier && <TierDots tier={price.tier} />}
        </p>
        <p className="text-[11px] leading-5 text-muted-foreground">
          {price.detail}. List price, checked {price.checked}.
        </p>
      </div>
    </div>
  );
}
