import { useCallback, useEffect, useState } from "react";
import { CYCLE_EVENT, clearCycle, loadCycle, saveCycle, type CycleData, type Period } from "@/lib/cycle";

export function useCycle() {
  const [data, setData] = useState<CycleData>({ enabled: false, periods: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setData(loadCycle());
    refresh();
    setReady(true);
    window.addEventListener(CYCLE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CYCLE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const enable = useCallback(() => saveCycle({ ...loadCycle(), enabled: true }), []);
  const setPeriods = useCallback((periods: Period[]) => saveCycle({ enabled: true, periods }), []);
  /** 关闭模块，同时删除全部周期数据 */
  const disable = useCallback(() => clearCycle(), []);

  return { ...data, ready, enable, setPeriods, disable };
}
