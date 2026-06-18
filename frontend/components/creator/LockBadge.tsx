import { LockIcon, LockOpenIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Lock/unlock state indicator for post cards. Replaces the old emoji `🔒`. */
export function LockBadge({
  state,
  tierName,
  className,
}: {
  state: "locked" | "unlocked" | "upgrade";
  tierName?: string;
  className?: string;
}) {
  if (state === "unlocked") {
    return (
      <Badge variant="success" className={cn("gap-1", className)}>
        <LockOpenIcon weight="fill" className="h-3 w-3" />
        Unlocked
      </Badge>
    );
  }
  return (
    <Badge variant="default" className={cn("gap-1", className)}>
      <LockIcon weight="fill" className="h-3 w-3" />
      {state === "upgrade" && tierName ? `Upgrade to ${tierName}` : "Subscribe to unlock"}
    </Badge>
  );
}
