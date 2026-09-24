/**
 * 连接 Apple Music：记录时从"最近播放"里列出前 3 首，由用户点选确认。
 * - 不自动填入、不从歌推断心情；只在用户点"看看最近播放"时读取一次，不保存听歌记录
 * - 开发者令牌（developer token）由项目所有者在自己电脑上用 scripts/apple-music-token.mjs 生成，
 *   私钥不离开那台电脑；令牌本身会发到浏览器，这是 MusicKit 的设计，所以生成时限定了网站来源
 * - 令牌最长 180 天，过期或缺失时这个入口自动隐藏，退回手动输入
 */
import { safeMusicUrl, type Song } from "@/lib/songs";

/** 把生成的令牌粘贴到这里，或者设置环境变量 VITE_APPLE_MUSIC_TOKEN（优先） */
const PASTED_TOKEN = "";

export const DEVELOPER_TOKEN: string =
  import.meta.env.VITE_APPLE_MUSIC_TOKEN?.trim() || PASTED_TOKEN;

export type TokenStatus =
  | { ok: true; expiresAt: Date; daysLeft: number }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

function base64UrlDecode(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return atob(b64);
}

/** 只读令牌里的过期时间，不校验签名（签名由 Apple 校验） */
export function tokenStatus(token: string = DEVELOPER_TOKEN, now: Date = new Date()): TokenStatus {
  if (!token) return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]!)) as { exp?: unknown };
    if (typeof payload.exp !== "number") return { ok: false, reason: "invalid" };
    const expiresAt = new Date(payload.exp * 1000);
    const ms = expiresAt.getTime() - now.getTime();
    if (ms <= 0) return { ok: false, reason: "expired" };
    return { ok: true, expiresAt, daysLeft: Math.floor(ms / 86_400_000) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/* ---------------- MusicKit JS ---------------- */

type MusicKitInstance = {
  isAuthorized: boolean;
  authorize: () => Promise<string>;
  unauthorize: () => Promise<void>;
  api: { music: (path: string, params?: Record<string, unknown>) => Promise<{ data: { data?: unknown[] } }> };
};
type MusicKitGlobal = {
  configure: (c: { developerToken: string; app: { name: string; build: string } }) => Promise<MusicKitInstance>;
  getInstance: () => MusicKitInstance | undefined;
};
declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

const SCRIPT = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
let loading: Promise<MusicKitInstance> | null = null;

/** 按需加载 MusicKit（只在用户点击连接时才会加载 Apple 的脚本） */
export function getMusicKit(): Promise<MusicKitInstance> {
  if (loading) return loading;
  loading = new Promise<MusicKitGlobal>((resolve, reject) => {
    if (window.MusicKit) return resolve(window.MusicKit);
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.dataset["webComponents"] = "";
    const timer = window.setTimeout(() => reject(new Error("timeout")), 15_000);
    document.addEventListener(
      "musickitloaded",
      () => {
        window.clearTimeout(timer);
        if (window.MusicKit) resolve(window.MusicKit);
        else reject(new Error("musickit missing"));
      },
      { once: true },
    );
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("load failed"));
    };
    document.head.appendChild(s);
  })
    .then((mk) => mk.getInstance() ?? mk.configure({ developerToken: DEVELOPER_TOKEN, app: { name: "MindCare", build: "1.0" } }))
    .catch((e: unknown) => {
      loading = null; // 下次还可以重试
      throw e;
    });
  return loading;
}

/** 把"最近播放"接口的返回整理成歌曲；缺歌名的条目丢弃，链接只保留 Apple Music 的 https 链接 */
export function tracksFromResponse(data: unknown[] | undefined, limit = 3): Song[] {
  const out: Song[] = [];
  const seen = new Set<string>();
  for (const item of data ?? []) {
    const a = (item as { attributes?: Record<string, unknown> })?.attributes;
    const title = typeof a?.["name"] === "string" ? a["name"].trim().slice(0, 60) : "";
    if (!title) continue;
    const artist = typeof a?.["artistName"] === "string" ? a["artistName"].trim().slice(0, 40) : "";
    const key = `${title}|${artist}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const link = safeMusicUrl(typeof a?.["url"] === "string" ? a["url"] : undefined);
    out.push({
      title,
      ...(artist ? { artist } : {}),
      platform: "apple",
      ...(link?.platform === "apple" ? { url: link.url } : {}),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type RecentResult = { ok: true; songs: Song[] } | { ok: false; error: string };

/** 请求授权（第一次会弹出 Apple 登录），然后读取最近播放的前 3 首 */
export async function recentSongs(): Promise<RecentResult> {
  const st = tokenStatus();
  if (!st.ok) return { ok: false, error: "Apple Music 暂时不可用，可以手动输入歌名。" };
  try {
    const mk = await getMusicKit();
    if (!mk.isAuthorized) await mk.authorize();
    const res = await mk.api.music("/v1/me/recent/played/tracks", { limit: 10, types: ["songs", "library-songs"] });
    const songs = tracksFromResponse(res.data.data);
    return songs.length ? { ok: true, songs } : { ok: false, error: "最近播放里没有找到歌曲，可以手动输入歌名。" };
  } catch {
    return { ok: false, error: "没能连接 Apple Music（可能取消了授权或网络不通），可以手动输入歌名。" };
  }
}

export async function disconnect() {
  try {
    const mk = window.MusicKit?.getInstance();
    if (mk?.isAuthorized) await mk.unauthorize();
  } catch {
    /* 断开失败不影响手动输入 */
  }
}
