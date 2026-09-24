import { useEffect, useState } from "react";
import { RECOVERY_EVENT, loadRecovery, type RecoveryData } from "@/lib/recovery";

export function useRecovery() {
  const [data, setData] = useState<RecoveryData>({
    profile: null,
    urges: [],
    unsent: [],
    reviews: [],
    reminders: [],
    contacts: [],
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setData(loadRecovery());
    refresh();
    setReady(true);
    window.addEventListener(RECOVERY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECOVERY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { ...data, enabled: !!data.profile?.enabled, ready };
}
