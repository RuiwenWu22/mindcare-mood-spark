import { useState } from "react";
import { SIGNS, rangeLabel, signFromDate, signOf, type SignKey } from "@/lib/zodiac";
import { cn } from "@/lib/utils";

/** 选星座：直接点选，或者用生日（只需月和日）算一下。只保存星座，不保存生日 */
export function SignPicker({
  current,
  onPick,
  onDecline,
  onClose,
}: {
  current?: SignKey | undefined;
  onPick: (s: SignKey) => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const [byBirthday, setByBirthday] = useState(false);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const result = month && day ? signFromDate(Number(month), Number(day)) : null;

  return (
    <div className="animate-rise mt-4 rounded-2xl border border-border bg-card px-4 py-4" role="region" aria-label="选择星座">
      {!byBirthday ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SIGNS.map((s) => (
              <button
                key={s.key}
                onClick={() => onPick(s.key)}
                aria-pressed={current === s.key}
                className={cn(
                  "rounded-xl border px-2 py-2 text-center transition-colors hover:bg-secondary",
                  current === s.key ? "border-primary bg-primary-soft/60" : "border-border",
                )}
              >
                <span className="block text-sm">
                  {s.symbol} {s.name}
                </span>
                <span className="block text-[11px] text-muted-foreground">{rangeLabel(s.key)}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setByBirthday(true)}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            不知道自己的星座？用生日算一下
          </button>
        </>
      ) : (
        <>
          <p className="text-sm">选一下你的生日</p>
          <div className="mt-2 flex gap-2">
            <select
              aria-label="月份"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">月</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} 月
                </option>
              ))}
            </select>
            <select
              aria-label="日期"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="">日</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} 日
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">只需要月和日，不需要年份。我们只保存算出来的星座，不保存生日。</p>

          {result && !result.ok && <p className="mt-3 text-sm text-destructive">{result.error}</p>}
          {result?.ok && (
            <div className="mt-3" aria-live="polite">
              <p className="text-sm">
                你是 <span className="font-medium">{signOf(result.sign).name}</span>（{rangeLabel(result.sign)}）
              </p>
              {result.cusp && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  你的生日在{signOf(result.sign).name}和{signOf(result.cusp).name}的交界处，常见算法是
                  {signOf(result.sign).name}；如果你习惯说{signOf(result.cusp).name}，也可以直接选它。
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => onPick(result.sign)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  就用{signOf(result.sign).name}
                </button>
                {result.cusp && (
                  <button
                    onClick={() => onPick(result.cusp!)}
                    className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
                  >
                    选{signOf(result.cusp).name}
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setByBirthday(false)}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            返回直接选
          </button>
        </>
      )}

      <div className="mt-4 flex justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <button onClick={onDecline} className="underline-offset-4 hover:text-foreground hover:underline">
          不用星座
        </button>
        <button onClick={onClose} className="underline-offset-4 hover:text-foreground hover:underline">
          收起
        </button>
      </div>
    </div>
  );
}
