"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatTokenAmount } from "@/lib/contract";
import { cn } from "@/lib/utils";
import type { TierData } from "./TierCard";

export type { TierData } from "./TierCard";

interface TierBuilderProps {
  tiers: TierData[];
  onChange: (tiers: TierData[]) => void;
}

export function TierBuilder({ tiers, onChange }: TierBuilderProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [description, setDescription] = useState("");

  function addTier() {
    if (!name.trim() || !price) return;
    onChange([
      ...tiers,
      {
        name: name.trim(),
        price,
        durationSecs: String(Number(durationDays) * 86400),
        description: description.trim(),
      },
    ]);
    setName("");
    setPrice("");
    setDurationDays("30");
    setDescription("");
    setShowForm(false);
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {tiers.map((tier, i) => (
          <motion.div
            key={`${tier.name}-${i}`}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/60 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{tier.name}</p>
              <p className="font-mono text-sm text-muted-foreground">
                {formatTokenAmount(tier.price)} cUSDT · {Math.round(Number(tier.durationSecs) / 86400)}d
              </p>
              {tier.description && (
                <p className="mt-0.5 text-xs text-muted-foreground/80 truncate">{tier.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(tiers.filter((_, j) => j !== i))}
              aria-label={`Remove ${tier.name}`}
            >
              <TrashIcon className="h-4 w-4 text-destructive-foreground/80" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {showForm ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 rounded-xl border border-primary/30 bg-card/60 p-4"
        >
          <div className="space-y-2">
            <Label htmlFor="tier-name">Tier name</Label>
            <Input
              id="tier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Supporter"
            />
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div className="space-y-2">
              <Label htmlFor="tier-price">Price (cUSDT)</Label>
              <Input
                id="tier-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-days">Days</Label>
              <Input
                id="tier-days"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-desc">What subscribers get</Label>
            <Textarea
              id="tier-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Exclusive posts, early access, behind the scenes"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={addTier} disabled={!name.trim() || !price} className="flex-1">
              <PlusIcon className="h-4 w-4" />
              Add tier
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3.5",
            "text-sm font-medium text-muted-foreground transition-colors ease-ember",
            "hover:border-primary/40 hover:text-ember-300",
          )}
        >
          <PlusIcon className="h-4 w-4" />
          Add a tier
        </button>
      )}
    </div>
  );
}
