"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS, formatTokenAmount } from "../../lib/contract";
import { getAllPosts, Post } from "../../lib/supabase";

export default function MySubsPage() {
  const { address, isConnected } = useAccount();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPosts().then((p) => {
      setPosts(p);
      setLoading(false);
    });
  }, []);

  const uniqueCreators = useMemo(
    () => [...new Set(posts.map((p) => p.creator_address.toLowerCase()))],
    [posts]
  );

  // Read subscription status + tier + expiry for every creator the user might follow.
  const { data: subResults } = useReadContracts({
    contracts: isConnected && address
      ? uniqueCreators.flatMap((creatorAddr) => [
          {
            abi: HUSH_ABI,
            address: HUSH_CONTRACT_ADDRESS,
            functionName: "isSubscribed",
            args: [creatorAddr as `0x${string}`, address],
          } as const,
          {
            abi: HUSH_ABI,
            address: HUSH_CONTRACT_ADDRESS,
            functionName: "subscriptionExpiry",
            args: [creatorAddr as `0x${string}`, address],
          } as const,
          {
            abi: HUSH_ABI,
            address: HUSH_CONTRACT_ADDRESS,
            functionName: "subscriptionTier",
            args: [creatorAddr as `0x${string}`, address],
          } as const,
        ])
      : [],
    query: { enabled: uniqueCreators.length > 0 && !!address },
  });

  const activeSubs = useMemo(() => {
    const subs: { creator: string; expiry: bigint; tierIndex: number }[] = [];
    if (subResults && uniqueCreators.length > 0) {
      uniqueCreators.forEach((creatorAddr, i) => {
        const isSubbed = subResults[i * 3]?.result as boolean;
        const expiry = subResults[i * 3 + 1]?.result as bigint;
        const tier = subResults[i * 3 + 2]?.result as bigint;
        if (isSubbed && expiry && expiry > 0n) {
          subs.push({ creator: creatorAddr, expiry, tierIndex: Number(tier) });
        }
      });
    }
    return subs.sort((a, b) => Number(a.expiry - b.expiry));
  }, [subResults, uniqueCreators]);

  function daysLeft(expiry: bigint) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const secs = expiry - now;
    if (secs <= 0n) return "expired";
    const d = Number(secs) / 86400;
    return d >= 1 ? `${Math.floor(d)}d left` : `${Math.floor(Number(secs) / 3600)}h left`;
  }

  function creatorName(addr: string) {
    const p = posts.find((x) => x.creator_address.toLowerCase() === addr);
    return p?.creator_name || `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-sm flex items-center justify-between px-6 py-3 border-b border-surface-800">
        <Link href="/" className="text-lg font-bold text-gradient">
          Hush
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
            Feed
          </Link>
          <ConnectButton />
        </nav>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-xl mx-auto space-y-8">
          {!isConnected ? (
            <div className="text-center py-20 space-y-4">
              <h1 className="text-xl font-bold">Connect your wallet</h1>
              <p className="text-surface-400 text-sm">See your active subscriptions and renew before they expire.</p>
              <ConnectButton />
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-hush-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : activeSubs.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <p className="text-3xl">📭</p>
              <h1 className="text-xl font-bold">No active subscriptions</h1>
              <p className="text-surface-400 text-sm">Discover creators on the feed and subscribe privately.</p>
              <Link
                href="/"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
              >
                Browse Creators
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold">My Subscriptions</h1>
                <p className="text-surface-400 text-sm mt-1">
                  {activeSubs.length} active · amounts always private
                </p>
              </div>
              <div className="space-y-3">
                {activeSubs.map((sub) => (
                  <Link
                    key={sub.creator}
                    href={`/${sub.creator}/content`}
                    className="block p-4 rounded-xl border border-surface-700 bg-surface-900/50 hover:border-hush-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-hush-500 to-hush-700 flex items-center justify-center text-sm font-bold">
                          {creatorName(sub.creator).charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{creatorName(sub.creator)}</p>
                          <p className="text-[11px] text-surface-500">Tier {sub.tierIndex + 1}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-400">{daysLeft(sub.expiry)}</p>
                        <Link
                          href={`/${sub.creator}`}
                          className="text-[11px] text-hush-400 hover:text-hush-300"
                        >
                          Renew →
                        </Link>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
