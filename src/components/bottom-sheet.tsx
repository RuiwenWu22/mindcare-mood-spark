import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * 底部弹出层：手机上贴底，宽屏上居中悬浮。
 * 不超过屏幕高度，内容多时在内部滚动；Esc 或点空白处关闭。
 * 自己实现而不用对话框库：练习界面需要叠在它上面并且可以点击。
 */
export function BottomSheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={label}>
      <div className="animate-fade absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="animate-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-card shadow-[var(--shadow-lift)] outline-none sm:bottom-4 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]"
      >
        <div className="flex shrink-0 justify-center pt-2.5" aria-hidden>
          <span className="h-1.5 w-10 rounded-full bg-foreground/15" />
        </div>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-7">
          {children}
        </div>
      </div>
    </div>
  );
}
