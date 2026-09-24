import { useEffect, useState } from "react";
import { INTERVENTIONS_EVENT, loadInterventions, type Intervention } from "@/lib/interventions";

export function useInterventions() {
  const [items, setItems] = useState<Intervention[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(loadInterventions());
    refresh();
    setReady(true);
    window.addEventListener(INTERVENTIONS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(INTERVENTIONS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { interventions: items, ready };
}
