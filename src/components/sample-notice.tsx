import { toast } from "sonner";
import { useEntries } from "@/hooks/use-entries";
import { isSample } from "@/lib/mood";

/** 首次打开时的示例数据说明：让体验者一眼知道哪些是示例，并能一键清空 */
export function SampleNotice() {
  const { entries, ready, clearSamples } = useEntries();
  const count = entries.filter(isSample).length;
  if (!ready || count === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-relaxed text-foreground/85">
        为了让你先看到完整效果，这里放了 {count} 条<span className="font-medium">示例记录</span>
        （带「示例」标记）。所有数据只保存在这台设备的浏览器里。
      </p>
      <button
        onClick={() => {
          clearSamples();
          toast("示例已清空，接下来的都是你自己的记录 🌱");
        }}
        className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
      >
        清空示例，开始我的记录
      </button>
    </div>
  );
}
