import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { parseSyncHash, upsertDay, type SyncResult } from "@/lib/body";
import { dayKey } from "@/lib/mood";

export const Route = createFileRoute("/sync")({
  head: () => ({
    meta: [
      { title: "同步活动数据｜MindCare" },
      { name: "description", content: "用 iPhone 快捷指令，把今天的步数和锻炼时间带进 MindCare。" },
    ],
  }),
  component: SyncPage,
});

const SITE = "https://mindcare-mood-spark.lovable.app";

function SyncPage() {
  const [result, setResult] = useState<SyncResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.length > 1) {
      setResult(parseSyncHash(hash));
      // 读取后立即从地址栏清除，避免数据留在浏览历史或被分享出去
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const save = () => {
    if (!result?.ok) return;
    upsertDay(result.date, {
      ...(result.steps !== undefined ? { steps: result.steps } : {}),
      ...(result.exercise !== undefined ? { exercise: result.exercise } : {}),
      source: "shortcut",
    });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">同步活动数据</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          用 iPhone 快捷指令读取今天的步数和锻炼时间，点一下带进 MindCare。
        </p>
      </header>

      {result?.ok && (
        <section className="card-soft px-6 py-6 sm:px-8" aria-live="polite">
          {saved ? (
            <>
              <p className="flex items-center gap-2 font-display text-lg font-semibold">
                <Check className="h-5 w-5 text-primary" /> 已保存
              </p>
              <Link to="/" className="mt-4 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
                回到首页
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-semibold">
                收到{result.date === dayKey() ? "今天" : ` ${result.date} `}的活动数据
              </h2>
              <p className="mt-3 text-2xl font-display">
                {result.steps !== undefined ? `${result.steps.toLocaleString("zh-CN")} 步` : ""}
                {result.steps !== undefined && result.exercise !== undefined ? " · " : ""}
                {result.exercise !== undefined ? `锻炼 ${result.exercise} 分钟` : ""}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">确认无误再保存。数据只存在这台设备的浏览器里。</p>
              <div className="mt-5 flex gap-2">
                <button onClick={save} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
                  保存
                </button>
                <Link to="/" className="rounded-full border border-border px-6 py-2.5 text-sm transition-colors hover:bg-secondary">
                  不保存
                </Link>
              </div>
            </>
          )}
        </section>
      )}

      {result && !result.ok && (
        <section className="rounded-3xl border border-destructive/40 bg-card px-6 py-5 text-sm" role="alert">
          没能读取这次同步：{result.error}
        </section>
      )}

      <section className="card-soft px-6 py-7 sm:px-8">
        <h2 className="font-display text-lg font-semibold">第一次使用：建一个快捷指令</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/85">
          <li>1. 打开 iPhone 上的「快捷指令」App，新建一个快捷指令，命名为「同步到 MindCare」。</li>
          <li>
            2. 添加「查找健康样本」：类型选「步数」，时间范围选「今天」；再添加「计算统计数据」，选择「总和」。
            如果你戴 Apple Watch，可以为「锻炼分钟数」重复这两步。
          </li>
          <li>
            3. 添加「打开 URL」，内容填写：
            <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-xl bg-secondary px-3 py-2 text-xs">
              {SITE}/sync#steps=【步数总和】&amp;exercise=【锻炼分钟数总和】
            </code>
            其中【】的部分，替换成上一步得到的变量。没有 Apple Watch 的话，只保留 steps 那一段即可。
          </li>
          <li>4. 运行一次，按提示允许读取健康数据；MindCare 打开后确认数字，点「保存」。</li>
          <li>5. 可以把它添加到主屏幕，或在「自动化」里设置每晚自动运行。</li>
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          不同 iOS 版本里，动作名称可能略有差别。数据放在链接 # 后面，浏览器不会把这部分发送给服务器，MindCare 读取后会立即从地址栏清除。不想折腾的话，也可以在首页手动选择今天的活动量。
        </p>
      </section>
    </div>
  );
}
