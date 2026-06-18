"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion, useInView } from "motion/react";
import { useRef } from "react";
import { LockKeyOpenIcon, SealCheckIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Hero asset - a REAL mini preview of the decrypt moment (not a div fake
 * screenshot). Plays cipher -> reveal once when scrolled into view, re-triggers
 * on hover. Reduced-motion: shows the revealed number statically.
 *
 * Motivated motion: demonstrates the product's core promise (private earnings
 * that only the creator can reveal) in one glance.
 */
export function HeroDecryptPreview() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.5 });
  const [revealed, setRevealed] = useState(false);

  const count = useMotionValue(0);
  const display = useTransform(count, (v) =>
    Math.round(v).toLocaleString("en-US"),
  );

  useEffect(() => {
    if (reduce) {
      count.set(1284);
      setRevealed(true);
      return;
    }
    if (inView && !revealed) {
      const t = setTimeout(() => {
        setRevealed(true);
        animate(count, 1284, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [inView, revealed, count, reduce]);

  function replay() {
    if (reduce) return;
    count.set(0);
    setRevealed(false);
    requestAnimationFrame(() => {
      setRevealed(true);
      animate(count, 1284, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    });
  }

  return (
    <div
      ref={ref}
      onPointerEnter={replay}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 shadow-card backdrop-blur-sm",
        "transition-colors duration-500",
        revealed && "border-primary/40",
      )}
    >
      {revealed && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            boxShadow:
              "inset 0 0 0 1px hsl(var(--primary) / 0.3), inset 0 0 70px -24px hsl(var(--primary) / 0.5)",
          }}
        />
      )}

      <div className="relative flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          mara&nbsp;.eth
        </span>
        <Badge variant="cipher" className="text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ember-pulse" />
          Encrypted
        </Badge>
      </div>

      <div className="relative mt-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
          Monthly earnings
        </p>
        {revealed ? (
          <div className="mt-2 flex items-baseline gap-2">
            <motion.span
              className="font-mono text-5xl font-semibold tracking-tight tabular-nums bg-gradient-to-br from-ember-200 to-ember-500 bg-clip-text text-transparent"
            >
              {display}
            </motion.span>
            <span className="font-mono text-sm text-muted-foreground">cUSDT</span>
          </div>
        ) : (
          <p
            aria-hidden
            className="cipher mt-2 select-none text-5xl font-semibold tracking-[0.3em] text-muted-foreground/70 animate-ember-pulse"
          >
            ••••••
          </p>
        )}
      </div>

      <motion.div
        className="relative mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <LockKeyOpenIcon className="h-4 w-4 text-primary" />
        Decrypted by the creator. Hidden from everyone else.
      </motion.div>

      <div className="relative mt-3 flex items-center gap-1.5 text-[11px] text-success-foreground/80">
        <SealCheckIcon weight="fill" className="h-3.5 w-3.5 text-success" />
        FHE proof matches onchain balance.
      </div>
    </div>
  );
}
