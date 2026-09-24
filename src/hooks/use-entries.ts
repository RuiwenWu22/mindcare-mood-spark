import { useCallback, useEffect, useState } from "react";
import { clearBody } from "@/lib/body";
import { clearCycle } from "@/lib/cycle";
import { clearDailyData } from "@/lib/daily";
import { clearWeatherCache } from "@/lib/weather";
import { clearInterventions, removeInterventionsFor } from "@/lib/interventions";
import type { Song } from "@/lib/songs";
import {
  loadEntries,
  saveEntries,
  sortByNewest,
  type ActivityKey,
  type Entry,
  type MoodKey,
  type TriggerKey,
  detectTriggers,
} from "@/lib/mood";

const EVENT = "mindcare:entries-changed";

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(sortByNewest(loadEntries()));
    setReady(true);
    const sync = () => setEntries(sortByNewest(loadEntries()));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = useCallback((next: Entry[]) => {
    const sorted = sortByNewest(next);
    saveEntries(sorted);
    setEntries(sorted);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const addEntry = useCallback(
    (input: {
      mood: MoodKey;
      intensity: number;
      note: string;
      triggers?: TriggerKey[];
      activity?: ActivityKey | null;
      song?: Song | null;
    }) => {
      const auto = detectTriggers(input.note);
      const triggers = Array.from(new Set([...(input.triggers ?? []), ...auto]));
      const entry: Entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        mood: input.mood,
        intensity: Math.min(5, Math.max(1, Math.round(input.intensity))),
        note: input.note.trim(),
        triggers,
        scale: 5,
        ...(input.activity ? { activity: input.activity } : {}),
        ...(input.song?.title ? { song: input.song } : {}),
      };
      commit([entry, ...loadEntries()]);
      return entry;
    },
    [commit],
  );

  /** 删除一条记录，以及和它关联的调节记录 */
  const removeEntry = useCallback(
    (id: string) => {
      commit(loadEntries().filter((e) => e.id !== id));
      removeInterventionsFor(id);
    },
    [commit],
  );

  /** 删除全部数据：记录、调节记录、身体数据、周期、今日卡片设置 */
  const clearAll = useCallback(() => {
    commit([]);
    clearInterventions();
    clearBody();
    clearDailyData();
    clearWeatherCache();
    clearCycle();
  }, [commit]);

  return { entries, ready, addEntry, removeEntry, clearAll };
}
