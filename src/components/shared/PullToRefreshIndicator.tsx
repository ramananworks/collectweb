import { RefreshCw } from "lucide-react";

interface Props {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
  threshold: number;
}

export default function PullToRefreshIndicator({ pulling, refreshing, pullDistance, threshold }: Props) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: pulling || refreshing ? `${pullDistance}px` : 0 }}
    >
      <RefreshCw
        className={`h-5 w-5 text-primary transition-transform ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: `rotate(${pullDistance * 3}deg)` }}
      />
      <span className="ml-2 text-xs text-muted-foreground">
        {refreshing ? "Refreshing..." : pullDistance >= threshold ? "Release to refresh" : "Pull to refresh"}
      </span>
    </div>
  );
}
