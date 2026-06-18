"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "motion/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "What could you earn, privately?" - interactive estimate.
 * The number stays as `••••••` until the user moves a slider, then count-ups.
 * Framing: the estimate is local; on Hush the real number stays encrypted.
 */
export function PrivateEstimator({ ctaHref = "/create" }: { ctaHref?: string }) {
  const reduce = useReducedMotion();
  const [subs, setSubs] = useState(120);
  const [price, setPrice] = useState(8);
  const [touched, setTouched] = useState(false);
  const firstTouch = useRef(false);

  const target = subs * price;
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => `$${Math.round(v).toLocaleString("en-US")}`);

  useEffect(() => {
    if (!touched) return;
    if (reduce) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [touched, target, count, reduce]);

  function onSubs(v: number) {
    if (!firstTouch.current) {
      firstTouch.current = true;
      setTouched(true);
    }
    setSubs(v);
  }
  function onPrice(v: number) {
    if (!firstTouch.current) {
      firstTouch.current = true;
      setTouched(true);
    }
    setPrice(v);
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/70 p-6 shadow-card backdrop-blur-sm sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Slider
          label="Paid subscribers"
          value={subs}
          min={1}
          max={500}
          step={1}
          suffix=" subs"
          onChange={onSubs}
        />
        <Slider
          label="Monthly price"
          value={price}
          min={1}
          max={100}
          step={1}
          prefix="$"
          suffix=" /mo"
          onChange={onPrice}
        />
      </div>

      <div className="mt-7 flex flex-col items-center gap-2 border-t border-border pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
          Estimated monthly earnings
        </p>
        {touched ? (
          <motion.span className="font-mono text-4xl font-semibold tracking-tight tabular-nums bg-gradient-to-br from-ember-200 to-ember-500 bg-clip-text text-transparent">
            {display}
          </motion.span>
        ) : (
          <p
            aria-hidden
            className={cn(
              "cipher select-none text-4xl font-semibold tracking-[0.3em] text-muted-foreground/60 animate-ember-pulse",
            )}
          >
            ••••••
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground max-w-[44ch]">
          This estimate stays in your browser. On Hush, the real number stays
          encrypted onchain, and only you can decrypt it.
        </p>
      </div>

      <Button asChild size="lg" className="mt-6 w-full">
        <a href={ctaHref}>
          Start earning privately
          <ArrowRightIcon className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono text-sm text-ember-300 tabular-nums">
          {prefix}{value}{suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={label}
      />
    </label>
  );
}
