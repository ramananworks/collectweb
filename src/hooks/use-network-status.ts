import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { replayQueue, getQueueLength } from "@/lib/offline-queue";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  const handleOnline = useCallback(async () => {
    setIsOnline(true);

    const pending = getQueueLength();
    if (pending > 0) {
      toast.loading(`Syncing ${pending} offline change${pending > 1 ? "s" : ""}...`, { id: "offline-sync" });
      const { succeeded, failed } = await replayQueue();
      toast.dismiss("offline-sync");

      if (failed === 0) {
        toast.success(`Synced ${succeeded} change${succeeded > 1 ? "s" : ""} successfully`);
      } else {
        toast.warning(`Synced ${succeeded}, ${failed} failed — will retry next time`);
      }
    } else {
      toast.success("Back online");
    }

    // Refetch all active queries to sync latest data
    queryClient.invalidateQueries();
  }, [queryClient]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.warning("You are offline. Changes will be saved locally.");
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Android WebView bridge callback
    (window as any).onNetworkStatusChange = (online: boolean) => {
      if (online) handleOnline();
      else handleOffline();
    };

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      delete (window as any).onNetworkStatusChange;
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}
