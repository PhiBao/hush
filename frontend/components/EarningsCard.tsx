"use client";

import { useReadContract } from "wagmi";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../lib/contract";

interface EarningsCardProps {
  creatorAddress: string;
}

export function EarningsCard({ creatorAddress }: EarningsCardProps) {
  const { data: handle } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getCreatorEarnings",
    args: [creatorAddress as `0x${string}`],
    query: { enabled: !!creatorAddress },
  });

  const hasEarnings = handle !== undefined && handle !== null && handle !== 0n;

  return (
    <div className="p-6 rounded-xl border border-surface-700 bg-surface-900/50">
      <h3 className="text-sm font-medium text-surface-400 mb-3">
        Your Earnings
      </h3>
      <div className="space-y-3">
        <p className="text-3xl font-bold text-gradient">
          {hasEarnings ? "••••••" : "0 wei"}
        </p>
        {hasEarnings && (
          <div className="space-y-2">
            <p className="text-xs text-surface-500">
              Earnings are encrypted onchain. Only you can decrypt them.
            </p>
            <code className="block text-xs text-hush-400/60 break-all bg-surface-800 rounded-lg px-3 py-2">
              handle: 0x{handle.toString(16).padStart(64, "0")}
            </code>
          </div>
        )}
        {!hasEarnings && (
          <p className="text-sm text-surface-500">
            No earnings yet. Share your page to get subscribers.
          </p>
        )}
      </div>
    </div>
  );
}
