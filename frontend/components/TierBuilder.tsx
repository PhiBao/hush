"use client";

import { useState } from "react";
import { TierData } from "./TierCard";

interface TierBuilderProps {
  tiers: TierData[];
  onChange: (tiers: TierData[]) => void;
}

export type { TierData } from "./TierCard";

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
        description,
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
      {tiers.map((tier, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-xl bg-surface-800 border border-surface-700"
        >
          <div>
            <p className="font-medium">{tier.name}</p>
            <p className="text-sm text-surface-400">
              {tier.price} cUSDT &middot; {Math.round(Number(tier.durationSecs) / 86400)} days
            </p>
          </div>
          <button
            onClick={() => onChange(tiers.filter((_, j) => j !== i))}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      ))}

      {showForm ? (
        <div className="p-4 rounded-xl bg-surface-800 border border-surface-700 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tier name (e.g. Supporter)"
            className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 text-sm placeholder-surface-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price in cUSDT units (e.g. 100 = 100 cUSDT)"
              className="flex-1 px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 text-sm placeholder-surface-500"
            />
            <input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="Days"
              className="w-24 px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 text-sm placeholder-surface-500"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What subscribers get..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 text-sm placeholder-surface-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={addTier}
              disabled={!name.trim() || !price}
              className="flex-1 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              Add Tier
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="py-2 px-4 rounded-lg border border-surface-700 hover:border-surface-500 text-surface-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl border border-dashed border-surface-700 hover:border-hush-500 text-surface-400 hover:text-hush-400 text-sm font-medium transition-colors"
        >
          + Add a tier
        </button>
      )}
    </div>
  );
}
