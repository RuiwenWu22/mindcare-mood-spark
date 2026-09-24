/**
 * 星座只提供今日主题和主题色，仅作趣味参考：不预测、不评价运势好坏。
 * 只保存用户选定的星座，不保存生日。
 */

export type SignKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

type Theme = { title: string; line: string; color: string; hex: string };

export type Sign = {
  key: SignKey;
  name: string;
  symbol: string;
  /** 起始日 [月, 日] */
  start: [number, number];
  themes: [Theme, Theme, Theme];
};

const t = (title: string, line: string, color: string, hex: string): Theme => ({ title, line, color, hex });

/** 按一年中的顺序排列（从摩羯的后半段开始），便于按日期查找 */
export const SIGNS: Sign[] = [
  { key: "aquarius", name: "水瓶座", symbol: "♒", start: [1, 20], themes: [t("独处", "给自己留一段不被打扰的时间。", "冰川蓝", "#A9CFE0"), t("新视角", "换个角度看看困扰你的事。", "银灰", "#C0C4C8"), t("打个招呼", "和一个很久没联系的朋友打个招呼。", "湖水绿", "#6FB7B0")] },
  { key: "pisces", name: "双鱼座", symbol: "♓", start: [2, 19], themes: [t("感受", "允许自己感受此刻的情绪，不急着改变它。", "雾紫", "#B6A7CC"), t("听首歌", "听一首让你安静下来的歌。", "海盐蓝", "#9CC3D0"), t("发会儿呆", "花几分钟发会儿呆，也是一种休息。", "珍珠白", "#EFEAE2")] },
  { key: "aries", name: "白羊座", symbol: "♈", start: [3, 21], themes: [t("行动", "先做最小的一步，比想清楚再开始更容易。", "珊瑚红", "#E8765C"), t("热身", "给身体十分钟动一动，状态会跟着起来。", "暖橙", "#E9A15B"), t("直接", "有想说的话，今天可以简单直接地说出来。", "酒红", "#9B3D4A")] },
  { key: "taurus", name: "金牛座", symbol: "♉", start: [4, 20], themes: [t("稳定", "按自己的节奏来，慢一点也没关系。", "橄榄绿", "#8A9A5B"), t("好好吃饭", "认真吃一顿饭，也是在照顾自己。", "燕麦色", "#D8C8A8"), t("小确幸", "给自己留一个小小的享受。", "奶茶色", "#C9A98B")] },
  { key: "gemini", name: "双子座", symbol: "♊", start: [5, 21], themes: [t("说出来", "主动找一个人聊十分钟。", "雾霾蓝", "#8FA6B8"), t("好奇", "试一件从没做过的小事。", "柠檬黄", "#E8D66C"), t("记下来", "把脑子里的想法写成三行字。", "薄荷绿", "#A8D5BA")] },
  { key: "cancer", name: "巨蟹座", symbol: "♋", start: [6, 22], themes: [t("照顾自己", "像照顾朋友一样照顾一下自己。", "奶油白", "#F3EBDD"), t("回到熟悉", "去一个让你安心的地方待一会儿。", "米杏", "#E6D3B3"), t("联系在意的人", "给在意的人发一条消息。", "藕粉", "#D8B4B0")] },
  { key: "leo", name: "狮子座", symbol: "♌", start: [7, 23], themes: [t("肯定自己", "写下今天做得不错的一件事。", "金棕", "#C8923E"), t("表达", "把你的想法大方地分享出来。", "砖红", "#B5543C"), t("休息", "不必一直发光，休息也是能量的一部分。", "焦糖色", "#B07A4A")] },
  { key: "virgo", name: "处女座", symbol: "♍", start: [8, 23], themes: [t("整理", "花十分钟整理桌面或待办，心也会跟着清爽。", "鼠尾草绿", "#9CAF88"), t("放过自己", "今天允许有一件事做得不完美。", "浅卡其", "#CDBE9A"), t("拆小", "把大任务拆成一个个小步骤。", "雾灰", "#A7A9AC")] },
  { key: "libra", name: "天秤座", symbol: "♎", start: [9, 23], themes: [t("平衡", "在忙碌里给自己留一段空白。", "樱花粉", "#EBC1C8"), t("美好", "留意身边一件美好的小事。", "淡紫", "#C6B7D9"), t("温和地拒绝", "可以温和地拒绝一件不想做的事。", "雾蓝", "#9DB4C6")] },
  { key: "scorpio", name: "天蝎座", symbol: "♏", start: [10, 24], themes: [t("专注", "挑一件事，专心做二十五分钟。", "深海蓝", "#2F4A6B"), t("倾诉", "找一个信任的人说说心里话。", "墨绿", "#3E5C4C"), t("放下", "写下一件想放下的事，然后合上本子。", "炭灰", "#4A4A4F")] },
  { key: "sagittarius", name: "射手座", symbol: "♐", start: [11, 23], themes: [t("探索", "换一条路走，看看不一样的风景。", "天空蓝", "#7FB3D5"), t("出去走走", "到户外走一走，吹吹风。", "草木绿", "#7FA36B"), t("学点新东西", "花十分钟了解一个感兴趣的新话题。", "暖黄", "#E4C06B")] },
  { key: "capricorn", name: "摩羯座", symbol: "♑", start: [12, 22], themes: [t("节奏", "今天按自己的节奏推进，不和别人比。", "深灰蓝", "#56677A"), t("小目标", "定一个今天一定能完成的小目标。", "驼色", "#B89A76"), t("停一停", "在两件事之间停下来，深呼吸三次。", "石墨灰", "#6B6B6B")] },
];

export const signOf = (k: SignKey) => SIGNS.find((s) => s.key === k)!;
export const isSignKey = (v: unknown): v is SignKey => SIGNS.some((s) => s.key === v);

const ord = (m: number, d: number) => m * 100 + d;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function endOf(i: number): [number, number] {
  const [m, d] = SIGNS[(i + 1) % SIGNS.length]!.start;
  const prev = new Date(2024, m - 1, d - 1); // 2024 是闰年，保证 2 月最后一天正确
  return [prev.getMonth() + 1, prev.getDate()];
}

/** 例如 "5/21–6/21" */
export function rangeLabel(k: SignKey) {
  const i = SIGNS.findIndex((s) => s.key === k);
  const [sm, sd] = SIGNS[i]!.start;
  const [em, ed] = endOf(i);
  return `${sm}/${sd}–${em}/${ed}`;
}

export type SignFromDate =
  | { ok: true; sign: SignKey; cusp?: SignKey }
  | { ok: false; error: string };

/** 用月和日算太阳星座。生日正好在交界的第一天或最后一天时，给出相邻星座作为提示 */
export function signFromDate(month: number, day: number): SignFromDate {
  if (!Number.isInteger(month) || month < 1 || month > 12) return { ok: false, error: "请选择月份" };
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month - 1]!) return { ok: false, error: "这个日期不存在" };
  const v = ord(month, day);
  // 列表按日历顺序排列：找最后一个起始日 <= 生日的星座；1/1–1/19 找不到，属于摩羯
  let idx = SIGNS.findIndex((s) => s.key === "capricorn");
  SIGNS.forEach((s, i) => {
    if (ord(s.start[0], s.start[1]) <= v) idx = i;
  });

  const sign = SIGNS[idx]!;
  const [sm, sd] = sign.start;
  const [em, ed] = endOf(idx);
  let cusp: SignKey | undefined;
  if (month === sm && day === sd) cusp = SIGNS[(idx - 1 + SIGNS.length) % SIGNS.length]!.key;
  else if (month === em && day === ed) cusp = SIGNS[(idx + 1) % SIGNS.length]!.key;
  return { ok: true, sign: sign.key, ...(cusp ? { cusp } : {}) };
}

const dayOfYear = (d: Date) => {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
};

/** 今日主题：按日期轮换，同一天内保持不变 */
export function themeFor(k: SignKey, date: Date = new Date()): Theme {
  const i = SIGNS.findIndex((s) => s.key === k);
  return SIGNS[i]!.themes[(dayOfYear(date) + i) % 3]!;
}

const ACCESSORIES = [
  "一条细细的手链",
  "一枚简单的戒指",
  "一只你喜欢的手表",
  "一顶帽子",
  "一个有意义的小挂件",
  "一条丝巾或围巾",
];

/** 今日小配饰：不分性别，天热时不推荐围巾 */
export function accessoryFor(date: Date = new Date(), maxTemp?: number) {
  const list = maxTemp !== undefined && maxTemp >= 25 ? ACCESSORIES.slice(0, 5) : ACCESSORIES;
  return list[dayOfYear(date) % list.length]!;
}
