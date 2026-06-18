"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEncrypt } from "@zama-fhe/react-sdk";
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  HUSH_ABI,
  HUSH_CONTRACT_ADDRESS,
  PAYMENT_TOKEN,
  PAYMENT_TOKEN_UNDERLYING,
  CONFIDENTIAL_TOKEN_ABI,
  ERC20_ABI,
  formatTokenAmount,
} from "@/lib/contract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step =
  | "idle"
  | "minting"
  | "approving-wrap"
  | "shielding"
  | "approving-op"
  | "encrypting"
  | "subscribing"
  | "done"
  | "error";

interface SubscribeModalProps {
  creatorAddress: string;
  creatorName: string;
  tierName: string;
  tierPrice: string;
  tierIndex: number;
  isOpen: boolean;
  onClose: () => void;
  tipAmount?: bigint;
}

const STEP_LABEL: Record<Step, string> = {
  idle: "Confirm subscription",
  minting: "Getting test USDT",
  "approving-wrap": "Approving USDT for shielding",
  shielding: "Shielding USDT to cUSDT (encrypting your tokens)",
  "approving-op": "Authorizing Hush to spend your cUSDT",
  encrypting: "Encrypting your payment amount",
  subscribing: "Confirming subscription onchain",
  done: "Subscribed",
  error: "Something went wrong",
};

const ORDER: Step[] = [
  "minting",
  "approving-wrap",
  "shielding",
  "approving-op",
  "encrypting",
  "subscribing",
];

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

  const paymentAmount = BigInt(tierPrice) + tipAmount;
  const busy = step !== "idle" && step !== "done" && step !== "error";
  const stepIndex = ORDER.indexOf(step);

  function handleOpenChange(open: boolean) {
    if (!open && !busy) {
      onClose();
      if (step === "done") setStep("idle");
    }
  }

  async function handleSubscribe() {
    if (!address) return;
    setStep("minting");
    setError("");

    try {
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

      setStep("approving-wrap");
      const approveTx = await writeContractAsync({
        abi: ERC20_ABI,
        address: PAYMENT_TOKEN_UNDERLYING,
        functionName: "approve",
        args: [PAYMENT_TOKEN, paymentAmount],
      });
      await waitForTx(writeContractAsync, approveTx);

      setStep("shielding");
      const wrapTx = await writeContractAsync({
        abi: CONFIDENTIAL_TOKEN_ABI,
        address: PAYMENT_TOKEN,
        functionName: "wrap",
        args: [address, paymentAmount],
      });
      await waitForTx(writeContractAsync, wrapTx);

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

      setStep("encrypting");
      const encrypted = await encryptMutation.mutateAsync({
        values: [{ value: paymentAmount, type: "euint64" }],
        contractAddress: HUSH_CONTRACT_ADDRESS,
        userAddress: address,
      });

      const handleHex = `0x${Buffer.from(encrypted.handles[0]).toString("hex")}` as `0x${string}`;
      const proofHex = `0x${Buffer.from(encrypted.inputProof).toString("hex")}` as `0x${string}`;

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
      toast.success("Subscribed", {
        description: `Your encrypted payment to ${creatorName} is onchain.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg);
      setStep("error");
      toast.error("Subscription failed", { description: msg.split("\n")[0] });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent showClose={!busy} className="max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          {step === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              <DialogHeader>
                <DialogTitle>Subscribe to {creatorName}</DialogTitle>
                <DialogDescription>
                  {tierName} · {formatTokenAmount(tierPrice)} cUSDT
                  {tipAmount > 0n && (
                    <span className="mt-1 block text-ember-300">
                      + {formatTokenAmount(tipAmount)} cUSDT private tip
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                <p className="text-sm leading-relaxed text-foreground/90">
                  Your payment is encrypted in your browser and sent onchain. The
                  contract moves <span className="text-ember-300">real encrypted cUSDT</span> to
                  the creator. Nobody, not even Hush, can see how much you paid. Only
                  the creator can decrypt their <span className="text-ember-300">total</span>.
                </p>
                <Badge variant="cipher" className="gap-1.5">
                  <LockKeyIcon weight="fill" className="h-3 w-3" />
                  Encrypted via Zama FHE
                </Badge>
              </div>

              <p className="font-mono text-[11px] text-muted-foreground/80">
                get test USDT, shield to cUSDT, authorize Hush, encrypt payment, subscribe
              </p>

              <Button onClick={handleSubscribe} size="lg" className="w-full">
                <ShieldCheckIcon className="h-4 w-4" />
                Confirm and subscribe
              </Button>
            </motion.div>
          )}

          {busy && (
            <motion.div
              key="busy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 py-4"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <SpinnerIcon className="h-5 w-5 animate-spin text-primary" />
                  {STEP_LABEL[step]}
                </DialogTitle>
                <DialogDescription>
                  {step === "encrypting" &&
                    "Your browser is encrypting the amount via the Zama relayer."}
                  {step === "subscribing" && "Sign the transaction in your wallet."}
                  {(step === "minting" || step === "approving-wrap" || step === "shielding" || step === "approving-op") &&
                    "Confirm each step in your wallet as it appears."}
                </DialogDescription>
              </DialogHeader>

              <ol className="space-y-1">
                {ORDER.map((s, i) => {
                  const state =
                    i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
                  return (
                    <li
                      key={s}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        state === "active" && "bg-muted/60 text-foreground",
                        state === "todo" && "text-muted-foreground/50",
                        state === "done" && "text-muted-foreground",
                      )}
                    >
                      {state === "done" ? (
                        <CheckCircleIcon weight="fill" className="h-4 w-4 shrink-0 text-success" />
                      ) : state === "active" ? (
                        <SpinnerIcon className="h-4 w-4 shrink-0 animate-spin text-primary" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                      )}
                      {STEP_LABEL[s]}
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5 py-2 text-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.05 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success"
              >
                <CheckCircleIcon weight="fill" className="h-8 w-8" />
              </motion.div>
              <div>
                <DialogTitle className="text-center">You are subscribed</DialogTitle>
                <DialogDescription className="mt-1.5 text-center">
                  Your encrypted cUSDT payment to {creatorName} is onchain.
                </DialogDescription>
              </div>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-ember-300 hover:text-ember-200 transition-colors"
                >
                  View on Etherscan <ArrowSquareOutIcon className="h-3.5 w-3.5" />
                </a>
              )}
              <p className="text-[11px] text-muted-foreground/80">
                On Etherscan you can see the transaction, but not how much you paid.
              </p>
              <Button
                onClick={() => {
                  onClose();
                  setStep("idle");
                }}
                size="lg"
                className="w-full"
              >
                Done
              </Button>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5 py-2 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <WarningCircleIcon weight="fill" className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle className="text-center text-destructive-foreground">
                  Something went wrong
                </DialogTitle>
                <p className="mt-1.5 break-words text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                onClick={() => setStep("idle")}
                size="lg"
                variant="secondary"
                className="w-full"
              >
                Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

async function waitForTx(
  _write: ReturnType<typeof useWriteContract>["writeContractAsync"],
  _hash: string,
) {
  return;
}
