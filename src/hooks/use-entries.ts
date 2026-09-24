import { useCallback, useEffect, useState } from "react";
import { clearBody, clearSampleBody, restoreSampleBody } from "@/lib/body";
import { clearDailyData } from "@/lib/daily";
import { clearWeatherCache } from "@/lib/weather";
import type { Song } from "@/lib/songs";
import {
  loadEntries,
  saveEntries,
  sortByNewest,
  isSample,
  seedEntries,
  type ActivityKey,
  type Entry,
  type FollowUp,
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
        intensity: input.intensity,
        note: input.note.trim(),
        triggers,
        ...(input.activity ? { activity: input.activity } : {}),
        ...(input.song?.title ? { song: input.song } : {}),
      };
      commit([entry, ...loadEntries()]);
      return entry;
    },
    [commit],
  );

  const removeEntry = useCallback(
    (id: string) => commit(loadEntries().filter((e) => e.id !== id)),
    [commit],
  );

  /** 清空示例数据，只保留用户自己的记录（之后不会再自动填入示例） */
  const clearSamples = useCallback(() => {
    commit(loadEntries().filter((e) => !isSample(e)));
    clearSampleBody();
  }, [commit]);

  const addFollowUp = useCallback(
    (id: string, followUp: FollowUp) =>
      commit(
        loadEntries().map((e) =>
          e.id === id ? { ...e, followUps: [...(e.followUps ?? []), followUp] } : e,
        ),
      ),
    [commit],
  );

  /** 删除全部记录（包括示例），之后不会再自动填入示例 */
  const clearAll = useCallback(() => {
    commit([]);
    clearBody();
    clearDailyData();
    clearWeatherCache();
  }, [commit]);

  /** 重新载入示例数据，保留用户自己的记录 */
  const restoreSamples = useCallback(() => {
    commit([...loadEntries().filter((e) => !isSample(e)), ...seedEntries()]);
    restoreSampleBody();
  }, [commit]);

  return {
    entries,
    ready,
    addEntry,
    removeEntry,
    clearSamples,
    addFollowUp,
    clearAll,
    restoreSamples,
  };
}
