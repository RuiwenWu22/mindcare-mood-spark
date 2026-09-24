import { useCallback, useEffect, useState } from "react";
import {
  loadEntries,
  saveEntries,
  sortByNewest,
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
    (input: { mood: MoodKey; intensity: number; note: string; triggers?: TriggerKey[] }) => {
      const auto = detectTriggers(input.note);
      const triggers = Array.from(new Set([...(input.triggers ?? []), ...auto]));
      const entry: Entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        mood: input.mood,
        intensity: input.intensity,
        note: input.note.trim(),
        triggers,
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

  return { entries, ready, addEntry, removeEntry };
}
