"use client";

import { CheckIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTokenAmount } from "@/lib/contract";

export interface TierData {
  name: string;
  price: string;
  durationSecs: string;
  description: string;
}

interface TierCardProps {
  tier: TierData;
  index: number;
  onSubscribe: () => void;
  disabled?: boolean;
  featured?: boolean;
  isCurrentTier?: boolean;
}

export function TierCard({ tier, index, onSubscribe, disabled, featured, isCurrentTier }: TierCardProps) {
  const durationDays = Math.round(Number(tier.durationSecs) / 86400) || 30;
  const priceLabel = formatTokenAmount(tier.price);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card/70 p-6 shadow-card backdrop-blur-sm transition-all duration-300 ease-ember",
        featured ? "border-primary/40 shadow-ember" : "border-border hover:border-foreground/20",
        isCurrentTier && "border-success/50 bg-success/[0.04]",
      )}
    >
      {featured && (
        <Badge className="absolute -top-3 left-6">
          <SparkleIcon weight="fill" className="h-3 w-3" />
          Most popular
        </Badge>
      )}
      {isCurrentTier && (
        <Badge variant="success" className="absolute -top-3 left-6">
          <CheckIcon weight="fill" className="h-3 w-3" />
          Current tier
        </Badge>
      )}

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{tier.name}</h3>
          <span className="font-mono text-[11px] text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {priceLabel}
          </span>
          <span className="font-mono text-sm text-muted-foreground">cUSDT / {durationDays}d</span>
        </div>
        {tier.description && (
          <p className="text-sm leading-relaxed text-muted-foreground max-w-[40ch]">
            {tier.description}
          </p>
        )}
      </div>

      <Button
        onClick={onSubscribe}
        disabled={disabled || isCurrentTier}
        className="mt-6 w-full"
        size="lg"
        variant={isCurrentTier ? "outline" : featured ? "default" : "secondary"}
      >
        {isCurrentTier
          ? "Subscribed"
          : disabled
            ? "Connect wallet"
            : "Subscribe"}
        {!disabled && !isCurrentTier && <CheckIcon className="h-4 w-4" />}
      </Button>
    </div>
  );
}
