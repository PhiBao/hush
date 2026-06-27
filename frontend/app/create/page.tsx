"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, SparkleIcon, CopyIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS, parseTokenAmount } from "@/lib/contract";
import { TierBuilder, type TierData } from "@/components/creator/TierBuilder";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEPS = ["Profile", "Tiers", "Done"] as const;

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const { data: existingCreator } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "creators",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const isRegistered = (existingCreator as [string, string, boolean] | undefined)?.[2] ?? false;
  const existingName = (existingCreator as [string, string, boolean] | undefined)?.[0] ?? "";

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!isConnected) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Connect your wallet to start
          </h1>
          <p className="text-sm text-muted-foreground">You will need a wallet to create your creator page.</p>
          <ConnectButton />
        </main>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-ember-300">
            <SparkleIcon weight="fill" className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            You are already a creator, {existingName}
          </h1>
          <p className="text-sm text-muted-foreground">Your creator page is already live.</p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href={`/${address}`}>View your page</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  async function handleRegister() {
    if (!name.trim()) return;
    setError("");
    setLoading(true);
    try {
      await writeContractAsync({
        abi: HUSH_ABI,
        address: HUSH_CONTRACT_ADDRESS,
        functionName: "registerCreator",
        args: [name, bio],
      });
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
      setStep(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      if (msg.includes("Already registered")) setError("This wallet is already registered as a creator.");
      else if (msg.includes("user rejected")) setError("Transaction was rejected.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTiers() {
    if (tiers.length === 0) {
      setStep(2);
      return;
    }
    setError("");
    setLoading(true);
    try {
      for (const tier of tiers) {
        await writeContractAsync({
          abi: HUSH_ABI,
          address: HUSH_CONTRACT_ADDRESS,
          functionName: "addTier",
          args: [tier.name, parseTokenAmount(tier.price), BigInt(tier.durationSecs), tier.description],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
      setStep(2);
      router.push(`/${address}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add tiers";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = address ? `${origin}/${address}` : "";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied", { description: shareUrl });
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1 py-12 md:py-16">
        <Container size="narrow" className="space-y-10">
          {/* Stepper */}
          <ol className="flex items-center justify-center gap-2">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-primary/10 text-ember-300"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs">
                  {i < step ? <CheckIcon weight="bold" className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>

          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create your profile</h2>
                  <p className="mt-1 text-sm text-muted-foreground">This is what your subscribers will see.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name or alias"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell your audience about yourself"
                      rows={3}
                    />
                  </div>
                  {error && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive-foreground/90">
                      {error}
                    </p>
                  )}
                  <Button onClick={handleRegister} disabled={loading || !name.trim()} size="lg" className="w-full">
                    {loading ? "Registering" : "Continue"}
                    {!loading && <ArrowRightIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="tiers"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create subscription tiers</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add one or more tiers for your subscribers to choose from.
                  </p>
                </div>
                <TierBuilder tiers={tiers} onChange={setTiers} />
                {error && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive-foreground/90">
                    {error}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleAddTiers} disabled={loading} className="flex-1">
                    {loading ? "Saving" : tiers.length === 0 ? "Skip" : "Continue"}
                    {!loading && <ArrowRightIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.05 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success"
                >
                  <CheckIcon weight="bold" className="h-8 w-8" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your page is live</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Share your link with your audience.</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-3 text-left">
                  <code className="flex-1 break-all font-mono text-sm text-ember-300">
                    {origin}/{address}
                  </code>
                  <Button size="icon" variant="secondary" onClick={copyLink} aria-label="Copy link">
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button onClick={copyLink} className="flex-1">
                    <CopyIcon className="h-4 w-4" />
                    Copy link
                  </Button>
                  <Button asChild variant="secondary" className="flex-1">
                    <Link href={`/${address}`}>View page</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
