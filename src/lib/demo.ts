/**
 * 示例洞察用的固定数据：只在内存里，不会写入你的记录。
 * 设计成能完整展示产品价值：情绪趋势、触发因素、AI 本周发现、调节前后的变化。
 */
import type { Entry, MoodKey, TriggerKey, ActivityKey } from "@/lib/mood";
import type { Intervention } from "@/lib/interventions";
import type { DayLog, SleepQuality } from "@/lib/body";
import { dayKey } from "@/lib/mood";
import type { Song } from "@/lib/songs";
import type { ContactUrge, UrgeTrigger } from "@/lib/recovery";
import type { RecordType } from "@/lib/scenarios";

const at = (now: Date, daysAgo: number, hour: number, minute: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

type Row = [string, number, number, number, MoodKey, number, TriggerKey[], string, ActivityKey, Song?];

const ROWS: Row[] = [
  ["a", 1, 21, 10, "anxious", 4, ["work"], "明天要汇报，PPT 还有一半没做完。", "work"],
  ["b", 1, 12, 30, "happy", 4, ["body"], "午休去跑了 3 公里，脑子清爽了很多。", "exercise", { title: "倔强", artist: "五月天" }],
  ["c", 2, 22, 30, "anxious", 4, ["work"], "加班到很晚，回家还在想明天的会。", "bed"],
  ["d", 3, 14, 20, "calm", 3, ["relationship"], "中午和同事一起吃饭，聊得很开心。", "social", { title: "稳稳的幸福", artist: "陈奕迅" }],
  ["e", 3, 20, 40, "anxious", 3, ["study"], "论文还有一章没写，越想越着急。", "study"],
  ["f", 4, 23, 10, "anxious", 5, ["work", "sleep"], "睡不着，一直在想项目的截止时间。", "bed"],
  ["j", 4, 9, 30, "irritated", 3, ["sleep"], "没睡好，早上起来就很烦。", "rest"],
  ["g", 5, 16, 0, "anxious", 3, [], "下午有点心慌，说不上来为什么。", "work"],
  ["h", 5, 19, 30, "sad", 3, ["relationship"], "和朋友有点误会，心里闷闷的。", "rest"],
  ["k", 5, 20, 30, "irritated", 4, ["family"], "妈妈又打电话问我什么时候回家，说着说着就不开心了。", "rest"],
  ["i", 6, 10, 0, "okay", 3, [], "周末睡了个懒觉，慢慢吃了早饭。", "eat", { title: "晴天", artist: "周杰伦" }],
];

/** 在「特别时期」里记下的示例：记录类型和"发生了什么" */
const TYPED: Record<string, [RecordType, string]> = {
  a: ["work", "overload"],
  c: ["work", "overload"],
  f: ["work", "drain"],
  k: ["family", "pushed"],
};

/** [记录, 方式, 类型, 前, 后, 秒] */
const DONE: [string, string, Intervention["intervention_type"], number, number, number][] = [
  ["a", "2 分钟慢呼吸", "breathing", 4, 3, 120],
  ["c", "2 分钟慢呼吸", "breathing", 4, 3, 120],
  ["f", "2 分钟慢呼吸", "breathing", 5, 3, 120],
  ["e", "散步 10 分钟", "movement", 3, 3, 600],
  ["g", "散步 10 分钟", "movement", 3, 2, 600],
  ["h", "轻柔琴音 10 分钟", "ambient", 3, 3, 600],
];

const SLEEP: [number, SleepQuality, number][] = [
  [1, "ok", 7200],
  [2, "poor", 3100],
  [3, "good", 9800],
  [4, "poor", 2600],
  [5, "ok", 5400],
  [6, "good", 8200],
];

export type DemoData = { entries: Entry[]; interventions: Intervention[]; logs: DayLog[] };

export function demoData(now: Date = new Date()): DemoData {
  const entries: Entry[] = ROWS.map(([id, d, h, m, mood, intensity, triggers, note, activity, song]) => ({
    id: `demo-${id}`,
    createdAt: at(now, d, h, m).toISOString(),
    mood,
    intensity,
    note,
    triggers,
    activity,
    scale: 5,
    record_type: TYPED[id]?.[0] ?? "daily",
    ...(TYPED[id] ? { event: TYPED[id]![1] } : {}),
    ...(song ? { song } : {}),
  }));
  const byId = new Map(ROWS.map((r) => [r[0], r]));
  const interventions: Intervention[] = DONE.map(([rid, name, type, before, after, duration], i) => {
    const r = byId.get(rid)!;
    return {
      id: `demo-iv-${i}`,
      intervention_type: type,
      intervention_name: name,
      before_score: before,
      after_score: after,
      duration,
      timestamp: new Date(at(now, r[1], r[2], r[3]).getTime() + 5 * 60_000).toISOString(),
      linked_mood_record_id: `demo-${rid}`,
    };
  });
  const logs: DayLog[] = SLEEP.map(([d, sleep, steps]) => ({
    date: dayKey(at(now, d, 12, 0)),
    sleep,
    steps,
    source: "shortcut",
  }));
  return { entries, interventions, logs };
}

/* ---------------- 失恋恢复模式的示例 ---------------- */

/** [几天前, 时, 冲动前, 停一下后, 触发, 没有发送的话] */
const URGE_ROWS: [number, number, number, number | null, UrgeTrigger[], string][] = [
  [20, 23, 5, 3, ["night_alone"], "好想你，今天又翻到我们以前的照片。"],
  [19, 22, 5, 4, ["night_alone", "memory"], "我们真的回不去了吗？"],
  [17, 1, 4, null, ["dream"], ""],
  [16, 21, 4, 3, ["saw_post"], "看到你过得挺好，我也不知道该难过还是该放心。"],
  [15, 14, 4, null, ["memory"], ""],
  [13, 23, 4, 2, ["night_alone"], "你还会想起我吗？"],
  [11, 20, 4, 3, ["night_alone", "drink"], ""],
  [9, 18, 3, null, ["saw_post"], ""],
  [5, 22, 3, 2, ["night_alone"], "今天又想你了，但我先写在这里。"],
  [2, 21, 3, 2, ["night_alone"], "其实我只是想被关心一下。"],
];

/** 示例的联系冲动记录：三周里慢慢变少、变轻，多数发生在晚上 */
export function recoveryDemo(now: Date = new Date()): { urges: ContactUrge[]; enabledAt: string } {
  const urges = URGE_ROWS.map(([d, h, before, after, triggers, text], i) => ({
    id: `demo-urge-${i}`,
    created_at: at(now, d, h, 10).toISOString(),
    urge_before: before,
    ...(after !== null ? { urge_after: after } : {}),
    triggers,
    unsent_text: text,
    action_taken: (after !== null ? "save" : "none") as ContactUrge["action_taken"],
  }));
  return { urges, enabledAt: at(now, 22, 9, 0).toISOString() };
}
