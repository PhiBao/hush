"use client";

import { formatTokenAmount } from "../lib/contract";

export interface TierData {
  name: string;
  price: string;
  durationSecs: string;
  description: string;
}

interface TierCardProps {
  tier: TierData;
  onSubscribe: () => void;
  disabled?: boolean;
}

export function TierCard({ tier, onSubscribe, disabled }: TierCardProps) {
  const durationDays = Math.round(Number(tier.durationSecs) / 86400);
  return (
    <div className="p-6 rounded-xl border border-surface-700 bg-surface-900/50 hover:border-hush-500/50 transition-colors flex flex-col">
      <div className="flex-1 space-y-2 mb-4">
        <h3 className="text-xl font-bold">{tier.name}</h3>
        <p className="text-2xl font-semibold text-hush-400">
          {formatTokenAmount(tier.price)}
          <span className="text-sm text-surface-500 font-normal"> cUSDT / {durationDays}d</span>
        </p>
        {tier.description && (
          <p className="text-sm text-surface-400">{tier.description}</p>
        )}
      </div>
      <button
        onClick={onSubscribe}
        disabled={disabled}
        className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
      >
        {disabled ? "Connect wallet" : "Subscribe"}
      </button>
    </div>
  );
}
