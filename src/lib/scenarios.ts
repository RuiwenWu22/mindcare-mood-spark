/**
 * 特别时期：感情变化 / 工作压力 / 家庭烦恼。
 * 它们是「今天」里的场景入口，不是独立产品：产生的记录统一进入「记录」，
 * 统计统一进入「洞察 → 触发因素」。
 */
import type { TriggerKey } from "@/lib/mood";

/** 记录类型：日常，或者某个特别时期里记下的 */
export type RecordType = "daily" | "relationship" | "work" | "family";

export const RECORD_TYPES: { key: RecordType; label: string; emoji: string }[] = [
  { key: "daily", label: "日常", emoji: "🌿" },
  { key: "relationship", label: "感情", emoji: "💔" },
  { key: "work", label: "工作", emoji: "💼" },
  { key: "family", label: "家庭", emoji: "🏠" },
];
export const recordTypeOf = (k: RecordType) => RECORD_TYPES.find((t) => t.key === k)!;
export const isRecordType = (v: unknown): v is RecordType => RECORD_TYPES.some((t) => t.key === v);

export type ScenarioEvent = { key: string; label: string; /** AI 整理时的说法 */ phrase?: string };

export type Scenario = {
  type: "work" | "family";
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  trigger: TriggerKey;
  events: ScenarioEvent[];
  placeholder: string;
  empty: string;
};

export const SCENARIOS: Record<"work" | "family", Scenario> = {
  work: {
    type: "work",
    emoji: "💼",
    title: "工作压力",
    desc: "被否定、工作失误、持续内耗，或突然很想辞职",
    cta: "梳理一下",
    trigger: "work",
    events: [
      { key: "rejected", label: "方案被否", phrase: "方案被否这件事" },
      { key: "criticized", label: "被否定或批评", phrase: "被否定、被批评的感受" },
      { key: "mistake", label: "工作失误", phrase: "工作上的失误" },
      { key: "overload", label: "任务太多", phrase: "堆在一起的任务" },
      { key: "feedback", label: "领导反馈", phrase: "领导的反馈" },
      { key: "colleague", label: "同事关系", phrase: "和同事之间的关系" },
      { key: "drain", label: "持续内耗", phrase: "持续的内耗" },
      { key: "quit", label: "很想辞职", phrase: "对现在这份工作积累下来的疲惫" },
      { key: "other", label: "其他" },
    ],
    placeholder: "例如：领导说这一版还需要补数据……",
    empty: "下次工作让你有些消耗时，可以从「今天 → 特别时期 → 工作压力」开始记录。",
  },
  family: {
    type: "family",
    emoji: "🏠",
    title: "家庭烦恼",
    desc: "争吵、催促、比较，或不知道如何表达自己的边界",
    cta: "整理一下",
    trigger: "family",
    events: [
      { key: "quarrel", label: "发生了争吵", phrase: "和家人的争吵" },
      { key: "pushed", label: "被催促", phrase: "被催促的压力" },
      { key: "compared", label: "被拿来比较", phrase: "被拿来比较的感受" },
      { key: "misunderstood", label: "不被理解", phrase: "不被理解的委屈" },
      { key: "boundary", label: "说不出自己的边界", phrase: "说不出口的边界" },
      { key: "worry", label: "担心家人", phrase: "对家人的担心" },
      { key: "other", label: "其他" },
    ],
    placeholder: "例如：妈妈又问我什么时候回家，说着说着就吵起来了……",
    empty: "下次家里的事让你有些难受时，可以从「今天 → 特别时期 → 家庭烦恼」开始记录。",
  },
};

export const eventOf = (type: RecordType | undefined, key: string | undefined): ScenarioEvent | undefined =>
  type === "work" || type === "family" ? SCENARIOS[type].events.find((e) => e.key === key) : undefined;

export const RELATIONSHIP_EMPTY = "下次想联系 TA，或者又想起 TA 时，可以从「今天 → 特别时期 → 感情变化」开始记录。";
