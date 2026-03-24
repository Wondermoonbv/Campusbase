import { cn } from "@/lib/utils";

type StatusType = "success" | "error" | "info" | "warning" | "neutral";

const statusMap: Record<string, StatusType> = {
  actief: "success",
  active: "success",
  bevestigd: "success",
  confirmed: "success",
  done: "success",
  afgelopen: "neutral",
  gepland: "info",
  planned: "info",
  "in onderhandeling": "warning",
  "in negotiation": "warning",
  prospect: "info",
  inactief: "neutral",
  inactive: "neutral",
  verlopen: "error",
  expired: "error",
  geannuleerd: "error",
  cancelled: "error",
};

const statusStyles: Record<StatusType, string> = {
  success: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  warning: "bg-accent/10 text-foreground border-accent/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const type = statusMap[status.toLowerCase()] || "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border capitalize",
        statusStyles[type],
        className
      )}
    >
      {status}
    </span>
  );
}
