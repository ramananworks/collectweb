import { useState, useEffect } from "react";
import { getQueueLength } from "@/lib/offline-queue";

export function useSyncStatus() {
  const [pending, setPending] = useState(getQueueLength());

  useEffect(() => {
    const interval = setInterval(() => {
      setPending(getQueueLength());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return pending;
}
