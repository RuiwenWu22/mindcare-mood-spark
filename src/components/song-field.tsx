import { useEffect, useState } from "react";
import { parseSongInput, PLATFORM_LABEL, type Song } from "@/lib/songs";
import { recentSongs, tokenStatus } from "@/lib/apple-music";

/**
 * 此刻在听什么：粘贴分享内容、手动输入歌名，或从 Apple Music 最近播放里点选确认。
 * 不自动填入，也不从歌推断心情。
 */
export function SongField({ onChange }: { onChange: (s: Song | null) => void }) {
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<Song | null>(null);
  const [amOn, setAmOn] = useState(false);
  const [recent, setRecent] = useState<Song[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setAmOn(tokenStatus().ok), []);

  const parsed = parseSongInput(input);
  const song = picked ?? (parsed?.title ? parsed : null);
  useEffect(() => onChange(song), [song?.title, song?.artist, song?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecent = async () => {
    setBusy(true);
    setMsg(null);
    const r = await recentSongs();
    setBusy(false);
    if (r.ok) setRecent(r.songs);
    else setMsg(r.error);
  };

  return (
    <div>
      <label htmlFor="song" className="text-xs text-muted-foreground">
        此刻在听什么？
      </label>
      <input
        id="song"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setPicked(null);
        }}
        placeholder="粘贴网易云、QQ 音乐或 Apple Music 的分享，或输入歌名"
        className="mt-2 w-full rounded-2xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
      />
      {amOn && !picked && (
        <div className="mt-2">
          {!recent ? (
            <button
              type="button"
              onClick={() => void loadRecent()}
              disabled={busy}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
            >
              {busy ? "正在读取 Apple Music……" : "从 Apple Music 最近播放里选"}
            </button>
          ) : (
            <div role="group" aria-label="你刚才可能在听">
              <p className="text-xs text-muted-foreground">你刚才可能在听（点一下确认，不是的话可以忽略）：</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    type="button"
                    key={`${r.title}|${r.artist ?? ""}`}
                    onClick={() => {
                      setPicked(r);
                      setInput("");
                    }}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-secondary"
                  >
                    🎵 {r.title}
                    {r.artist ? ` · ${r.artist}` : ""}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRecent(null)}
                  className="px-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  都不是
                </button>
              </div>
            </div>
          )}
          {msg && <p className="mt-1 text-xs text-muted-foreground">{msg}</p>}
        </div>
      )}
      {picked && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          已选：🎵《{picked.title}》{picked.artist ? ` · ${picked.artist}` : ""} · 来自 Apple Music 最近播放
          <button type="button" onClick={() => setPicked(null)} className="ml-2 underline underline-offset-4">
            取消
          </button>
        </p>
      )}
      {!picked && parsed && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {parsed.title ? (
            <>
              识别为：🎵《{parsed.title}》{parsed.artist ? ` · ${parsed.artist}` : ""}
              {parsed.platform ? ` · ${PLATFORM_LABEL[parsed.platform]}` : ""}
            </>
          ) : (
            "没识别到歌名，可以直接输入歌名。"
          )}
        </p>
      )}
    </div>
  );
}
