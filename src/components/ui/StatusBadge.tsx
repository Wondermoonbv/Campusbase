import { cn } from "@/lib/utils";

type StatusType = "success" | "error" | "info" | "warning" | "neutral";

const statusMap: Record<string, StatusType> = {
  actief: "success",
  active: "success",
  bevestigd: "success",
  confirmed: "success",
  done: "success",
  afgelopen: "neutral",
  afgerond: "success",
  gepland: "info",
  planned: "info",
  open: "info",
  "in onderhandeling": "warning",
  "in negotiation": "warning",
  "in behandeling": "warning",
  prospect: "info",
  inactief: "neutral",
  inactive: "neutral",
  uitgenodigd: "neutral",
  ingeschreven: "info",
  backup: "warning",
  verlopen: "error",
  expired: "error",
  geannuleerd: "error",
  cancelled: "error",
  afgemeld: "error",
};

const statusStyles: Record<StatusType, string> = {
  success: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
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
