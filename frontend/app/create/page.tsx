"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../../lib/contract";
import { TierBuilder, TierData } from "../../components/TierBuilder";

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Connect your wallet to start</h1>
          <p className="text-surface-400">You&apos;ll need a wallet to create your creator page.</p>
          <ConnectButton />
        </main>
      </div>
    );
  }

  async function handleRegister() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await writeContractAsync({
        abi: HUSH_ABI,
        address: HUSH_CONTRACT_ADDRESS,
        functionName: "registerCreator",
        args: [name, bio],
      });
      setStep(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTiers() {
    if (tiers.length === 0) {
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      for (const tier of tiers) {
        await writeContractAsync({
          abi: HUSH_ABI,
          address: HUSH_CONTRACT_ADDRESS,
          functionName: "addTier",
          args: [
            tier.name,
            BigInt(tier.price),
            BigInt(tier.durationSecs),
            tier.description,
          ],
        });
      }
      setStep(2);
      router.push(`/${address}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="flex gap-2 justify-center">
            {["Profile", "Tiers", "Done"].map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  i === step
                    ? "bg-hush-600 text-white"
                    : i < step
                      ? "bg-hush-900/30 text-hush-400"
                      : "bg-surface-800 text-surface-500"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-surface-950 text-xs">
                  {i < step ? "✓" : i + 1}
                </span>
                {label}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Create your creator profile</h2>
                <p className="text-surface-400">This is what your subscribers will see.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name or alias"
                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 placeholder-surface-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your audience about yourself..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 placeholder-surface-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={loading || !name.trim()}
                  className="w-full py-3 rounded-xl bg-hush-600 hover:bg-hush-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {loading ? "Registering..." : "Continue"}
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Create subscription tiers</h2>
                <p className="text-surface-400">
                  Add one or more tiers for your subscribers to choose from.
                </p>
              </div>
              <TierBuilder tiers={tiers} onChange={setTiers} />
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-3 rounded-xl border border-surface-700 hover:border-surface-500 text-surface-300 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAddTiers}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-hush-600 hover:bg-hush-500 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  {loading ? "Saving..." : tiers.length === 0 ? "Skip" : "Continue"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6">
              <div className="text-4xl">🎉</div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Your page is live!</h2>
                <p className="text-surface-400">Share your link with your audience.</p>
              </div>
              <div className="p-4 rounded-xl bg-surface-800 border border-surface-700">
                <p className="text-sm text-surface-400 mb-1">Your page:</p>
                <p className="text-hush-400 font-mono text-sm break-all">
                  hush.vercel.app/{address}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://hush.vercel.app/${address}`
                    );
                  }}
                  className="flex-1 py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => router.push(`/${address}`)}
                  className="flex-1 py-3 rounded-xl border border-surface-700 hover:border-surface-500 text-surface-300 font-medium transition-colors"
                >
                  View Page
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
      <a href="/" className="text-xl font-bold text-gradient">
        Hush
      </a>
      <ConnectButton />
    </header>
  );
}
