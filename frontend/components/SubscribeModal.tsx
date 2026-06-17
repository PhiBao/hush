"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { RelayerWeb, SepoliaConfig } from "@zama-fhe/sdk";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../lib/contract";

const relayer = new RelayerWeb(SepoliaConfig as never);

interface SubscribeModalProps {
  creatorAddress: string;
  creatorName: string;
  tierName: string;
  tierPrice: string;
  tierIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SubscribeModal({
  creatorAddress,
  creatorName,
  tierName,
  tierPrice,
  tierIndex,
  isOpen,
  onClose,
}: SubscribeModalProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<
    "idle" | "encrypting" | "subscribing" | "done" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  if (!isOpen) return null;

  async function handleSubscribe() {
    if (!address) return;
    setStatus("encrypting");
    setError("");

    try {
      const paymentAmount = BigInt(tierPrice);
      const encrypted = await relayer.encrypt({
        values: [{ value: paymentAmount, type: "euint64" }],
        contractAddress: HUSH_CONTRACT_ADDRESS as `0x${string}`,
        userAddress: address,
      });

      const handleHex = `0x${Buffer.from(encrypted.handles[0]).toString("hex")}` as `0x${string}`;
      const proofHex = `0x${Buffer.from(encrypted.inputProof).toString("hex")}` as `0x${string}`;

      setStatus("subscribing");

      const hash = await writeContractAsync({
        abi: HUSH_ABI,
        address: HUSH_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "subscribe",
        args: [
          creatorAddress as `0x${string}`,
          BigInt(tierIndex),
          handleHex,
          proofHex,
        ],
      });

      setTxHash(hash);
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-surface-900 border border-surface-700 shadow-xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-surface-500 hover:text-surface-300"
        >
          ✕
        </button>

        {status === "idle" && (
          <>
            <div>
              <h3 className="text-xl font-bold mb-1">
                Subscribe to {creatorName}
              </h3>
              <p className="text-surface-400">
                {tierName} &middot; {tierPrice} wei
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800 border border-surface-700">
              <p className="text-sm text-surface-300 mb-2">
                Your payment amount will be encrypted onchain. Only{" "}
                {creatorName} can decrypt their total earnings. Individual
                subscriber amounts remain private.
              </p>
              <div className="flex items-center gap-2 text-sm text-hush-400">
                <span>🔒</span>
                <span>Encrypted via Zama FHE</span>
              </div>
            </div>
            <button
              onClick={handleSubscribe}
              className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
            >
              Confirm Subscription
            </button>
          </>
        )}

        {(status === "encrypting" || status === "subscribing") && (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-hush-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-surface-300">
              {status === "encrypting"
                ? "Encrypting your payment..."
                : "Confirming subscription..."}
            </p>
            {status === "subscribing" && (
              <p className="text-xs text-surface-500">
                Sign the transaction in your wallet
              </p>
            )}
          </div>
        )}

        {status === "done" && (
          <div className="text-center py-8 space-y-4">
            <div className="text-4xl">🎉</div>
            <div>
              <p className="text-lg font-semibold">You&apos;re subscribed!</p>
              <p className="text-surface-400 text-sm mt-1">
                Your support for {creatorName} is encrypted onchain.
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
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center py-8 space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-400 font-medium">Something went wrong</p>
            <p className="text-surface-400 text-sm">{error}</p>
            <button
              onClick={() => setStatus("idle")}
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
