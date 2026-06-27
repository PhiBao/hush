"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEncrypt, useUserDecrypt } from "@zama-fhe/react-sdk";
import { motion, AnimatePresence } from "motion/react";
import { ChartBarIcon, LockKeyIcon, SealCheckIcon, SpinnerIcon, NoteIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

interface PollSectionProps {
  creatorAddress: string;
  isCreator: boolean;
  isSubscribed: boolean;
}

export function PollSection({ creatorAddress, isCreator, isSubscribed }: PollSectionProps) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const encryptMutation = useEncrypt();

  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [voting, setVoting] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const { data: pollCount } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getPollCount",
    args: [creatorAddress as `0x${string}`],
  });

  const pollIndices = pollCount ? Array.from({ length: Number(pollCount) }, (_, i) => i) : [];

  async function handleCreatePoll() {
    if (!question.trim() || options.filter((o) => o.trim()).length < 2) return;
    setError("");
    setCreating(true);
    try {
      const hash = await writeContractAsync({
        abi: HUSH_ABI,
        address: HUSH_CONTRACT_ADDRESS,
        functionName: "createPoll",
        args: [question.trim(), options.filter((o) => o.trim())],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      queryClient.invalidateQueries();
      setShowCreate(false);
      setQuestion("");
      setOptions(["", ""]);
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Failed to create poll");
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(pollIndex: number, optionIndex: number) {
    if (!address) return;
    setError("");
    setVoting(pollIndex);
    try {
      const encrypted = await encryptMutation.mutateAsync({
        values: [{ value: BigInt(optionIndex), type: "euint64" }],
        contractAddress: HUSH_CONTRACT_ADDRESS,
        userAddress: address,
      });
      const handleHex = `0x${Buffer.from(encrypted.handles[0]).toString("hex")}` as `0x${string}`;
      const proofHex = `0x${Buffer.from(encrypted.inputProof).toString("hex")}` as `0x${string}`;

      const hash = await writeContractAsync({
        abi: HUSH_ABI,
        address: HUSH_CONTRACT_ADDRESS,
        functionName: "vote",
        args: [creatorAddress as `0x${string}`, BigInt(pollIndex), BigInt(optionIndex), handleHex, proofHex],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      queryClient.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Failed to vote");
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ChartBarIcon className="h-5 w-5 text-ember-400" />
          Encrypted polls
        </h3>
        {isCreator && (
          <Button size="sm" variant="secondary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "New poll"}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground max-w-[60ch]">
        Subscribers vote with an encrypted choice. The contract uses{" "}
        <code className="font-mono text-[11px] text-ember-300">FHE.select</code> to add
        1 to the chosen option and 0 to others — without learning which was picked.
        Only the creator can decrypt the aggregate results.
      </p>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
          {error}
        </p>
      )}

      <AnimatePresence>
        {showCreate && isCreator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Question</label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What should I write next?"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Options (2-6)</label>
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOptions([...options, ""])}
                  >
                    + Add option
                  </Button>
                )}
              </div>
              <Button
                onClick={handleCreatePoll}
                disabled={creating || !question.trim() || options.filter((o) => o.trim()).length < 2}
                className="w-full"
              >
                {creating ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : "Create poll"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pollIndices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center">
          <NoteIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No polls yet.</p>
          {isCreator && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create one to let subscribers vote on your next topic.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {pollIndices.map((pollIdx) => (
            <PollCard
              key={pollIdx}
              creatorAddress={creatorAddress}
              pollIndex={pollIdx}
              isCreator={isCreator}
              isSubscribed={isSubscribed}
              voting={voting === pollIdx}
              onVote={(optIdx) => handleVote(pollIdx, optIdx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PollCard({
  creatorAddress,
  pollIndex,
  isCreator,
  isSubscribed,
  voting,
  onVote,
}: {
  creatorAddress: string;
  pollIndex: number;
  isCreator: boolean;
  isSubscribed: boolean;
  voting: boolean;
  onVote: (optionIndex: number) => void;
}) {
  const { data: poll } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "polls",
    args: [creatorAddress as `0x${string}`, BigInt(pollIndex)],
  });

  const [question, options, , active] = poll as [string, string[], bigint, boolean] | undefined ?? ["", [], 0n, false];

  if (!question) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold tracking-tight">{question}</h4>
        {!active && <Badge variant="secondary">Closed</Badge>}
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <PollOption
            key={i}
            label={opt}
            optionIndex={i}
            creatorAddress={creatorAddress}
            pollIndex={pollIndex}
            isCreator={isCreator}
            active={active}
            voting={voting}
            onVote={onVote}
          />
        ))}
      </div>

      {!isCreator && isSubscribed && active && (
        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
          <LockKeyIcon className="h-3 w-3" />
          Your vote is encrypted. Nobody — not even the creator — can see your choice.
        </p>
      )}
      {isCreator && (
        <p className="text-[11px] text-ember-300/80 flex items-center gap-1.5">
          <SealCheckIcon className="h-3 w-3" />
          Decrypt results below — only you can see the aggregate votes.
        </p>
      )}
      {!isSubscribed && !isCreator && (
        <p className="text-[11px] text-muted-foreground">Subscribe to vote in this poll.</p>
      )}
    </div>
  );
}

function PollOption({
  label,
  optionIndex,
  creatorAddress,
  pollIndex,
  isCreator,
  active,
  voting,
  onVote,
}: {
  label: string;
  optionIndex: number;
  creatorAddress: string;
  pollIndex: number;
  isCreator: boolean;
  active: boolean;
  voting: boolean;
  onVote: (optionIndex: number) => void;
}) {
  const { data: voteHandle } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getPollVotes",
    args: [creatorAddress as `0x${string}`, BigInt(pollIndex), BigInt(optionIndex)],
  });

  const hasVotes = voteHandle !== undefined && voteHandle !== null && voteHandle !== 0n;
  const handleHex = hasVotes
    ? (`0x${(voteHandle as bigint).toString(16).padStart(64, "0")}` as `0x${string}`)
    : undefined;

  // Creator can decrypt the vote count.
  const { data: decryptedVotes, refetch } = useUserDecrypt(
    { handles: handleHex ? [{ handle: handleHex, contractAddress: HUSH_CONTRACT_ADDRESS }] : [] },
    { enabled: false }, // triggered manually
  );

  const [revealed, setRevealed] = useState(false);

  async function revealVotes() {
    setRevealed(true);
    refetch();
  }

  const voteCount = revealed && handleHex && decryptedVotes
    ? (decryptedVotes as Record<string, bigint> | undefined)?.[handleHex]
    : undefined;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
        active && !isCreator
          ? "border-border hover:border-ember-500/40 cursor-pointer"
          : "border-border",
      )}
      onClick={() => active && !isCreator && onVote(optionIndex)}
    >
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {isCreator && hasVotes && !revealed && (
          <span className="font-mono text-xs text-muted-foreground">••••</span>
        )}
        {isCreator && hasVotes && revealed && voteCount !== undefined && (
          <span className="font-mono text-sm font-semibold text-ember-300">{voteCount.toString()}</span>
        )}
        {isCreator && !hasVotes && (
          <span className="font-mono text-xs text-muted-foreground/50">0</span>
        )}
        {voting && !isCreator && (
          <SpinnerIcon className="h-3.5 w-3.5 animate-spin text-ember-400" />
        )}
      </div>
    </div>
  );
}
