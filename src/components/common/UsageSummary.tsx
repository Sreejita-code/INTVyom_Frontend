export interface UsageRow {
  label: string;
  value: number | null;
  unit?: string;
}

interface UsageSummaryProps {
  rows: UsageRow[];
  /** `false` when the API could not price every model in the call. */
  pricingComplete: boolean;
}

/** Usage and cost rows from an API response. A `null` is shown as "Not reported", never as 0. */
export function UsageSummary({ rows, pricingComplete }: UsageSummaryProps) {
  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-mono text-foreground">
              {row.value === null ? "Not reported" : `${row.value}${row.unit ? ` ${row.unit}` : ""}`}
            </dd>
          </div>
        ))}
      </dl>
      {pricingComplete ? null : (
        <p className="text-xs text-muted-foreground">
          Cost is partial: the API has no list price for this model.
        </p>
      )}
    </div>
  );
}
