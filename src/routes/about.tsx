import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Phone, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEntries } from "@/hooks/use-entries";
import { downloadCsv, entryDay, isSample, type CsvDayInfo } from "@/lib/mood";
import { csvDayInfo, loadBody } from "@/lib/body";
import { csvCycleInfo, loadCycle } from "@/lib/cycle";
import { useCycle } from "@/hooks/use-cycle";
import { HOTLINE } from "@/lib/safety";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于 MindCare｜设计思路、数据与隐私" },
      {
        name: "description",
        content: "MindCare 为什么这样设计、你的数据如何处理，以及需要帮助时可以找谁。",
      },
      { property: "og:title", content: "关于 MindCare" },
      { property: "og:description", content: "设计思路、数据与隐私、寻求帮助。" },
    ],
  }),
  component: AboutPage,
});

const PAINS = [
  "情绪起伏频繁，但说不清是什么引起的。",
  "想缓一缓，却不知道从哪里开始；专业咨询又贵、又难预约。",
  "记录工具门槛高，很难坚持下来。",
];

const DECISIONS: [string, string][] = [
  ["5 秒完成记录", "只有“选一个情绪”是必填，强度、场景、原因和文字都可以跳过。"],
  ["点选代替长文字", "触发因素和场景都是标签，不写字也能得到分析。"],
  ["记录后只给一个首选", "紧绷或低落时先照顾身体（呼吸），舒展时延续状态（背景声），并说明为什么推荐。"],
  ["做完再评一次", "记下调节前后的强度，用你自己的数据验证什么方法有效。"],
  ["洞察附带依据", "每条结论都能展开，看到它来自哪些记录。"],
  [
    "把身体数据放进来",
    "借鉴健康 App：睡眠和活动量是影响情绪的重要因素。首页一键记录，也可以用 iPhone 快捷指令同步步数和锻炼时间。",
  ],
  [
    "今日卡片",
    "借鉴测测的每日仪式感：翻开今日一签，看到星座主题（趣味参考）和来自你记录的建议；再加上按天气给的穿搭，以及最多 3 件、做不完也没关系的小计划。最近的记录很沉重时，整张卡片换成支持性内容。",
  ],
  [
    "周期记录（可选）",
    "默认关闭，不问性别。积累两个完整周期后才提示你自己的规律，变化明显时建议就医；只存本机，可以单独删除，导出时默认不包含。",
  ],
  [
    "此刻的 BGM",
    "听歌是年轻人最常见的调节方式之一。只记录你主动分享的歌，不读取听歌记录，也不从歌推断心情。",
  ],
  [
    "场景维度借鉴微信状态",
    "年轻人描述自己时，常说“在搬砖”“在刷手机”，而不只是“我很焦虑”。知道在做什么时更轻松、什么时更消耗，比只看情绪更有用。",
  ],
];

const LOOP: [string, string][] = [
  ["记录", "情绪、强度、场景、原因"],
  ["理解", "触发因素、时段和场景的规律"],
  ["行动", "一个现在就能做的首选方式"],
  ["反馈", "做完再评一次强度"],
  ["学习", "下次优先推荐对你有效的方法"],
];

function AboutPage() {
  const { entries, ready, clearAll, restoreSamples } = useEntries();
  const [confirming, setConfirming] = useState(false);
  const [withCycle, setWithCycle] = useState(false);
  const cycle = useCycle();
  const sampleCount = entries.filter(isSample).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">关于 MindCare</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          一个低门槛的情绪日记与自我关怀工具。这里写下它为什么这样设计、你的数据如何处理，以及需要帮助时可以找谁。
        </p>
      </header>

      {/* ---------------- 设计思路 ---------------- */}
      <section id="design" className="card-soft scroll-mt-24 px-6 py-7 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">设计思路</h2>

        <h3 className="mt-6 text-sm font-semibold">想解决的问题</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
          {PAINS.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="text-muted-foreground">·</span>
              {p}
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-sm font-semibold">核心闭环</h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-5">
          {LOOP.map(([title, desc], i) => (
            <li key={title} className="rounded-2xl bg-primary-soft/60 px-4 py-3.5">
              <p className="text-xs text-muted-foreground">第 {i + 1} 步</p>
              <p className="mt-1 font-display text-base font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/75">{desc}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          最后一步会回到第一步：你评过分的调节方式，会影响下一次记录后的推荐。
        </p>

        <h3 className="mt-8 text-sm font-semibold">对应的设计决策</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {DECISIONS.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border px-4 py-3.5">
              <dt className="text-sm font-medium">{t}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 text-sm font-semibold">为什么现在用规则，而不是大模型</h3>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          现阶段的分析和推荐全部由可解释的规则完成：每条结论都能追溯到具体记录；计算在你的浏览器里完成，记录不需要离开你的设备；行为是确定的，安全兜底不依赖模型有没有“答对”。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          大模型最适合放在两个位置：从你写的一句话里理解触发因素，以及生成更贴合语境的回应。接入时的护栏是：危机识别在模型之前独立运行；模型出错时回退到规则；不做诊断、不给医疗建议；只有在你同意后才发送文字内容。
        </p>

        <h3 className="mt-8 text-sm font-semibold">安全边界</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
          <li>· 不做诊断，也不提供治疗。</li>
          <li>· 文字里出现伤害自己的信号时，用支持卡片替换普通推荐，并提供 {HOTLINE.number}；记录照常保存，不拦截、不说教。</li>
          <li>· 负向情绪强度达到 9 分以上时，在推荐里附上求助提示。</li>
          <li>· 最近 24 小时内的记录有危机信号或很强烈的负面情绪时，今日卡片整张换成支持性内容，不出现星座、穿搭和计划。</li>
          <li>· 星座和主题色只作趣味参考，不预测运势，也不评价好坏。</li>
          <li>· 关键词识别一定会有漏判，所以每个页面底部都常驻求助信息。</li>
        </ul>

        <h3 className="mt-8 text-sm font-semibold">后续规划</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
          <li>
            · 微信小程序：目标用户每天都在微信里，免安装能进一步降低门槛。在用户同意后通过订阅消息发送温和提醒，频率由用户决定，不做连续打卡式的施压；在授权后读取微信运动步数。
          </li>
          <li>· 原生 iOS App：通过 HealthKit 读取心情、睡眠、运动和周期数据，不再需要快捷指令。</li>
          <li>
            · 接入大模型：用来理解文字里的触发因素、生成贴合语境的回应。危机识别在模型之前独立运行，模型出错时回退到规则。
          </li>
          <li>· 心理测评：需要配套的计分解释和转介设计，不会只给一个分数。</li>
          <li>· 本地活动：与票务平台合作，接入真实的活动数据，替代现在的搜索页跳转。</li>
          <li>· 跨设备同步：只在用户明确同意后开启。</li>
        </ul>
      </section>

      {/* ---------------- 数据与隐私 ---------------- */}
      <section id="privacy" className="card-soft scroll-mt-24 px-6 py-7 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">数据与隐私</h2>
        <dl className="mt-5 space-y-5 text-sm leading-relaxed">
          <div>
            <dt className="font-medium">你的记录存在哪里</dt>
            <dd className="mt-1 text-foreground/80">
              情绪记录、睡眠、活动数据、周期记录和你填写的歌曲，都只保存在这台设备的浏览器里。换设备或换浏览器看不到；清除浏览器数据会一起删除。
            </dd>
          </div>
          <div>
            <dt className="font-medium">会不会上传</dt>
            <dd className="mt-1 text-foreground/80">
              本应用不会把你的记录内容发送到任何服务器。用快捷指令同步时，数据放在链接的 # 后面，浏览器不会把这部分发送给服务器，MindCare 读取后会立即从地址栏清除。网站托管平台可能会统计访问情况，比如页面被打开的次数；页面出错时可能上报错误描述和页面路径。这些都不包含你的记录内容。页面字体从 Google Fonts 加载。
            </dd>
          </div>
          <div>
            <dt className="font-medium">星座、城市和天气</dt>
            <dd className="mt-1 text-foreground/80">
              只保存你选的星座和城市，不保存生日（用生日算星座时，生日只在当下用一次）。选择城市后，会用城市坐标向 Open-Meteo 查询当天天气，不会发送你的任何记录。
            </dd>
          </div>
          <div>
            <dt className="font-medium">周期记录</dt>
            <dd className="mt-1 text-foreground/80">
              可选模块，默认关闭，也不会询问性别。开启后只保存每次的开始和结束日期，存在这台设备上；可以在洞察页单独删除，导出时默认不包含，需要你主动勾选。
            </dd>
          </div>
          <div>
            <dt className="font-medium">分析是怎么做的</dt>
            <dd className="mt-1 text-foreground/80">洞察和推荐都在你的浏览器里按规则计算，没有使用大模型。</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-2xl bg-secondary/60 px-5 py-5">
          <p className="text-sm">
            {ready
              ? `目前共有 ${entries.length} 条记录${sampleCount ? `，其中 ${sampleCount} 条是示例` : ""}。`
              : "正在读取你的记录……"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const info: CsvDayInfo = csvDayInfo(loadBody());
                if (withCycle) {
                  const days = [...new Set(entries.map(entryDay))];
                  for (const [d, c] of Object.entries(csvCycleInfo(days, loadCycle().periods))) {
                    info[d] = { ...info[d], ...c };
                  }
                }
                downloadCsv(entries, info);
                toast("情绪记录已导出为 CSV 🌿");
              }}
              disabled={!ready || entries.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> 导出我的记录
            </button>
            <button
              onClick={() => {
                restoreSamples();
                toast("示例记录已载入，你自己的记录都还在");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" /> {sampleCount ? "重新载入示例" : "载入示例记录"}
            </button>
            {!confirming && (
              <button
                onClick={() => setConfirming(true)}
                disabled={!ready || entries.length === 0}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> 删除全部记录
              </button>
            )}
          </div>
          {cycle.periods.length > 0 && (
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={withCycle} onChange={(e) => setWithCycle(e.target.checked)} />
              导出时包含周期记录（默认不包含）
            </label>
          )}
          {confirming && (
            <div className="mt-4 rounded-2xl border border-destructive/40 bg-card px-4 py-4" role="alertdialog">
              <p className="text-sm">
                确定删除全部 {entries.length} 条记录吗？睡眠、活动、周期记录和今日卡片的设置也会一起删除，无法恢复，建议先导出。
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    clearAll();
                    setConfirming(false);
                    toast("全部记录已删除");
                  }}
                  className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- 寻求帮助 ---------------- */}
      <section id="help" className="card-soft scroll-mt-24 px-6 py-7 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">寻求帮助</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          MindCare 只是自我关怀的小工具，不能替代专业帮助。如果你正处于危机，或有伤害自己的念头，请现在联系你信任的人，或者：
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={`tel:${HOTLINE.number}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            <Phone className="h-4 w-4" /> 拨打 {HOTLINE.number} {HOTLINE.name}
          </a>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">
          如果正处在紧急危险中，请立即拨打
          <a href="tel:120" className="mx-1 font-medium underline underline-offset-2">
            120
          </a>
          或
          <a href="tel:110" className="mx-1 font-medium underline underline-offset-2">
            110
          </a>
          。
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          如果情绪困扰持续影响睡眠、学习或工作，建议到医院的心理科或精神科寻求专业帮助。如果你是学生，学校的心理咨询中心通常也提供免费咨询。
        </p>
      </section>
    </div>
  );
}
