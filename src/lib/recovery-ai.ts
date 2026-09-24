/**
 * 失恋恢复模式里的「✨」内容。目前由可解释的规则完成，只分析用户自己的表达和记录。
 * 边界（每条规则都遵守）：
 * - 不判断对方的人格、动机、是否在乎、是否会复合
 * - 不说"TA 不值得""千万不要联系"，不替用户做决定
 * - 不鼓励报复、骚扰或反复联系；不使用诊断语言
 * - 用"可能""似乎""仅凭这条消息无法确定""最终由你决定"
 */
import {
  urgeTriggerLabel,
  type ContactUrge,
  type Desire,
  type MessageAction,
  type UrgeTrigger,
} from "@/lib/recovery";

/* ---------------- ✨ 先帮你停一下 ---------------- */

/** 用户希望得到的东西，换成"你很希望得到……"里的说法 */
const NEED: Partial<Record<Desire, string>> = {
  respond: "一个回应",
  still_care: "一个关于“自己是否仍然重要”的确认",
  explanation: "一个解释",
  possibility: "一个关于“还有没有可能”的答案",
  certainty: "一个确定的结果，好让这种悬着的感觉停下来",
};

const TRIGGER_LINE: [UrgeTrigger, string][] = [
  ["message", "收到 TA 的消息，会让很多情绪一下子涌上来。"],
  ["saw_post", "看到 TA 的动态之后，心里被勾起很多东西，这很正常。"],
  ["drink", "喝酒以后，情绪和冲动往往会被放大一些。"],
  ["night_alone", "晚上一个人的时候，这种感觉往往会更强一些。"],
  ["anniversary", "特殊的日子会把很多回忆带回来。"],
  ["dream", "梦到 TA 之后醒来，那种感觉可能还留在身上。"],
  ["conflict", "和别人有了不开心，也会让人更想靠近一个熟悉的人。"],
  ["memory", "想起以前的事情时，想念会变得很具体。"],
  ["miss", "单纯的想念也是真实的，不需要理由。"],
];

export function pauseCard(input: {
  urge: number;
  triggers: UrgeTrigger[];
  text: string;
  desire?: Desire;
}): { lines: string[]; evidence: string[] } {
  const lines: string[] = [];
  const need = input.desire ? NEED[input.desire] : undefined;
  const wrote = input.text.trim().length > 0;

  if (input.desire === "lonely") {
    lines.push(
      wrote
        ? "你现在想联系 TA，可能不只是因为有话想说，也因为此刻有点孤单，很希望有人在身边。"
        : "你现在想联系 TA，可能是因为此刻有点孤单，很希望有人在身边。",
    );
  } else if (need) {
    lines.push(
      wrote
        ? `你现在想联系 TA，可能不只是因为有话想说，也因为你很希望得到${need}。`
        : `你现在想联系 TA，可能是因为你很希望得到${need}。`,
    );
  } else {
    lines.push("你现在想联系 TA，这份想念和冲动都是真实的。");
  }

  const t = TRIGGER_LINE.find(([k]) => input.triggers.includes(k));
  if (t) lines.push(t[1]);

  lines.push(
    input.urge >= 4
      ? "现在可以先把这份需要留下来，等最强烈的这一阵过去，再决定要不要联系。最终怎么做，由你决定。"
      : "现在可以先把这份需要留下来，给自己一点时间，再决定要不要联系。最终怎么做，由你决定。",
  );

  const evidence = [`你选择的联系冲动是 ${input.urge} / 5。`];
  if (input.triggers.length) evidence.push(`刚刚发生的：${input.triggers.map((k) => `「${urgeTriggerLabel(k)}」`).join("、")}。`);
  if (input.desire) evidence.push(`你希望得到：「${DESIRE_TEXT[input.desire]}」。`);
  if (wrote) evidence.push(`你写下了想对 TA 说的话（${input.text.trim().length} 个字），它只保存在这台设备上。`);
  evidence.push("这里只分析你自己的感受和需要，不判断 TA 的想法。");
  return { lines: lines.slice(0, 3), evidence };
}

const DESIRE_TEXT: Record<Desire, string> = {
  respond: "想被回应",
  still_care: "想确认 TA 还在不在乎",
  explanation: "想得到一个解释",
  possibility: "想知道还有没有可能",
  lonely: "只是现在很孤独",
  certainty: "想结束这种不确定感",
  other: "其他",
};

/** Pause 之后再次评分的回应：不制造失败感 */
export function afterPauseText(before: number, after: number) {
  return after < before
    ? "刚才给自己的这几分钟似乎有一点帮助。"
    : "这种感觉还在也没关系，你可以继续把它记录下来。";
}

/* ---------------- ✨ 这段话里，你可能在表达 ---------------- */

const FEELINGS: [string, RegExp][] = [
  ["想念", /想你|想念|好想|还是会想|梦到你|梦见你|想起你/],
  ["想被确认", /在不在乎|在乎我|还爱|爱过|喜欢过我|还喜欢|重要|有没有想过我|心里还有/],
  ["想获得解释", /为什么|解释|怎么回事|凭什么|到底是/],
  ["不确定", /是不是|到底|会不会|还有没有|不知道|能不能|要不要/],
  ["委屈", /委屈|不公平|明明|心酸|难受|付出/],
  ["生气", /生气|气死|讨厌|过分|受够/],
  ["自责", /对不起|后悔|是我的错|都怪我|如果我/],
  ["孤单", /一个人|孤单|孤独|没人/],
  ["想好好告别", /再见|放下|祝你|谢谢你|保重/],
];

const EXPECTATION: [string, string][] = [
  ["想被确认", "确认自己依然重要"],
  ["想获得解释", "一个解释"],
  ["不确定", "一个明确的回应"],
  ["孤单", "有人陪着"],
  ["自责", "被原谅，也原谅自己"],
  ["想好好告别", "给这段关系一个好好的结束"],
  ["委屈", "自己的感受被看见"],
  ["生气", "自己的感受被认真对待"],
  ["想念", "和 TA 之间还有联系的感觉"],
];

export function analyzeUnsent(text: string, desire?: Desire): { feelings: string[]; expectation: string | null } {
  const feelings = FEELINGS.filter(([, re]) => re.test(text)).map(([k]) => k);
  if (desire === "still_care" && !feelings.includes("想被确认")) feelings.push("想被确认");
  if (desire === "explanation" && !feelings.includes("想获得解释")) feelings.push("想获得解释");
  if (desire === "lonely" && !feelings.includes("孤单")) feelings.push("孤单");
  const exp = EXPECTATION.find(([k]) => feelings.includes(k));
  return { feelings: feelings.slice(0, 4), expectation: exp ? exp[1] : null };
}

/* ---------------- TA 给我发消息了：只拆事实 ---------------- */

const FACTS: [RegExp, (m: string) => string][] = [
  [/还好吗|最近怎么样|过得好吗|过得怎么样|身体好吗|最近好吗/, () => "TA 在询问你的近况"],
  [/想到你|想起你|想你|梦到你|梦见你/, (m) => `TA 表达了“${m}”`],
  [/对不起|抱歉|sorry/i, () => "TA 表达了歉意"],
  [/见面|见一面|出来|吃个饭|吃饭|聊聊|谈谈/, () => "TA 提出想见面或聊一聊"],
  [/东西|还给你|拿一下|钥匙|快递/, () => "TA 提到了物品的事"],
  [/生日快乐|新年快乐|节日快乐|中秋快乐|圣诞快乐/, (m) => `TA 发来了“${m}”的问候`],
  [/谢谢/, () => "TA 表达了感谢"],
  [/在吗|在不在/, () => "TA 想确认你在不在，开始一段对话"],
];

export function reviewMessage(msg: string): { facts: string[]; unknown: string[] } {
  const text = msg.trim();
  const facts: string[] = [];
  for (const [re, f] of FACTS) {
    const m = text.match(re);
    if (m) facts.push(f(m[0]));
  }
  if (facts.length === 0 && /[?？]/.test(text)) facts.push("TA 问了一个问题");
  if (facts.length === 0 && text) facts.push(`TA 发来了这段话：“${text.length > 30 ? `${text.slice(0, 30)}……` : text}”`);

  const unknown = ["TA 是否想复合", "TA 是否后悔"];
  if (facts.some((f) => f.includes("歉意"))) unknown.push("这句道歉具体指的是什么");
  else if (facts.some((f) => f.includes("见面"))) unknown.push("见面想聊的是什么");
  else unknown.push("这是否只是普通的问候");
  return { facts: facts.slice(0, 4), unknown };
}

/** 帮我整理回复：三种语气，只生成文字，不会发送 */
export function replyDrafts(msg: string): { tone: string; text: string }[] {
  const asks = /还好吗|最近怎么样|过得好吗|过得怎么样|最近好吗/.test(msg);
  const meet = /见面|见一面|出来|吃个饭|吃饭|聊聊|谈谈/.test(msg);
  const thing = /东西|还给你|拿一下|钥匙|快递/.test(msg);
  return [
    {
      tone: "简短",
      text: thing ? "收到，东西的事我们约个方便的时间处理就好。" : asks ? "我最近还好，谢谢。" : "收到了，谢谢你的消息。",
    },
    {
      tone: "保持边界",
      text: meet
        ? "谢谢你的邀请。我现在需要一些自己的空间，暂时不太想见面。"
        : "谢谢你的消息。我现在需要一些自己的空间，暂时不太想多聊。",
    },
    {
      tone: "温和但不过度展开",
      text: asks
        ? "谢谢你想到我。我最近还在慢慢调整，一切都还好，也希望你一切顺利。"
        : "谢谢你告诉我。我现在还在慢慢调整，先简单回复你，也希望你一切顺利。",
    },
  ];
}

/* ---------------- 最近的恢复轨迹 ---------------- */

const DAY = 86_400_000;
const isNight = (iso: string) => {
  const h = new Date(iso).getHours();
  return h >= 20 || h < 5;
};
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

export type RecoveryWindow = { label: string; count: number; avgUrge: number | null };

/**
 * 最近 N 天，以及它之前的两段同样长度（只保留开启恢复模式之后的时间段），
 * 用来显示"12 → 7 → 3"这样的变化。
 */
export function recoveryTrack(urges: ContactUrge[], days: number, enabledAt: string | undefined, now: Date = new Date()) {
  const end = now.getTime();
  const start = enabledAt ? new Date(enabledAt).getTime() : 0;
  const windows: RecoveryWindow[] = [];
  for (let i = 2; i >= 0; i--) {
    const to = end - i * days * DAY;
    const from = to - days * DAY;
    if (i > 0 && to <= start) continue;
    // 最近这一段不设上限：页面打开后新记的也算在内
    const list = urges.filter((u) => {
      const t = new Date(u.created_at).getTime();
      return t > from && (i === 0 || t <= to);
    });
    windows.push({
      label: i === 0 ? `最近 ${days} 天` : `前 ${i * days + days}–${i * days + 1} 天`,
      count: list.length,
      avgUrge: avg(list.map((u) => u.urge_before)),
    });
  }
  const recent = urges.filter((u) => new Date(u.created_at).getTime() > end - days * DAY);
  const paused = recent.filter((u) => typeof u.urge_after === "number");
  const triggerCount = new Map<string, number>();
  recent.forEach((u) => u.triggers.filter((t) => t !== "other").forEach((t) => triggerCount.set(t, (triggerCount.get(t) ?? 0) + 1)));
  return {
    windows,
    recentCount: recent.length,
    pause: paused.length
      ? { count: paused.length, before: avg(paused.map((u) => u.urge_before))!, after: avg(paused.map((u) => u.urge_after!))! }
      : null,
    topTriggers: [...triggerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => ({ label: urgeTriggerLabel(k), count: n })),
  };
}

export const RECOVERY_MIN = 3;

/** ✨ 最近的恢复发现：只用最近 30 天的真实记录；不够时不下结论 */
export function recoveryInsight(urges: ContactUrge[], now: Date = new Date()): { lines: string[]; evidence: string[] } {
  const recent = urges.filter((u) => new Date(u.created_at).getTime() > now.getTime() - 30 * DAY);
  if (recent.length < RECOVERY_MIN) {
    return {
      lines: [],
      evidence: [`最近 30 天记录了 ${recent.length} 次联系冲动，至少 ${RECOVERY_MIN} 次后才会开始总结。`],
    };
  }
  const lines: string[] = [];
  const evidence: string[] = [`最近 30 天记录了 ${recent.length} 次联系冲动。`];

  const night = recent.filter((u) => isNight(u.created_at)).length;
  evidence.push(`其中 ${night} 次发生在晚上（20:00 以后）。`);
  if (night >= 2 && night / recent.length >= 0.6) lines.push("你最近几次想联系 TA 的时刻，大多发生在晚上。");

  const tc = new Map<string, number>();
  recent.forEach((u) => u.triggers.filter((t) => t !== "other").forEach((t) => tc.set(t, (tc.get(t) ?? 0) + 1)));
  const top = [...tc.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) evidence.push(`出现最多的触发因素是「${urgeTriggerLabel(top[0])}」，${top[1]} 次。`);
  if (top && top[1] >= 2 && top[1] / recent.length >= 0.5 && !(top[0] === "night_alone" && lines.length)) {
    lines.push(`这些冲动常常出现在「${urgeTriggerLabel(top[0])}」的时候。`);
  }

  const wrote = recent.filter((u) => u.unsent_text.trim() && typeof u.urge_after === "number");
  if (wrote.length >= 2) {
    const b = avg(wrote.map((u) => u.urge_before))!;
    const a = avg(wrote.map((u) => u.urge_after!))!;
    evidence.push(`先写下没有发送的话、再停一下的 ${wrote.length} 次里，冲动平均从 ${b} 变成 ${a}。`);
    if (a < b) lines.push(`在你先写下“没有发送的话”之后，联系冲动平均从 ${b} 降到了 ${a}。`);
  } else {
    const paused = recent.filter((u) => typeof u.urge_after === "number");
    if (paused.length >= 2) {
      const b = avg(paused.map((u) => u.urge_before))!;
      const a = avg(paused.map((u) => u.urge_after!))!;
      evidence.push(`停一下之后再评分的 ${paused.length} 次里，冲动平均从 ${b} 变成 ${a}。`);
      if (a < b) lines.push(`先停一下之后，联系冲动平均从 ${b} 降到了 ${a}。`);
    }
  }
  evidence.push("这里只统计你的记录，不判断 TA，也不替你决定要不要联系。");
  return { lines: lines.slice(0, 2), evidence };
}

export const MESSAGE_ACTION_REPLY: Record<MessageAction, string> = {
  wait: "好的。消息不会跑掉，可以先把手机放下一会儿，等情绪平稳一些再看。",
  later: "好的。等你准备好了再回来，这里可以帮你整理回复。",
  reply: "好的。下面可以帮你整理几种语气，改不改、发不发，都由你决定。",
};
