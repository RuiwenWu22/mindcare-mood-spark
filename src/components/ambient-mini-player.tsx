import { Square } from "lucide-react";
import { useAmbient } from "@/hooks/use-ambient";
import { AMBIENT_TRACKS, stopAmbient } from "@/lib/ambient";

/** 背景声在任何页面都能看到并停止 */
export function AmbientMiniPlayer() {
  const { playing } = useAmbient();
  if (!playing) return null;
  const track = AMBIENT_TRACKS[playing];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card/95 py-2 pl-4 pr-2 text-sm shadow-[var(--shadow-lift)] backdrop-blur">
        <span aria-hidden>{track.emoji}</span>
        <span className="font-medium">{track.title}</span>
        <span className="text-xs text-muted-foreground">播放中</span>
        <button
          onClick={stopAmbient}
          aria-label="停止播放"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-primary-soft"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
    </div>
  );
}
