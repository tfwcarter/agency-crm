"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("local-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-storage", callback);
  };
}

export function useLocalStorageBoolean(key: string, defaultValue: boolean) {
  const getSnapshot = useCallback(() => localStorage.getItem(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = stored === null ? defaultValue : stored === "1";

  const setValue = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "1" : "0");
      window.dispatchEvent(new Event("local-storage"));
    },
    [key]
  );

  return [value, setValue] as const;
}
