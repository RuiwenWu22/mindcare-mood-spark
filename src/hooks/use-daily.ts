import { useCallback, useEffect, useState } from "react";
import {
  DAILY_EVENT,
  loadDailyState,
  loadProfile,
  saveDailyState,
  saveProfile,
  type DailyState,
  type Profile,
} from "@/lib/daily";
import { dayKey } from "@/lib/mood";

export function useDaily() {
  const [profile, setProfile] = useState<Profile>({});
  const [state, setState] = useState<DailyState>({ date: dayKey(), flipped: false, done: [], rest: false });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setProfile(loadProfile());
      setState(loadDailyState());
    };
    refresh();
    setReady(true);
    window.addEventListener(DAILY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DAILY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  /** 整体替换个人设置（便于删除某个字段，例如更换星座） */
  const setProfileAll = useCallback((p: Profile) => saveProfile(p), []);
  const updateState = useCallback(
    (patch: Partial<Omit<DailyState, "date">>) => saveDailyState({ ...loadDailyState(), ...patch }),
    [],
  );

  return { profile, state, ready, setProfileAll, updateState };
}
