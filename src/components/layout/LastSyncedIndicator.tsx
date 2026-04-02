import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lastSynced: Date;
  className?: string;
}

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "zojuist";
  if (diff < 60) return `${diff}s geleden`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m geleden`;
  return date.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
}

export function LastSyncedIndicator({ lastSynced, className }: Props) {
  const [, setTick] = useState(0);

  // Re-render every 10s to keep the relative time fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 tabular-nums select-none",
        className
      )}
      title={`Laatst gesynchroniseerd: ${lastSynced.toLocaleTimeString("nl-BE")}`}
    >
      <RefreshCw className="h-3 w-3" />
      {formatRelative(lastSynced)}
    </span>
  );
}
