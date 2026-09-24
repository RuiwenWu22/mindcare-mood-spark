/**
 * 失恋恢复模式：MindCare 的一个情绪恢复场景，不是独立的恋爱产品。
 * 核心逻辑仍然是 Trigger → Emotion → Urge → Action → Feedback → Insight。
 * - 不强制断联：想联系时先停一下、理解自己，最终由用户自己决定
 * - 不记录对方的名字；所有内容只存在本机，不会自动发送给任何人
 * - "给自己留出空间的时间"只是记录，重新联系不会被表达成失败或清零
 */
import { dayKey } from "@/lib/mood";

/* ---------------- 选项 ---------------- */

export const RELATIONSHIP_STATUS = [
  { key: "just_ended", label: "刚刚分开" },
  { key: "paused", label: "正在暂停联系" },
  { key: "unsure", label: "关系状态不确定" },
  { key: "reduce", label: "想减少联系" },
  { key: "other", label: "其他" },
] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUS)[number]["key"];

export const URGE_TRIGGERS = [
  { key: "memory", label: "想起以前的事情" },
  { key: "saw_post", label: "看到 TA 的动态" },
  { key: "message", label: "收到 TA 的消息" },
  { key: "night_alone", label: "晚上一个人" },
  { key: "drink", label: "喝酒以后" },
  { key: "anniversary", label: "纪念日 / 特殊日期" },
  { key: "dream", label: "梦到 TA" },
  { key: "conflict", label: "和别人发生了不开心" },
  { key: "miss", label: "单纯很想念" },
  { key: "other", label: "其他" },
] as const;
export type UrgeTrigger = (typeof URGE_TRIGGERS)[number]["key"];
export const urgeTriggerLabel = (k: string) => URGE_TRIGGERS.find((t) => t.key === k)?.label ?? k;

export const DESIRES = [
  { key: "respond", label: "想被回应" },
  { key: "still_care", label: "想确认 TA 还在不在乎" },
  { key: "explanation", label: "想得到一个解释" },
  { key: "possibility", label: "想知道还有没有可能" },
  { key: "lonely", label: "只是现在很孤独" },
  { key: "certainty", label: "想结束这种不确定感" },
  { key: "other", label: "其他" },
] as const;
export type Desire = (typeof DESIRES)[number]["key"];
export const desireLabel = (k: string) => DESIRES.find((d) => d.key === k)?.label ?? k;

export const MESSAGE_FEELINGS = ["期待", "紧张", "难过", "生气", "混乱", "平静"] as const;
export const AFTER_CONTACT_FEELINGS = ["轻松一些", "更难受了", "有点后悔", "说不清", "还好"] as const;
export const UNSENT_EMOTIONS = ["想念", "难过", "委屈", "不甘", "混乱", "平静"] as const;

export type MessageAction = "wait" | "later" | "reply";
export const MESSAGE_ACTIONS: { key: MessageAction; label: string }[] = [
  { key: "wait", label: "先不回复" },
  { key: "later", label: "晚一点再回复" },
  { key: "reply", label: "我需要回复" },
];

/* ---------------- 数据结构（字段名与产品文档一致） ---------------- */

export type RecoveryProfile = {
  enabled: boolean;
  relationship_status: RelationshipStatus;
  no_contact_enabled: boolean;
  /** 给自己留出空间从什么时候开始算（上次主动联系的时间） */
  no_contact_start_time?: string;
  enabled_at: string;
};

/** save：先保存，不发送；pause：10 分钟后再决定；contact：我还是决定联系；none：还没选 */
export type UrgeAction = "none" | "save" | "pause" | "contact";

export type ContactUrge = {
  id: string;
  created_at: string;
  urge_before: number;
  urge_after?: number;
  triggers: UrgeTrigger[];
  unsent_text: string;
  desired_response?: Desire;
  action_taken: UrgeAction;
  /** 选了"10 分钟后再决定"时，什么时候回来看看 */
  revisit_at?: string;
};

export type UnsentMessage = {
  id: string;
  created_at: string;
  content: string;
  emotion?: string;
  urge_score?: number;
  /** 来自"我现在很想联系 TA"时，关联那次联系冲动（用来显示前后变化） */
  urge_id?: string;
  ai_summary: { feelings: string[]; expectation: string | null };
};

export type IncomingMessageReview = {
  id: string;
  created_at: string;
  original_message: string;
  user_emotions: string[];
  action_choice?: MessageAction;
};

export type RealityReminder = { id: string; created_at: string; content: string };

/** 主动联系了 TA：不算失败，只是看看当时发生了什么 */
export type ContactEvent = {
  id: string;
  created_at: string;
  triggers: UrgeTrigger[];
  urge_id?: string;
  feeling_after?: string[];
};

export type RecoveryData = {
  profile: RecoveryProfile | null;
  urges: ContactUrge[];
  unsent: UnsentMessage[];
  reviews: IncomingMessageReview[];
  reminders: RealityReminder[];
  contacts: ContactEvent[];
};

/* ---------------- 存储 ---------------- */

const KEY = "mindcare.recovery.v1";
export const RECOVERY_EVENT = "mindcare:recovery-changed";
const EMPTY: RecoveryData = { profile: null, urges: [], unsent: [], reviews: [], reminders: [], contacts: [] };

export const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function loadRecovery(): RecoveryData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<RecoveryData> | null;
    if (!raw || typeof raw !== "object") return EMPTY;
    return {
      profile: raw.profile && typeof raw.profile === "object" ? raw.profile : null,
      urges: arr<ContactUrge>(raw.urges).filter((u) => typeof u?.id === "string" && typeof u.urge_before === "number"),
      unsent: arr<UnsentMessage>(raw.unsent).filter((u) => typeof u?.content === "string"),
      reviews: arr<IncomingMessageReview>(raw.reviews).filter((r) => typeof r?.original_message === "string"),
      reminders: arr<RealityReminder>(raw.reminders).filter((r) => typeof r?.content === "string"),
      contacts: arr<ContactEvent>(raw.contacts).filter((c) => typeof c?.created_at === "string"),
    };
  } catch {
    return EMPTY;
  }
}

export function saveRecovery(next: RecoveryData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECOVERY_EVENT));
}

/** 读—改—写，避免多个组件同时修改时互相覆盖 */
export function updateRecovery(fn: (d: RecoveryData) => RecoveryData) {
  saveRecovery(fn(loadRecovery()));
}

export function clearRecovery() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(RECOVERY_EVENT));
}

/* ---------------- 给自己留出空间的天数 ---------------- */

const DAY = 86_400_000;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** 距离开始计算的那天过了几个日历日（今天开始 = 0） */
export function spaceDays(start: string | undefined, now: Date = new Date()): number | null {
  if (!start) return null;
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return null;
  return Math.max(0, Math.round((midnight(now) - midnight(s)) / DAY));
}

/** "昨晚 23:18"、"今天 09:02"、"9 月 20 日 21:40" */
export function whenText(iso: string, now: Date = new Date()) {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const diff = Math.round((midnight(now) - midnight(d)) / DAY);
  const night = d.getHours() >= 18 || d.getHours() < 5;
  if (diff === 0) return `${night ? "今晚" : "今天"} ${hm}`;
  if (diff === 1) return `${night ? "昨晚" : "昨天"} ${hm}`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${hm}`;
}

export function dayWord(iso: string, now: Date = new Date()) {
  const diff = Math.round((midnight(now) - midnight(new Date(iso))) / DAY);
  return diff === 0 ? "今天" : diff === 1 ? "昨天" : `${diff} 天前`;
}

export const localDay = (iso: string) => dayKey(new Date(iso));
