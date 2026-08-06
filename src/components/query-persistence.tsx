import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Restores the React Query cache from localStorage after mount, so a hard
 * refresh paints the last known feed immediately instead of a skeleton.
 * Mounted client-side only (never during SSR) to keep hydration clean.
 */
export function QueryPersistence() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    let persister;
    try {
      persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: "pb:rq:v1",
        throttleTime: 1000,
      });
    } catch {
      return;
    }
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      dehydrateOptions: {
        shouldDehydrateQuery: (q) => q.state.status === "success",
      },
    });
    return () => unsubscribe();
  }, [queryClient]);
  return null;
}
