"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { useUserDecrypt } from "@zama-fhe/react-sdk";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS, PAYMENT_TOKEN, formatTokenAmount } from "../lib/contract";

interface EarningsCardProps {
  creatorAddress: string;
}

/**
 * The creator's encrypted earnings card.
 *
 * Shows the onchain encrypted handle by default, and a "Decrypt my earnings"
 * button that triggers the real FHE user-decryption flow (EIP-712 signed
 * keypair via the Zama relayer + KMS). Only the connected creator wallet can
 * decrypt — the onchain ACL enforces this.
 *
 * Two numbers are shown after decryption:
 *  - Aggregate earnings: the FHE-computed sum maintained by Hush (FHE.add).
 *  - Confidential balance: the real cUSDT balance held in the ERC-7984 token.
 * They must match — that equality is the proof that the contract computed on
 * ciphertext correctly.
 */
export function EarningsCard({ creatorAddress }: EarningsCardProps) {
  const [decryptRequested, setDecryptRequested] = useState(false);

  // 1) Read the encrypted aggregate earnings handle from Hush.
  const { data: aggHandle, isLoading: loadingAgg } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getCreatorEarnings",
    args: [creatorAddress as `0x${string}`],
    query: { enabled: !!creatorAddress },
  });

  // 2) Read the encrypted confidential token balance handle from cUSDT.
  const { data: balHandle, isLoading: loadingBal } = useReadContract({
    abi: CONFIDENTIAL_TOKEN_ABI,
    address: PAYMENT_TOKEN,
    functionName: "confidentialBalanceOf",
    args: [creatorAddress as `0x${string}`],
    query: { enabled: !!creatorAddress },
  });

  const hasAgg = aggHandle !== undefined && aggHandle !== null && aggHandle !== 0n;
  const hasBal = balHandle !== undefined && balHandle !== null && balHandle !== 0n;

  // Convert bigint handles to 0x-prefixed hex (the SDK's Handle type).
  const aggHex = hasAgg ? (`0x${(aggHandle as bigint).toString(16).padStart(64, "0")}` as `0x${string}`) : undefined;
  const balHex = hasBal ? (`0x${(balHandle as bigint).toString(16).padStart(64, "0")}` as `0x${string}`) : undefined;

  // 3) Decrypt both handles (only succeeds if the connected wallet is the
  //    creator AND the onchain ACL granted access — which Hush does on subscribe).
  const decryptConfig = {
    handles: [
      ...(aggHex ? [{ handle: aggHex, contractAddress: HUSH_CONTRACT_ADDRESS }] : []),
      ...(balHex ? [{ handle: balHex, contractAddress: PAYMENT_TOKEN }] : []),
    ],
  };

  const {
    data: decryptResult,
    isLoading: decrypting,
    error: decryptError,
    refetch,
  } = useUserDecrypt(decryptConfig, { enabled: decryptRequested && (hasAgg || hasBal) });

  const clearAgg = aggHex ? (decryptResult as Record<string, bigint> | undefined)?.[aggHex] : undefined;
  const clearBal = balHex ? (decryptResult as Record<string, bigint> | undefined)?.[balHex] : undefined;
  const decrypted = decryptRequested && clearAgg !== undefined;
  const matches = decrypted && clearBal !== undefined && clearAgg === clearBal;

  function handleDecrypt() {
    setDecryptRequested(true);
    refetch();
  }

  return (
    <div className="p-6 rounded-xl border border-surface-700 bg-surface-900/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-surface-400">Your Earnings</h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-hush-900/30 border border-hush-800/50 text-hush-400">
          Encrypted onchain
        </span>
      </div>

      <div className="space-y-3">
        {loadingAgg && loadingBal ? (
          <div className="h-9 w-32 bg-surface-800 rounded animate-pulse" />
        ) : !hasAgg && !hasBal ? (
          <>
            <p className="text-3xl font-bold text-surface-600">0 cUSDT</p>
            <p className="text-sm text-surface-500">
              No earnings yet. Share your page to get subscribers.
            </p>
          </>
        ) : decrypted ? (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-surface-500 uppercase tracking-wider mb-1">
                Decrypted aggregate (FHE-computed sum)
              </p>
              <p className="text-3xl font-bold text-gradient">
                {formatTokenAmount(clearAgg as bigint)} cUSDT
              </p>
            </div>
            <div className="border-t border-surface-800 pt-3">
              <p className="text-[11px] text-surface-500 uppercase tracking-wider mb-1">
                Confidential token balance (real money)
              </p>
              <p className="text-xl font-semibold text-surface-200">
                {clearBal !== undefined ? `${formatTokenAmount(clearBal as bigint)} cUSDT` : "••••••"}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 text-xs ${
                matches ? "text-green-400" : "text-yellow-400"
              }`}
            >
              <span>{matches ? "✓" : "⚠"}</span>
              <span>
                {matches
                  ? "Aggregate matches balance — FHE computed on ciphertext correctly."
                  : "Balances not yet aligned — refresh after the tx confirms."}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-3xl font-bold text-surface-600">••••••</p>
            <p className="text-xs text-surface-500">
              Earnings are encrypted onchain. Only you can decrypt them.
            </p>
            {hasAgg && (
              <code className="block text-[10px] text-hush-400/50 break-all bg-surface-800 rounded-lg px-3 py-2">
                handle: 0x{(aggHandle as bigint).toString(16).padStart(64, "0")}
              </code>
            )}
            <button
              onClick={handleDecrypt}
              disabled={decrypting}
              className="w-full py-2.5 rounded-xl bg-hush-600 hover:bg-hush-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {decrypting ? "Decrypting…" : "Decrypt my earnings"}
            </button>
            {decrypting && (
              <p className="text-[11px] text-surface-500 text-center">
                Sign the EIP-712 request in your wallet to authorize decryption.
              </p>
            )}
            {decryptError && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
                {(decryptError as Error).message?.split("\n")[0] || "Decryption failed."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CONFIDENTIAL_TOKEN_ABI = [
  {
    type: "function",
    name: "confidentialBalanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
] as const;
