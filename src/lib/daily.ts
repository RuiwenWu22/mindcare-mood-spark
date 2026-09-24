/**
 * 今日卡片 = 今日一签 + 今日穿搭 + 今日小计划。纯函数，方便测试。
 * 边界：
 * - 最近 24 小时内你自己的记录有危机信号或很强烈的负面情绪时，整张卡片换成支持性内容
 * - 星座只提供主题和主题色（趣味参考），不预测、不评价运势
 * - 一签的建议可以引用示例数据，但会写明；小计划只用你自己的数据（示例说明不了你的今天）
 */
import {
  activityStats,
  dayKey,
  isSample,
  moodOf,
  songsByMood,
  sortByNewest,
  whatWorks,
  type Entry,
} from "@/lib/mood";
import { activityLevelOf, bodyFindings, sleepOf, type DayLog } from "@/lib/body";
import { assessRisk } from "@/lib/safety";
import { accessoryFor, isSignKey, signOf, themeFor, type SignKey } from "@/lib/zodiac";
import { clothesFor, describeSky, goodForOutdoors, type Weather } from "@/lib/weather";
import { cycleNote, type Period } from "@/lib/cycle";

/* ---------------- 个人设置与当天状态（只存本机） ---------------- */

export type Profile = { sign?: SignKey; declined?: boolean; city?: string };
export type DailyState = { date: string; flipped: boolean; done: string[]; rest: boolean };

const PROFILE_KEY = "mindcare.profile.v1";
const DAILY_KEY = "mindcare.daily.v1";
export const DAILY_EVENT = "mindcare:daily-changed";

const read = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
};
const write = (key: string, v: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new Event(DAILY_EVENT));
};

export function loadProfile(): Profile {
  const p = read<Record<string, unknown>>(PROFILE_KEY) ?? {};
  const out: Profile = {};
  if (isSignKey(p["sign"])) out.sign = p["sign"];
  if (p["declined"] === true) out.declined = true;
  if (typeof p["city"] === "string") out.city = p["city"];
  return out;
}
export const saveProfile = (p: Profile) => write(PROFILE_KEY, p);

export function loadDailyState(today: string = dayKey()): DailyState {
  const s = read<DailyState>(DAILY_KEY);
  return s && s.date === today
    ? { date: today, flipped: !!s.flipped, done: Array.isArray(s.done) ? s.done : [], rest: !!s.rest }
    : { date: today, flipped: false, done: [], rest: false };
}
export const saveDailyState = (s: DailyState) => write(DAILY_KEY, s);

export function clearDailyData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(DAILY_KEY);
  window.dispatchEvent(new Event(DAILY_EVENT));
}

/* ---------------- 链接 ---------------- */

/** 高德地图关键词搜索；手机上会尝试调起高德 App，路线由地图 App 规划 */
export function mapSearchUrl(keyword: string, city?: string) {
  const q = new URLSearchParams({ keyword, view: "map", src: "mindcare", callnative: "1" });
  if (city) q.set("city", city);
  return `https://uri.amap.com/search?${q.toString()}`;
}

export type WeekendType = "quiet" | "lively";

export function weekendLinks(type: WeekendType, city?: string) {
  const m = (label: string, k: string) => ({ label, href: mapSearchUrl(k, city) });
  return type === "quiet"
    ? [m("附近的展览", "展览"), m("附近的书店", "书店"), m("附近的公园", "公园")]
    : [
        m("演出场馆", "剧场"),
        m("Livehouse", "livehouse"),
        m("体育场馆", "体育馆"),
        { label: "去大麦网看演出", href: "https://www.damai.cn/" },
      ];
}

/* ---------------- 卡片 ---------------- */

export type PlanItem = {
  id: string;
  title: string;
  why: string;
  action?: { label: string; href: string; external: boolean };
  weekend?: WeekendType;
};

export type DailyCard =
  | { mode: "support" }
  | {
      mode: "normal";
      theme?: { signName: string; symbol: string; title: string; line: string; color: string; hex: string };
      advice: string;
      sleepLine?: string;
      cycleLine?: string;
      evidence: string[];
      outfit: { color?: { name: string; hex: string }; clothes?: string[]; accessory?: string; sky?: string };
      plan: PlanItem[];
    };

const QUESTIONS = [
  "今天有什么让你感到被照顾？",
  "此刻，你最需要的是什么？",
  "最近一次真心笑出来，是因为什么？",
  "今天有没有一件小事，做完会让你轻松一点？",
  "如果对朋友说一句鼓励的话，你会说什么？也对自己说一遍。",
  "今天身体哪里最累？可以怎么照顾它？",
  "有什么是你今天可以先放下的？",
];

const SLEEP_LINE = {
  good: "昨晚睡得不错。精力好的时候，把最重要的一件事放在上午。",
  ok: "昨晚睡得一般，今天别给自己排得太满。",
  poor: "昨晚没睡好，今天对自己宽容一点，午后可以闭眼休息 10 分钟。",
} as const;

const dayIndex = (d: Date) => Math.floor(d.getTime() / 86_400_000);

export function buildDailyCard(input: {
  entries: Entry[];
  logs: DayLog[];
  profile: Profile;
  weather: Weather | null;
  /** 只有开启了周期记录时才传入 */
  periods?: Period[];
  now?: Date;
}): DailyCard {
  const now = input.now ?? new Date();
  const today = dayKey(now);
  const own = sortByNewest(input.entries.filter((e) => !isSample(e)));
  const ownLogs = input.logs.filter((l) => !l.sample);

  // 1) 安全优先：最近 24 小时内任何一条记录很沉重，都不做一签、穿搭和计划
  //    （之后又记了一条轻松的，也不代表危机已经过去）
  const latest = own[0];
  const recent = own.filter((e) => now.getTime() - new Date(e.createdAt).getTime() < 24 * 3_600_000);
  if (recent.some((e) => assessRisk({ valence: moodOf(e.mood).valence, intensity: e.intensity, note: e.note }) !== "normal")) {
    return { mode: "support" };
  }

  const evidence: string[] = [];

  // 2) 星座主题（仅作趣味参考）
  let theme: Extract<DailyCard, { mode: "normal" }>["theme"];
  if (input.profile.sign) {
    const s = signOf(input.profile.sign);
    const th = themeFor(s.key, now);
    theme = { signName: s.name, symbol: s.symbol, ...th };
    evidence.push(`今日主题来自${s.name}，按日期轮换，仅作趣味参考。`);
  }

  // 3) 一签的建议：来自记录，你自己的数据优先，示例数据会写明
  const candidates: { text: string; ev: string }[] = [];
  const ownBest = whatWorks(own).find((m) => m.avgDrop >= 1);
  const best = ownBest ?? whatWorks(input.entries.filter(isSample)).find((m) => m.avgDrop >= 1);
  if (best) {
    candidates.push({
      text: `紧绷的时候，先试试「${best.label}」。`,
      ev: `${ownBest ? "在你的记录里" : "在示例记录里"}，它平均让强度下降 ${best.avgDrop}（${best.count} 次）。`,
    });
  }
  const bright = activityStats(input.entries).find((s) => s.count >= 2 && s.bright / s.count >= 0.6);
  if (bright) {
    const hasSample = input.entries.some((e) => e.activity === bright.key && isSample(e));
    candidates.push({
      text: `今天可以留一点时间给「${bright.label}」。`,
      ev: `场景为「${bright.label}」的 ${bright.count} 条记录里，${bright.bright} 条是舒展的${hasSample ? "（含示例记录）" : ""}。`,
    });
  }
  const songs = songsByMood(input.entries).bright;
  const song = songs.find((s) => !s.sampleOnly) ?? songs[0];
  if (song) {
    candidates.push({
      text: `需要一点亮色的时候，听听《${song.title}》。`,
      ev: song.sampleOnly ? "示例记录里，心情舒展的时候听过这首。" : "你心情舒展的时候听过这首。",
    });
  }
  // 睡眠规律：先看你自己的数据，没有时才用示例，并写明
  const ownSleepEv = bodyFindings(own, ownLogs).evidence.find((e) => e.startsWith("睡得"));
  const sampleSleepEv = ownSleepEv
    ? undefined
    : bodyFindings(input.entries.filter(isSample), input.logs.filter((l) => l.sample)).evidence.find((e) =>
        e.startsWith("睡得"),
      );
  const sleepEv = ownSleepEv ?? (sampleSleepEv ? `示例记录里，${sampleSleepEv}` : undefined);
  if (sleepEv) {
    candidates.push({ text: "今晚早点休息：睡得好的日子，心情通常更轻松。", ev: sleepEv });
  }
  let advice: string;
  if (candidates.length) {
    const c = candidates[dayIndex(now) % candidates.length]!;
    advice = c.text;
    evidence.push(c.ev);
  } else {
    advice = QUESTIONS[dayIndex(now) % QUESTIONS.length]!;
    evidence.push("最近的记录还不多，所以今天给你一个自我觉察的问题。");
  }

  // 4) 睡眠提醒：只看你今天自己选的
  const todayLog = ownLogs.find((l) => l.date === today);
  let sleepLine: string | undefined;
  if (todayLog?.sleep) {
    sleepLine = SLEEP_LINE[todayLog.sleep];
    evidence.push(`今天你选了「睡得${sleepOf(todayLog.sleep).label}」。`);
  }

  // 4.5) 周期提醒：只在开启了周期记录、且规律已经稳定（或正在经期中）时出现
  let cycleLine: string | undefined;
  if (input.periods) {
    const c = cycleNote(input.periods, today);
    if (c) {
      cycleLine = c.line;
      evidence.push(c.evidence);
    }
  }

  // 5) 穿搭：主题色来自星座，衣服来自天气
  const w = input.weather;
  const sky = w ? describeSky(w.code) : null;
  const outfit: Extract<DailyCard, { mode: "normal" }>["outfit"] = {};
  if (theme) {
    outfit.color = { name: theme.color, hex: theme.hex };
    outfit.accessory = accessoryFor(now, w?.max);
  }
  if (w && sky) {
    outfit.clothes = clothesFor(w);
    outfit.sky = `${sky.emoji} ${sky.label} ${w.min}–${w.max}°C`;
  }

  // 6) 今日小计划：最多 3 件，只用你自己的数据
  const city = input.profile.city;
  const map = (k: string) => ({ label: "在地图上找", href: mapSearchUrl(k, city), external: true });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const level = activityLevelOf(todayLog) ?? activityLevelOf(ownLogs.find((l) => l.date === dayKey(yesterday)));
  const data: PlanItem[] = [];
  if (todayLog?.sleep === "poor") data.push({ id: "sleep-early", title: "今晚 11 点前放下手机", why: "昨晚睡得很差" });
  if (level === "low") {
    if (w && sky && !goodForOutdoors(w)) {
      data.push({ id: "indoor", title: "去附近的书店或商场逛逛", why: `最近动得很少，外面${sky.label}`, action: map("书店") });
    } else {
      data.push({
        id: "walk",
        title: "出门走 15 分钟，去附近的公园",
        why: w && sky ? `最近动得很少，今天${sky.label}，${w.max}°C` : "最近动得很少",
        action: map("公园"),
      });
    }
  }
  const threeDays = now.getTime() - 3 * 86_400_000;
  const recentHeavy = own.filter((e) => new Date(e.createdAt).getTime() > threeDays && moodOf(e.mood).valence < 0);
  if (recentHeavy.some((e) => e.triggers.includes("work"))) {
    data.push({ id: "split", title: "把最难的任务拆成 25 分钟一段", why: "最近偏消耗的记录，常和学业 / 工作有关" });
  }
  if (ownBest) {
    data.push({
      id: "best",
      title: `紧绷时，先做一次「${ownBest.label}」`,
      why: `它曾让你的强度平均下降 ${ownBest.avgDrop}`,
      action: { label: "去做", href: "/care", external: false },
    });
  }
  const scroll = activityStats(own.slice(0, 10)).find((s) => s.key === "scroll" && s.count >= 2 && s.heavy / s.count >= 0.6);
  if (scroll) data.push({ id: "phone", title: "睡前把手机放到房间另一头", why: "刷手机时的记录大多偏消耗" });

  const plan = data.slice(0, 2);
  if (plan.length < 2) {
    plan.push({ id: "meal", title: "好好吃一顿饭", why: "照顾好身体，心情也会跟着稳一点", action: map("美食") });
  }
  const weekday = now.getDay();
  if ([4, 5, 6, 0].includes(weekday)) {
    const type: WeekendType =
      latest && moodOf(latest.mood).valence === 1 && todayLog?.sleep !== "poor" ? "lively" : "quiet";
    plan.push({
      id: "weekend",
      title: weekday === 6 || weekday === 0 ? "今天去参加一个线下活动" : "这周末去参加一个线下活动",
      why: type === "quiet" ? "最近能量偏低，挑个安静点的地方" : "状态不错，可以去热闹一点的地方",
      weekend: type,
    });
  } else {
    plan.push({ id: "joy", title: "做一件你喜欢的小事", why: "不为什么，只是因为你值得" });
  }

  return {
    mode: "normal",
    ...(theme ? { theme } : {}),
    advice,
    ...(sleepLine ? { sleepLine } : {}),
    ...(cycleLine ? { cycleLine } : {}),
    evidence,
    outfit,
    plan: plan.slice(0, 3),
  };
}
