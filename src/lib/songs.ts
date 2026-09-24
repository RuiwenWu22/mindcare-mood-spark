/**
 * "此刻的 BGM"：用户主动粘贴分享内容或输入歌名，不读取任何听歌记录。
 * 只保留来自已知音乐平台、且为 https 的链接，其他链接一律丢弃。
 */

export type SongPlatform = "netease" | "qq" | "apple";

export type Song = {
  title: string;
  artist?: string;
  platform?: SongPlatform;
  url?: string;
};

export const PLATFORM_LABEL: Record<SongPlatform, string> = {
  netease: "网易云音乐",
  qq: "QQ 音乐",
  apple: "Apple Music",
};

const HOSTS: [RegExp, SongPlatform][] = [
  [/(^|\.)music\.163\.com$|^163cn\.tv$/, "netease"],
  [/(^|\.)y\.qq\.com$/, "qq"],
  [/(^|\.)music\.apple\.com$/, "apple"],
];

const MAX_TITLE = 60;
const MAX_ARTIST = 40;

function platformOf(url: URL): SongPlatform | undefined {
  return HOSTS.find(([re]) => re.test(url.hostname))?.[1];
}

/** 只接受 https + 已知音乐平台的链接 */
export function safeMusicUrl(raw: string | undefined): { url: string; platform: SongPlatform } | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const platform = platformOf(u);
    return platform ? { url: u.toString(), platform } : null;
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => s.trim().slice(0, n);

/** 解析用户粘贴的分享内容或手动输入的歌名。输入为空时返回 null；识别不到歌名时 title 为空字符串 */
export function parseSongInput(input: string): Song | null {
  const text = input.trim().slice(0, 300);
  if (!text) return null;

  const song: Song = { title: "" };
  const urlMatch = text.match(/https?:\/\/[^\s，。、)）"'<>]+/);
  const link = safeMusicUrl(urlMatch?.[0]);
  if (link) {
    song.url = link.url;
    song.platform = link.platform;
  }

  // 去掉链接和平台的固定文案，剩下的才是歌名相关文字
  const rest = text
    .replace(/https?:\/\/[^\s，。、)）"'<>]+/g, " ")
    .replace(/[(（]\s*来自@?[^)）]*[)）]/g, " ")
    .trim();

  const quoted = rest.match(/《([^》]{1,80})》/);
  if (quoted) {
    song.title = clip(quoted[1]!, MAX_TITLE);
    const by = rest.match(/分享(.{1,40}?)的(?:单曲|歌曲)《/);
    if (by) song.artist = clip(by[1]!, MAX_ARTIST);
  } else {
    const plain = rest.replace(/^分享/, "").replace(/[:：\s]+$/, "").trim();
    if (plain && plain.length <= MAX_TITLE) {
      const parts = plain.split(/\s+[-–—]\s+/);
      song.title = clip(parts[0]!, MAX_TITLE);
      if (parts[1]) song.artist = clip(parts[1], MAX_ARTIST);
    } else if (link?.platform === "apple") {
      // Apple Music 的单曲链接形如 /cn/song/<歌名>/<id>；专辑链接里的名字是专辑名，不猜
      try {
        const seg = new URL(link.url).pathname.split("/");
        const i = seg.indexOf("song");
        if (i >= 0 && seg[i + 1]) song.title = clip(decodeURIComponent(seg[i + 1]!).replace(/-/g, " "), MAX_TITLE);
      } catch {
        /* 解析不了就让用户自己输入 */
      }
    }
  }
  if (!song.artist) delete song.artist;
  return song;
}

/** 读取本地数据时的校验：歌名必须有，链接必须安全 */
export function sanitizeSong(raw: unknown): Song | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const title = typeof r["title"] === "string" ? clip(r["title"], MAX_TITLE) : "";
  if (!title) return undefined;
  const song: Song = { title };
  if (typeof r["artist"] === "string" && r["artist"].trim()) song.artist = clip(r["artist"], MAX_ARTIST);
  const link = safeMusicUrl(typeof r["url"] === "string" ? r["url"] : undefined);
  if (link) {
    song.url = link.url;
    song.platform = link.platform;
  } else if (r["platform"] === "netease" || r["platform"] === "qq" || r["platform"] === "apple") {
    song.platform = r["platform"];
  }
  return song;
}

export const songKey = (s: Song) => `${s.title}|${s.artist ?? ""}`;
