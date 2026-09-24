import { useCallback, useEffect, useState } from "react";
import { BODY_EVENT, loadBody, unsetDayField, upsertDay, type DayLog } from "@/lib/body";
import { dayKey } from "@/lib/mood";

export function useBody() {
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setLogs(loadBody());
    refresh();
    setReady(true);
    window.addEventListener(BODY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BODY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  /** 今天用户自己的数据（不含示例） */
  const today = logs.find((l) => l.date === dayKey() && !l.sample);

  const update = useCallback(
    (patch: Omit<DayLog, "date" | "sample">, date: string = dayKey()) => upsertDay(date, patch),
    [],
  );

  const unset = useCallback((field: "sleep" | "level") => unsetDayField(dayKey(), field), []);

  return { logs, ready, today, update, unset };
}
