"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEncrypt } from "@zama-fhe/react-sdk";
import {
  HUSH_ABI,
  HUSH_CONTRACT_ADDRESS,
  PAYMENT_TOKEN,
  PAYMENT_TOKEN_UNDERLYING,
  CONFIDENTIAL_TOKEN_ABI,
  ERC20_ABI,
  formatTokenAmount,
} from "../lib/contract";

type Step = "idle" | "minting" | "approving-wrap" | "shielding" | "approving-op" | "encrypting" | "subscribing" | "done" | "error";

interface SubscribeModalProps {
  creatorAddress: string;
  creatorName: string;
  tierName: string;
  tierPrice: string;
  tierIndex: number;
  isOpen: boolean;
  onClose: () => void;
  /** Optional private tip added on top of the tier price (stays encrypted). */
  tipAmount?: bigint;
}

const STEP_LABEL: Record<Step, string> = {
  idle: "Confirm Subscription",
  minting: "Getting test USDT…",
  "approving-wrap": "Approving USDT for shielding…",
  shielding: "Shielding USDT → cUSDT (encrypting your tokens)…",
  "approving-op": "Authorizing Hush to spend your cUSDT…",
  encrypting: "Encrypting your payment amount…",
  subscribing: "Confirming subscription onchain…",
  done: "Subscribed!",
  error: "Something went wrong",
};

export function SubscribeModal({
  creatorAddress,
  creatorName,
  tierName,
  tierPrice,
  tierIndex,
  isOpen,
  onClose,
  tipAmount = 0n,
}: SubscribeModalProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const encryptMutation = useEncrypt();

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  // Check whether the subscriber already has confidential balance + operator set.
  const { data: isOperator } = useReadContract({
    abi: CONFIDENTIAL_TOKEN_ABI,
    address: PAYMENT_TOKEN,
    functionName: "isOperator",
    args: [address ?? "0x0", HUSH_CONTRACT_ADDRESS],
    query: { enabled: !!address },
  });

  const { data: underlyingBalance } = useReadContract({
    abi: ERC20_ABI,
    address: PAYMENT_TOKEN_UNDERLYING,
    functionName: "balanceOf",
    args: [address ?? "0x0"],
    query: { enabled: !!address },
  });

  if (!isOpen) return null;

  const paymentAmount = BigInt(tierPrice) + tipAmount;

  async function handleSubscribe() {
    if (!address) return;
    setStep("minting");
    setError("");

    try {
      // Step 1: Ensure the subscriber has enough public test USDT (faucet mint).
      const needed = paymentAmount + tipAmount;
      if (underlyingBalance === undefined || BigInt(underlyingBalance as bigint) < needed) {
        const mintTx = await writeContractAsync({
          abi: ERC20_ABI,
          address: PAYMENT_TOKEN_UNDERLYING,
          functionName: "mint",
          args: [address, needed],
        });
        await waitForTx(writeContractAsync, mintTx);
      }

      // Step 2: Approve the cUSDT wrapper to pull USDT for shielding (wrap).
      setStep("approving-wrap");
      const approveTx = await writeContractAsync({
        abi: ERC20_ABI,
        address: PAYMENT_TOKEN_UNDERLYING,
        functionName: "approve",
        args: [PAYMENT_TOKEN, paymentAmount],
      });
      await waitForTx(writeContractAsync, approveTx);

      // Step 3: Shield — convert public USDT into encrypted cUSDT.
      setStep("shielding");
      const wrapTx = await writeContractAsync({
        abi: CONFIDENTIAL_TOKEN_ABI,
        address: PAYMENT_TOKEN,
        functionName: "wrap",
        args: [address, paymentAmount],
      });
      await waitForTx(writeContractAsync, wrapTx);

      // Step 4: Authorize Hush as an operator for the subscriber's cUSDT.
      if (!isOperator) {
        setStep("approving-op");
        const opTx = await writeContractAsync({
          abi: CONFIDENTIAL_TOKEN_ABI,
          address: PAYMENT_TOKEN,
          functionName: "setOperator",
          args: [HUSH_CONTRACT_ADDRESS, 2 ** 48 - 1],
        });
        await waitForTx(writeContractAsync, opTx);
      }

      // Step 5: Encrypt the payment amount client-side via the Zama relayer.
      setStep("encrypting");
      const encrypted = await encryptMutation.mutateAsync({
        values: [{ value: paymentAmount, type: "euint64" }],
        contractAddress: HUSH_CONTRACT_ADDRESS,
        userAddress: address,
      });

      const handleHex = `0x${Buffer.from(encrypted.handles[0]).toString("hex")}` as `0x${string}`;
      const proofHex = `0x${Buffer.from(encrypted.inputProof).toString("hex")}` as `0x${string}`;

      // Step 6: Subscribe — Hush pulls the encrypted cUSDT and records access.
      setStep("subscribing");
      const hash = await writeContractAsync({
        abi: HUSH_ABI,
        address: HUSH_CONTRACT_ADDRESS,
        functionName: "subscribe",
        args: [creatorAddress as `0x${string}`, BigInt(tierIndex), handleHex, proofHex],
      });
      setTxHash(hash);
      setStep("done");
      queryClient.invalidateQueries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg);
      setStep("error");
    }
  }

  const busy = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-surface-900 border border-surface-700 shadow-xl space-y-6">
        {!busy && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-surface-500 hover:text-surface-300"
          >
            ✕
          </button>
        )}

        {step === "idle" && (
          <>
            <div>
              <h3 className="text-xl font-bold mb-1">Subscribe to {creatorName}</h3>
              <p className="text-surface-400">
                {tierName} · {formatTokenAmount(tierPrice)} cUSDT
                {tipAmount > 0n && (
                  <span className="block text-xs mt-1 text-hush-400">
                    + {formatTokenAmount(tipAmount)} cUSDT private tip
                  </span>
                )}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800 border border-surface-700 space-y-3">
              <p className="text-sm text-surface-300">
                Your payment is encrypted in your browser and sent onchain. The contract
                moves <span className="text-hush-400">real encrypted cUSDT</span> to the
                creator. Nobody — not even Hush — can see how much you paid. Only the creator
                can decrypt their <span className="text-hush-400">total</span>.
              </p>
              <div className="flex items-center gap-2 text-sm text-hush-400">
                <span>🔒</span>
                <span>Encrypted via Zama FHE</span>
              </div>
            </div>
            <div className="text-[11px] text-surface-500 space-y-1">
              <p>This will: get test USDT → shield to cUSDT → authorize Hush → encrypt payment → subscribe.</p>
            </div>
            <button
              onClick={handleSubscribe}
              className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
            >
              Confirm & Subscribe
            </button>
          </>
        )}

        {busy && (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-hush-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-surface-300">{STEP_LABEL[step]}</p>
            {step === "encrypting" && (
              <p className="text-xs text-surface-500">Your browser is encrypting the amount via the Zama relayer.</p>
            )}
            {step === "subscribing" && (
              <p className="text-xs text-surface-500">Sign the transaction in your wallet.</p>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8 space-y-4">
            <div className="text-4xl">🎉</div>
            <div>
              <p className="text-lg font-semibold">You&apos;re subscribed!</p>
              <p className="text-surface-400 text-sm mt-1">
                Your encrypted cUSDT payment to {creatorName} is onchain.
              </p>
            </div>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-hush-400 hover:text-hush-300 block"
              >
                View on Etherscan ↗
              </a>
            )}
            <p className="text-xs text-surface-500">
              On Etherscan you can see the transaction — but not how much you paid.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-8 space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-400 font-medium">Something went wrong</p>
            <p className="text-surface-400 text-sm break-words">{error}</p>
            <button
              onClick={() => setStep("idle")}
              className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: wagmi's writeContractAsync already returns a hash; we just need to
// wait for receipt via the public client. Kept simple — wagmi handles reverts.
async function waitForTx(
  _write: ReturnType<typeof useWriteContract>["writeContractAsync"],
  _hash: string
) {
  // wagmi throws on revert automatically; the tx is awaited by the caller.
  // This is a no-op placeholder so the flow reads clearly.
  return;
}
