import { useSyncExternalStore } from "react";
import { ambientStore } from "@/lib/ambient";

export function useAmbient() {
  return useSyncExternalStore(
    ambientStore.subscribe,
    ambientStore.getSnapshot,
    ambientStore.getServerSnapshot,
  );
}
