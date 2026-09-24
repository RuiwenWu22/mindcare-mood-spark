/**
 * 「✨ AI 帮你整理了一下」：读一条记录，说说此刻的情绪可能和什么有关。
 * 目前由可解释的规则完成：只引用这条记录里真实存在的情绪、强度、标签和文字，
 * 以及最近 7 天的历史记录；每一句都能在 evidence 里找到依据。
 * 语气：用"似乎""可能"，不做诊断，不说"你一定""你就是因为"。
 */
import { moodOf, triggerLabel, type Entry, type MoodKey, type TriggerKey } from "@/lib/mood";

export type Understanding = { text: string; evidence: string[] };

/** 情绪的名词形式，用在"你现在的__可能来自……" */
const NOUN: Record<MoodKey, string> = {
  happy: "好心情",
  calm: "平静",
  okay: "好状态",
  neutral: "平淡",
  anxious: "焦虑",
  sad: "低落",
  irritated: "烦躁",
  stressed: "压力",
};

/** 从文字里能读出的常见原因。timed 的主题前面可以加上"明天的"这类时间词 */
/** 形容词形式，用在"你现在似乎感到比较__" */
const ADJ: Record<MoodKey, string> = {
  happy: "开心",
  calm: "平静",
  okay: "不错",
  neutral: "平淡",
  anxious: "焦虑",
  sad: "难过",
  irritated: "烦躁",
  stressed: "有压力",
};

const THEMES: { re: RegExp; phrase: string; timed?: boolean }[] = [
  { re: /汇报|演讲|答辩|展示|述职|presentation/i, phrase: "汇报", timed: true },
  { re: /考试|期末|期中|测验|考研/, phrase: "考试", timed: true },
  { re: /面试/, phrase: "面试", timed: true },
  { re: /ddl|deadline|截止|交稿|赶工/i, phrase: "临近的截止时间" },
  { re: /(还)?没(有)?准备好|准备不足|没准备|来不及/, phrase: "对准备不足的担心" },
  { re: /做得?不够好|不够好|怀疑自己|自我怀疑|比不上/, phrase: "对自己的要求和怀疑" },
  { re: /任务(很|太)?多|堆在一起|忙不过来|事情太多|加班/, phrase: "堆在一起的事情" },
  { re: /吵架|争执|冷战|误会|闹别扭/, phrase: "和别人之间的摩擦" },
  { re: /分手|暧昧|不回消息/, phrase: "亲密关系里的不确定" },
  { re: /失眠|睡不着|没睡好|熬夜|早醒/, phrase: "没有睡好" },
  { re: /房租|还款|钱不够|没钱|花销|工资/, phrase: "金钱上的压力" },
  { re: /孤独|一个人|没人(陪|理)/, phrase: "一个人的孤单" },
  { re: /迷茫|不知道(该|要)|未来|方向/, phrase: "对未来的不确定" },
  { re: /生病|头疼|头痛|发烧|不舒服|胃疼|痛经/, phrase: "身体的不舒服" },
];

const WHEN = /明天|后天|今晚|下周|周末|马上|等会|待会/;

const degree = (n: number) => (n <= 2 ? "有一点" : n >= 5 ? "非常" : "比较");

/** "比较焦虑""压力比较大""挺开心"：程度词放在自然的位置 */
function feeling(mood: MoodKey, n: number) {
  if (mood === "stressed") return n <= 2 ? "有一点压力" : n >= 5 ? "压力很大" : "压力比较大";
  if (moodOf(mood).valence > 0) return `${n <= 2 ? "还算" : n >= 5 ? "非常" : "挺"}${ADJ[mood]}`;
  return `${degree(n)}${ADJ[mood]}`;
}

export function readThemes(note: string) {
  const when = note.match(WHEN)?.[0];
  const found: { phrase: string; quote: string }[] = [];
  for (const t of THEMES) {
    const m = note.match(t.re);
    if (!m) continue;
    const phrase = t.timed && when ? `${when}的${t.phrase}` : t.phrase;
    if (!found.some((f) => f.phrase === phrase)) found.push({ phrase, quote: m[0] });
  }
  return found.slice(0, 2);
}

const joinQuotes = (qs: string[]) => qs.map((q) => `“${q}”`).join("和");

/**
 * @param entry   要整理的记录
 * @param history 这条之前的记录（用来说"这周第几次"），不含 entry 本身
 * @param chosen  用户在这次记录里亲手选的标签；不传时用"这条记录的标签"的说法
 */
export function understandEntry(
  entry: Entry,
  history: Entry[] = [],
  chosen?: TriggerKey[],
): Understanding {
  const mood = moodOf(entry.mood);
  const noun = NOUN[entry.mood];
  const themes = readThemes(entry.note);
  const tags = (chosen ?? entry.triggers).filter((t) => t !== "other");
  const quoted = tags.map((t) => `「${triggerLabel(t)}」`);
  const tagText = quoted.join("、");
  const sentences: string[] = [];
  const evidence: string[] = [];

  if (mood.valence < 0) {
    if (themes.length) {
      const [a, b] = themes;
      sentences.push(`你现在的${noun}可能主要来自${a!.phrase}${b ? `，以及${b.phrase}` : ""}。`);
    } else if (tags.length) {
      sentences.push(`你现在似乎感到${feeling(entry.mood, entry.intensity)}，可能和${tagText}有关。`);
    } else {
      sentences.push(`你现在似乎感到${feeling(entry.mood, entry.intensity)}。没写原因也没关系，先把感受记下来就很好。`);
    }
  } else if (mood.valence > 0) {
    const cause = themes.length ? themes[0]!.phrase : tags.length ? tagText : "";
    sentences.push(
      cause
        ? `你现在似乎${feeling(entry.mood, entry.intensity)}，可能和${cause}有关。可以留意一下是什么带来了这份好心情。`
        : `你现在似乎${feeling(entry.mood, entry.intensity)}。可以留意一下是什么带来了这份好心情。`,
    );
  } else {
    sentences.push(
      tags.length
        ? `你现在的状态似乎比较平淡，可能和${tagText}有关。平淡的时候，也是很好的休息。`
        : "你现在的状态似乎比较平淡。平淡的时候，也是很好的休息。",
    );
  }

  // 依据：只列这条记录里真实存在的信息
  const quotes = themes.map((t) => t.quote);
  const source = chosen ? "你选择的" : "这条记录的";
  if (tags.length && quotes.length) {
    evidence.push(`基于${source}${tagText}标签，以及记录中提到的${joinQuotes(quotes)}。`);
  } else if (tags.length) {
    evidence.push(`基于${source}${tagText}标签。`);
  } else if (quotes.length) {
    evidence.push(`基于记录中提到的${joinQuotes(quotes)}。`);
  }
  evidence.push(`你选择的情绪是「${mood.label}」，强度 ${entry.intensity} / 5。`);

  // 这周是不是反复出现：让用户感觉到"它在慢慢认识我"
  if (mood.valence < 0 && tags.length) {
    const weekAgo = new Date(entry.createdAt).getTime() - 7 * 86_400_000;
    const tag = tags[0]!;
    const same = history.filter(
      (h) =>
        h.id !== entry.id &&
        h.mood === entry.mood &&
        h.triggers.includes(tag) &&
        new Date(h.createdAt).getTime() >= weekAgo &&
        new Date(h.createdAt).getTime() < new Date(entry.createdAt).getTime(),
    ).length;
    if (same >= 1) {
      sentences.push(`这是最近 7 天里第 ${same + 1} 次和「${triggerLabel(tag)}」有关的${mood.label}。`);
      evidence.push(`最近 7 天里，另有 ${same} 条「${mood.label}」记录也和「${triggerLabel(tag)}」有关。`);
    }
  }

  return { text: sentences.join(""), evidence };
}
