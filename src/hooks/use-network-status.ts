import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    toast.success("Back online — syncing data...");
    // Refetch all active queries to sync latest data
    queryClient.invalidateQueries();
  }, [queryClient]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.warning("You are offline. Changes will sync when connection is restored.");
  }, []);

  useEffect(() => {
    // Standard browser events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Android WebView bridge callback
    (window as any).onNetworkStatusChange = (online: boolean) => {
      if (online) {
        handleOnline();
      } else {
        handleOffline();
      }
    };

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      delete (window as any).onNetworkStatusChange;
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}
