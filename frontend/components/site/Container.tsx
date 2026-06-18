import { cn } from "@/lib/utils";
import type { ElementType, PropsWithChildren } from "react";

/** Centered page container - single source of truth for max-width. */
export function Container({
  as: As = "div",
  className,
  size = "default",
  children,
}: PropsWithChildren<{
  as?: ElementType;
  className?: string;
  size?: "default" | "narrow" | "wide" | "full";
}>) {
  const max =
    size === "narrow"
      ? "max-w-xl"
      : size === "wide"
        ? "max-w-5xl"
        : size === "full"
          ? "max-w-[1400px]"
          : "max-w-3xl";
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-6", max, className)}>
      {As === "div" ? <>{children}</> : <As>{children}</As>}
    </div>
  );
}
