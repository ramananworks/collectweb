import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UsePullToRefreshOptions {
  queryKeys: string[][];
  threshold?: number;
}

export function usePullToRefresh({ queryKeys, threshold = 80 }: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const queryClient = useQueryClient();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPulling(true);
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold);
      await Promise.all(
        queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, queryClient, queryKeys, threshold]);

  return {
    containerRef,
    pulling,
    refreshing,
    pullDistance,
    threshold,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
