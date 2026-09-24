import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Level 2：AI 内容卡片。统一用"✨ + 标题"开头，底色非常浅的绿色 */
export function AiCard({
  title,
  children,
  className,
  size = "md",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <section className={cn("ai-card", size === "lg" ? "px-5 py-6 sm:px-7" : "px-4 py-4 sm:px-5", className)}>
      <p className="text-sm font-medium text-foreground/80">✨ {title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** 「为什么这样判断？」：展开后列出实际依据 */
export function WhyToggle({ items, label = "为什么这样判断？" }: { items: string[]; label?: string }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 border-l-2 border-primary/40 pl-3 text-xs leading-relaxed text-foreground/75">
          {items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
