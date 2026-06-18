"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ElementType, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal wrapper - Motion `whileInView`, reduced-motion aware.
 * No pinning, no scroll hijack. Use for feature lists, cards, sections.
 */
export function Reveal({
  as: As = "div",
  className,
  delay = 0,
  y = 16,
  once = true,
  amount = 0.3,
  children,
}: PropsWithChildren<{
  as?: ElementType;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
}>) {
  const reduce = useReducedMotion();
  const MotionTag = motion(As as ElementType);
  return (
    <MotionTag
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
