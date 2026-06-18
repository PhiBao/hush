import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Hush mark: a partially-eclipsed ember disc - light concealed by ink.
 * The brand signature for "private payments." Simple geometric SVG.
 */
export function HushMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="Hush"
    >
      <defs>
        <radialGradient id="hush-ember" cx="38%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#f6b84d" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#8f4806" />
        </radialGradient>
      </defs>
      <circle cx="14" cy="16" r="10" fill="url(#hush-ember)" />
      <circle cx="22" cy="20" r="9" fill="hsl(var(--background))" />
      <circle cx="22" cy="20" r="9" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  withWordmark = true,
}: {
  className?: string;
  href?: string;
  withWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label="Hush home"
    >
      <HushMark className="h-7 w-7 transition-transform duration-300 ease-ember group-hover:rotate-[-8deg]" />
      {withWordmark && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          Hush
        </span>
      )}
    </Link>
  );
}
