import { cn } from "@/lib/utils";

/** 1–5 的强度选择，默认不选。按钮足够大，手机上容易点 */
export function IntensityPicker({
  value,
  onChange,
  label,
  highlight,
  low = "很轻",
  high = "很强烈",
}: {
  value: number | null;
  onChange: (n: number) => void;
  label: string;
  /** 例如调节前的分数，用细边框标出来 */
  highlight?: number;
  low?: string;
  high?: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              role="radio"
              aria-checked={active}
              aria-label={`${n} 分`}
              onClick={() => onChange(n)}
              className={cn(
                "h-12 rounded-2xl border text-base tabular-nums transition-colors",
                active
                  ? "border-transparent bg-primary font-semibold text-primary-foreground"
                  : n === highlight
                    ? "border-primary/60 bg-card hover:bg-secondary"
                    : "border-border bg-card hover:bg-secondary",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between px-1 text-xs text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
