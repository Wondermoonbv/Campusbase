import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-accent/15 text-accent",
  "bg-success/15 text-success",
  "bg-info/15 text-info",
  "bg-destructive/15 text-destructive",
  "bg-warning/15 text-warning",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ name, avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  const colorClass = AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length];
  const initials = getInitials(name);

  return (
    <Avatar className={cn("h-8 w-8 border border-border", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={cn("text-xs font-semibold", colorClass, fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
