"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "motion/react";
import { useReadContract } from "wagmi";
import { useUserDecrypt } from "@zama-fhe/react-sdk";
import { LockKeyOpenIcon, SealCheckIcon, WarningIcon, SpinnerIcon } from "@phosphor-icons/react";
import {
  HUSH_ABI,
  HUSH_CONTRACT_ADDRESS,
  PAYMENT_TOKEN,
  CONFIDENTIAL_TOKEN_ABI,
  formatTokenAmount,
} from "@/lib/contract";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EarningsCardProps {
  creatorAddress: string;
}

/**
 * The creator's encrypted earnings card - Hush's signature moment.
 *
 * Three-beat choreography:
 *  1. Cipher state   - ciphertext handle + `••••••` in mono, slow ember pulse.
 *  2. Decrypt action - EIP-712 user-decryption via Zama KMS (only the creator
 *                      wallet can decrypt; the onchain ACL enforces it).
 *  3. Reveal         - `••••••` count-ups to the real number, an inner-border
 *                      ember bloom, then the FHE-vs-balance equality proof.
 *
 * Two numbers are shown after decryption:
 *  - Aggregate earnings: the FHE-computed sum maintained by Hush (FHE.add).
 *  - Confidential balance: the real cUSDT balance held in the ERC-7984 token.
 * They must match - that equality is the proof that the contract computed on
 * ciphertext correctly.
 */
export function EarningsCard({ creatorAddress }: EarningsCardProps) {
  const reduce = useReducedMotion();
  const [decryptRequested, setDecryptRequested] = useState(false);

  // 1) Encrypted aggregate earnings handle from Hush.
  const { data: aggHandle, isLoading: loadingAgg } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getCreatorEarnings",
    args: [creatorAddress as `0x${string}`],
    query: { enabled: !!creatorAddress },
  });

  // 2) Encrypted confidential token balance handle from cUSDT.
  const { data: balHandle, isLoading: loadingBal } = useReadContract({
    abi: CONFIDENTIAL_TOKEN_ABI,
    address: PAYMENT_TOKEN,
    functionName: "confidentialBalanceOf",
    args: [creatorAddress as `0x${string}`],
    query: { enabled: !!creatorAddress },
  });

  const hasAgg = aggHandle !== undefined && aggHandle !== null && aggHandle !== 0n;
  const hasBal = balHandle !== undefined && balHandle !== null && balHandle !== 0n;

  const aggHex =
    hasAgg
      ? (`0x${(aggHandle as bigint).toString(16).padStart(64, "0")}` as `0x${string}`)
      : undefined;
  const balHex =
    hasBal
      ? (`0x${(balHandle as bigint).toString(16).padStart(64, "0")}` as `0x${string}`)
      : undefined;

  // 3) Decrypt both handles (only succeeds for the connected creator wallet).
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

  // --- Count-up reveal (motion value, never useState for continuous values) ---
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => formatTokenAmount(BigInt(Math.round(v))));

  useEffect(() => {
    if (!decrypted || clearAgg === undefined) return;
    const target = Number(clearAgg);
    if (!Number.isFinite(target)) {
      count.set(0);
      return;
    }
    if (reduce) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [decrypted, clearAgg, count, reduce]);

  function handleDecrypt() {
    setDecryptRequested(true);
    refetch();
  }

  const loading = loadingAgg && loadingBal;
  const empty = !hasAgg && !hasBal;

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-0 transition-colors duration-500",
        decrypted && "border-primary/40 shadow-ember",
      )}
    >
      {/* Ember bloom on reveal - inner layered border, not outer neon glow. */}
      {decrypted && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            boxShadow:
              "inset 0 0 0 1px hsl(var(--primary) / 0.35), inset 0 0 60px -20px hsl(var(--primary) / 0.55)",
          }}
        />
      )}

      <div className="relative flex items-center justify-between p-6 pb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Your earnings</h3>
        <Badge variant="cipher" className="text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ember-pulse" />
          Encrypted onchain
        </Badge>
      </div>

      <div className="relative space-y-4 px-6 pb-6">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton-shimmer h-10 w-40 rounded-lg" />
            <div className="skeleton-shimmer h-4 w-56 rounded" />
          </div>
        ) : empty ? (
          <div className="space-y-1.5">
            <p className="font-mono text-3xl font-semibold text-muted-foreground/60">0 cUSDT</p>
            <p className="text-sm text-muted-foreground">
              No earnings yet. Share your page to get subscribers.
            </p>
          </div>
        ) : decrypted ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Decrypted aggregate
              </p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  className={cn(
                    "font-mono text-4xl font-semibold tracking-tight tabular-nums",
                    "bg-gradient-to-br from-ember-200 to-ember-500 bg-clip-text text-transparent",
                  )}
                >
                  {display}
                </motion.span>
                <span className="font-mono text-sm text-muted-foreground">cUSDT</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                FHE-computed sum, added up onchain as ciphertext.
              </p>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Confidential balance
              </p>
              <p className="font-mono text-xl font-semibold text-foreground">
                {clearBal !== undefined ? `${formatTokenAmount(clearBal as bigint)} cUSDT` : "••••••"}
              </p>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
                matches
                  ? "border-success/30 bg-success/10 text-success-foreground/90"
                  : "border-warning/30 bg-warning/10 text-warning-foreground",
              )}
            >
              {matches ? (
                <SealCheckIcon weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <WarningIcon weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              )}
              <span>
                {matches
                  ? "Aggregate matches balance. FHE computed on ciphertext correctly."
                  : "Balances not yet aligned. Refresh after the tx confirms."}
              </span>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p
                aria-hidden
                className="cipher select-none text-4xl font-semibold tracking-[0.35em] text-muted-foreground/70 animate-ember-pulse"
              >
                ••••••
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Earnings are encrypted onchain. Only you can decrypt them.
              </p>
            </div>

            {aggHex && (
              <code className="block rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground/60 break-all">
                handle 0x{(aggHandle as bigint).toString(16).padStart(64, "0")}
              </code>
            )}

            <Button onClick={handleDecrypt} disabled={decrypting} className="w-full" size="lg">
              {decrypting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Decrypting
                </>
              ) : (
                <>
                  <LockKeyOpenIcon className="h-4 w-4" />
                  Decrypt my earnings
                </>
              )}
            </Button>

            {decrypting && (
              <p className="text-center text-[11px] text-muted-foreground">
                Sign the EIP-712 request in your wallet to authorize decryption.
              </p>
            )}

            {decryptError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground/90">
                {(decryptError as Error).message?.split("\n")[0] || "Decryption failed."}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
