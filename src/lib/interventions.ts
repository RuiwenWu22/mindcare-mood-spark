/**
 * 调节记录：每做完一次调节（呼吸、背景声、轻运动、今日小计划里的一件事），
 * 记下调节前后的强度，用来验证"什么对我有效"。只存在本机。
 * 字段名和产品文档保持一致，方便以后迁移到服务端。
 */

export type InterventionType = "breathing" | "ambient" | "movement" | "activity";

export type Intervention = {
  id: string;
  intervention_type: InterventionType;
  /** 例如"2 分钟慢呼吸" */
  intervention_name: string;
  /** 1–5 */
  before_score: number;
  /** 1–5 */
  after_score: number;
  /** 秒 */
  duration: number;
  /** ISO 时间 */
  timestamp: string;
  linked_mood_record_id: string;
};

const KEY = "mindcare.interventions.v1";
export const INTERVENTIONS_EVENT = "mindcare:interventions-changed";

const TYPES = new Set<InterventionType>(["breathing", "ambient", "movement", "activity"]);
const score = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

function isValid(x: unknown): x is Intervention {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r["id"] === "string" &&
    TYPES.has(r["intervention_type"] as InterventionType) &&
    typeof r["intervention_name"] === "string" &&
    score(r["before_score"]) &&
    score(r["after_score"]) &&
    typeof r["duration"] === "number" &&
    typeof r["timestamp"] === "string" &&
    typeof r["linked_mood_record_id"] === "string"
  );
}

export function loadInterventions(): Intervention[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
}

function save(list: Intervention[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(INTERVENTIONS_EVENT));
}

/** 追加若干条（按 id 去重），迁移旧数据时也用它 */
export function appendInterventions(items: Intervention[]) {
  if (typeof window === "undefined" || items.length === 0) return;
  const list = loadInterventions();
  const ids = new Set(list.map((i) => i.id));
  save([...list, ...items.filter((i) => !ids.has(i.id))]);
}

export function addIntervention(input: Omit<Intervention, "id" | "timestamp"> & { timestamp?: string }): Intervention {
  const item: Intervention = {
    ...input,
    id: `iv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  appendInterventions([item]);
  return item;
}

/** 删除某条情绪记录时，一起删除和它关联的调节记录 */
export function removeInterventionsFor(recordId: string) {
  if (typeof window === "undefined") return;
  const list = loadInterventions();
  const next = list.filter((i) => i.linked_mood_record_id !== recordId);
  if (next.length !== list.length) save(next);
}

export function clearInterventions() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(INTERVENTIONS_EVENT));
}

/** 反馈时改选了分数：更新同一条，而不是新增 */
export function setAfterScore(id: string, after: number) {
  if (typeof window === "undefined") return;
  const list = loadInterventions();
  save(list.map((i) => (i.id === id ? { ...i, after_score: Math.min(5, Math.max(1, Math.round(after))) } : i)));
}
