import { Link, useRouterState } from "@tanstack/react-router";
import { Home, NotebookPen, Sparkles, HeartHandshake } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AmbientMiniPlayer } from "@/components/ambient-mini-player";

const NAV = [
  { to: "/", label: "首页", icon: Home },
  { to: "/journal", label: "情绪日记", icon: NotebookPen },
  { to: "/insights", label: "情绪洞察", icon: Sparkles },
  { to: "/care", label: "自我关怀", icon: HeartHandshake },
] as const;

/** 桌面端多一个"关于"；移动端底栏保持四个主功能，"关于"从页脚进入 */
const DESKTOP_NAV = [...NAV.map(({ to, label }) => ({ to, label })), { to: "/about", label: "关于" }] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-lg">
              🌿
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">MindCare</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {DESKTOP_NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary-soft font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-32 pt-8 md:pb-16">{children}</main>

      <footer className="mx-auto max-w-5xl px-5 pb-28 md:pb-10">
        <p className="rounded-2xl bg-secondary/70 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          MindCare 是自我关怀工具，不提供医学诊断或心理治疗。如果你正处于危机或有伤害自己的念头，请联系你信任的人，或拨打全国统一心理援助热线
          <a href="tel:12356" className="mx-1 font-medium text-foreground underline underline-offset-2">
            12356
          </a>
          ；如有紧急危险，请拨打
          <a href="tel:120" className="mx-1 font-medium text-foreground underline underline-offset-2">
            120
          </a>
          或
          <a href="tel:110" className="mx-1 font-medium text-foreground underline underline-offset-2">
            110
          </a>
          。
        </p>
        <nav aria-label="页脚" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-muted-foreground">
          <Link to="/about" hash="design" className="underline-offset-4 hover:text-foreground hover:underline">
            关于 MindCare
          </Link>
          <Link to="/about" hash="privacy" className="underline-offset-4 hover:text-foreground hover:underline">
            数据与隐私
          </Link>
          <Link to="/about" hash="help" className="underline-offset-4 hover:text-foreground hover:underline">
            寻求帮助
          </Link>
        </nav>

      </footer>

      <AmbientMiniPlayer />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
