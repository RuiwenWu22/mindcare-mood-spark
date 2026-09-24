import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ExternalLink, Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEntries } from "@/hooks/use-entries";
import { useBody } from "@/hooks/use-body";
import { useDaily } from "@/hooks/use-daily";
import { useCycle } from "@/hooks/use-cycle";
import { buildDailyCard, weekendLinks, type PlanItem } from "@/lib/daily";
import { SLEEP_OPTIONS } from "@/lib/body";
import { CITIES, cityOf, getWeather, type Weather } from "@/lib/weather";
import { dayKey, entryDay, isSample, moodOf, sortByNewest } from "@/lib/mood";
import { HOTLINE } from "@/lib/safety";
import { SignPicker } from "@/components/sign-picker";
import { FollowUpRating } from "@/components/follow-up-rating";
import { cn } from "@/lib/utils";

type WeatherStatus = "idle" | "loading" | "ok" | "error";

/** 首页的今日卡片：今日一签 + 今日穿搭 + 今日小计划 */
export function TodayCard({ onWriteNote }: { onWriteNote: () => void }) {
  const { entries, ready: entriesReady, addFollowUp } = useEntries();
  const { logs, ready: bodyReady, today: todayLog, update: updateBody } = useBody();
  const { profile, state, ready: dailyReady, setProfileAll, updateState } = useDaily();
  const cycle = useCycle();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [wStatus, setWStatus] = useState<WeatherStatus>("idle");
  const [picking, setPicking] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [weekendOpen, setWeekendOpen] = useState(false);
  const [rating, setRating] = useState<PlanItem | null>(null);
  const [rated, setRated] = useState<string | null>(null);

  useEffect(() => {
    const c = cityOf(profile.city);
    if (!c) {
      setWeather(null);
      setWStatus("idle");
      return;
    }
    let alive = true;
    setWStatus("loading");
    void getWeather(c).then((w) => {
      if (!alive) return;
      setWeather(w);
      setWStatus(w ? "ok" : "error");
    });
    return () => {
      alive = false;
    };
  }, [profile.city]);

  const card = useMemo(
    () =>
      buildDailyCard({ entries, logs, profile, weather, ...(cycle.enabled ? { periods: cycle.periods } : {}) }),
    [entries, logs, profile, weather, cycle.enabled, cycle.periods],
  );

  const shell = "card-soft px-6 py-7 sm:px-8";
  if (!entriesReady || !bodyReady || !dailyReady || !cycle.ready) {
    return (
      <section className={shell} aria-label="今日卡片">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">今 日</p>
        <p className="mt-3 font-display text-lg">—</p>
      </section>
    );
  }

  // 安全优先：最近的记录很沉重时，今天不需要完成任何事
  if (card.mode === "support") {
    return (
      <section className={cn(shell, "bg-accent-soft/60")} aria-label="今日卡片">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">今 日</p>
        <h2 className="mt-3 font-display text-xl font-semibold">今天不需要完成什么</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">
          照顾好自己就够了。如果有伤害自己的念头，请联系你信任的人，或拨打
          <a href={`tel:${HOTLINE.number}`} className="mx-1 inline-flex items-center gap-1 font-medium underline underline-offset-2">
            <Phone className="h-3.5 w-3.5" />
            {HOTLINE.number}
          </a>
          {HOTLINE.name}。
        </p>
        <button onClick={onWriteNote} className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          写一句此刻的感受
        </button>
      </section>
    );
  }

  // 翻签前：先问睡眠（已经在首页回答过就直接翻）
  if (!state.flipped) {
    return (
      <section className={shell} aria-label="今日卡片">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">今 日 一 签</p>
        {todayLog?.sleep ? (
          <button
            onClick={() => updateState({ flipped: true })}
            className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
          >
            翻开今日一签
          </button>
        ) : (
          <>
            <p className="mt-3 font-display text-lg">翻签前，先告诉我：昨晚睡得怎么样？</p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="翻签前：昨晚睡得怎么样">
              {SLEEP_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    updateBody({ sleep: o.key });
                    updateState({ flipped: true });
                  }}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  {o.emoji} {o.label}
                </button>
              ))}
              <button
                onClick={() => updateState({ flipped: true })}
                className="px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                跳过
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

  const negativeToday = sortByNewest(entries).find(
    (e) => !isSample(e) && entryDay(e) === dayKey() && moodOf(e.mood).valence < 0,
  );

  const toggleDone = (item: PlanItem) => {
    const done = state.done.includes(item.id);
    updateState({ done: done ? state.done.filter((d) => d !== item.id) : [...state.done, item.id] });
    if (!done && negativeToday) setRating(item);
  };

  return (
    <section className={cn(shell, "space-y-7")} aria-label="今日卡片">
      {/* ---------- 今日一签 ---------- */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs tracking-[0.3em] text-muted-foreground">
            今 日 一 签{card.theme ? ` · ${card.theme.symbol} ${card.theme.signName}` : ""}
          </p>
          {profile.sign && (
            <button onClick={() => setPicking((v) => !v)} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              更换星座
            </button>
          )}
        </div>
        {card.theme && (
          <p className="mt-3 font-display text-xl font-semibold">
            今日主题：{card.theme.title}
            <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">趣味参考</span>
          </p>
        )}
        {card.theme && <p className="mt-1.5 text-sm text-foreground/85">{card.theme.line}</p>}
        <p className={cn("text-base leading-relaxed", card.theme ? "mt-3" : "mt-3 font-display text-lg")}>{card.advice}</p>
        {card.sleepLine && <p className="mt-2 text-sm text-foreground/80">{card.sleepLine}</p>}
        {card.cycleLine && <p className="mt-2 text-sm text-foreground/80">{card.cycleLine}</p>}

        <button
          onClick={() => setWhyOpen((v) => !v)}
          aria-expanded={whyOpen}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          为什么这样说？
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", whyOpen && "rotate-180")} />
        </button>
        {whyOpen && (
          <ul className="mt-2 space-y-1.5 border-l-2 border-primary/40 pl-3 text-xs leading-relaxed text-foreground/80">
            {card.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        {!profile.sign && !profile.declined && !picking && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
            <span>加上你的星座主题（趣味参考）</span>
            <button onClick={() => setPicking(true)} className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary">
              选择星座
            </button>
            <button
              onClick={() => setProfileAll({ ...profile, declined: true })}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              不用了
            </button>
          </div>
        )}
        {picking && (
          <SignPicker
            current={profile.sign}
            onPick={(sign) => {
              const { declined: _d, ...rest } = profile;
              setProfileAll({ ...rest, sign });
              setPicking(false);
            }}
            onDecline={() => {
              const { sign: _s, ...rest } = profile;
              setProfileAll({ ...rest, declined: true });
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        )}

        <button onClick={onWriteNote} className="mt-4 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          写一句此刻的感受
        </button>
      </div>

      {/* ---------- 今日穿搭 ---------- */}
      <div className="border-t border-border/70 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs tracking-[0.3em] text-muted-foreground">今 日 穿 搭 · 趣味参考</p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            城市
            <select
              aria-label="城市"
              value={profile.city ?? ""}
              onChange={(e) => {
                const { city: _c, ...rest } = profile;
                setProfileAll(e.target.value ? { ...rest, city: e.target.value } : rest);
              }}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
            >
              <option value="">选择城市</option>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {card.outfit.color ? (
          <p className="mt-3 flex items-center gap-2 text-sm">
            <span className="inline-block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: card.outfit.color.hex }} />
            主题色：<span className="font-medium">{card.outfit.color.name}</span>
            {card.theme ? `，呼应今天的主题「${card.theme.title}」` : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">选择星座后，会给出今日主题色。</p>
        )}

        {wStatus === "loading" && <p className="mt-2 text-sm text-muted-foreground">正在查询天气……</p>}
        {wStatus === "error" && <p className="mt-2 text-sm text-muted-foreground">天气暂时获取不到，稍后再看看。</p>}
        {wStatus === "idle" && <p className="mt-2 text-sm text-muted-foreground">选择城市后，会根据天气给出穿衣建议。</p>}
        {card.outfit.sky && <p className="mt-2 text-sm">{card.outfit.sky}</p>}
        {card.outfit.clothes && (
          <ul className="mt-1.5 space-y-1 text-sm text-foreground/85">
            {card.outfit.clothes.map((c) => (
              <li key={c}>· {c}</li>
            ))}
          </ul>
        )}
        {card.outfit.accessory && <p className="mt-2 text-sm text-foreground/85">小配饰：{card.outfit.accessory}，给自己一点好心情。</p>}
        {profile.city && <p className="mt-2 text-[11px] text-muted-foreground">查询天气时，只会发送城市的坐标。</p>}
      </div>

      {/* ---------- 今日小计划 ---------- */}
      <div className="border-t border-border/70 pt-6">
        <p className="text-xs tracking-[0.3em] text-muted-foreground">今 日 小 计 划</p>
        {state.rest ? (
          <div className="mt-3">
            <p className="font-display text-lg">好的，今天就好好休息。</p>
            <button onClick={() => updateState({ rest: false })} className="mt-2 text-xs text-muted-foreground underline underline-offset-4">
              改变主意了
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-3 space-y-2.5">
              {card.plan.map((item) => {
                const done = state.done.includes(item.id);
                return (
                  <li key={item.id} className="rounded-2xl bg-secondary/40 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleDone(item)}
                        aria-pressed={done}
                        aria-label={`${done ? "取消完成" : "完成"}：${item.title}`}
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                        )}
                      >
                        {done && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.why}</p>
                        {item.action &&
                          (item.action.external ? (
                            <a
                              href={item.action.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-xs underline underline-offset-2"
                            >
                              {item.action.label}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <Link to="/care" className="mt-1.5 inline-flex text-xs underline underline-offset-2">
                              {item.action.label}
                            </Link>
                          ))}
                        {item.weekend && (
                          <>
                            <button
                              onClick={() => setWeekendOpen((v) => !v)}
                              aria-expanded={weekendOpen}
                              className="mt-1.5 text-xs underline underline-offset-2"
                            >
                              {weekendOpen ? "收起" : "看看可以去哪"}
                            </button>
                            {weekendOpen && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {weekendLinks(item.weekend, profile.city).map((l) => (
                                  <a
                                    key={l.label}
                                    href={l.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary"
                                  >
                                    {l.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {rated && <p className="mt-3 text-xs text-muted-foreground">{rated}</p>}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>做不完也没关系。</span>
              <button onClick={() => updateState({ rest: true })} className="underline-offset-4 hover:underline">
                今天只想休息
              </button>
            </div>
          </>
        )}

        {rating && negativeToday && (
          <FollowUpRating
            title="做完之后，现在感觉怎么样？"
            moodLabel={moodOf(negativeToday.mood).label}
            before={negativeToday.intensity}
            onSubmit={(after) => {
              addFollowUp(negativeToday.id, {
                method: "activity",
                label: rating.title,
                before: negativeToday.intensity,
                after,
                at: new Date().toISOString(),
              });
              setRated(`记下了：「${rating.title}」之后 ${negativeToday.intensity} → ${after}，会出现在洞察页的「什么对我有效」里。`);
              setRating(null);
            }}
            onSkip={() => setRating(null)}
          />
        )}
      </div>
    </section>
  );
}
