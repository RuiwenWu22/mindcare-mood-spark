import { Link, useRouterState } from "@tanstack/react-router";
import { Home, NotebookPen, Sparkles, HeartHandshake } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "首页", icon: Home },
  { to: "/journal", label: "情绪日记", icon: NotebookPen },
  { to: "/insights", label: "情绪洞察", icon: Sparkles },
  { to: "/care", label: "自我关怀", icon: HeartHandshake },
] as const;

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
            {NAV.map((item) => {
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
          MindCare 是自我关怀工具，不提供医学诊断或心理治疗。如果你正处于危机或有伤害自己的想法，请及时联系当地紧急服务或专业支持。
        </p>
      </footer>

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
