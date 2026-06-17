"use client";

import { useState, useEffect, useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContracts } from "wagmi";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../lib/contract";
import { getAllPosts, Post } from "../lib/supabase";

export default function Home() {
  const { address, isConnected } = useAccount();

  const { data: existingCreator } = useReadContracts({
    contracts: isConnected && address
      ? [
          {
            abi: HUSH_ABI,
            address: HUSH_CONTRACT_ADDRESS,
            functionName: "creators",
            args: [address],
          } as const,
        ]
      : [],
    query: { enabled: !!address },
  });

  const isRegistered = (existingCreator?.[0]?.result as [string, string, boolean])?.[2] ?? false;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPosts().then((p) => {
      setPosts(p);
      setLoading(false);
    });
  }, []);

  const uniqueCreators = useMemo(() => {
    return [...new Set(posts.map((p) => p.creator_address.toLowerCase()))];
  }, [posts]);

  const { data: subResults } = useReadContracts({
    contracts: isConnected && address
      ? uniqueCreators.map(
          (creatorAddr) =>
            ({
              abi: HUSH_ABI,
              address: HUSH_CONTRACT_ADDRESS,
              functionName: "isSubscribed",
              args: [creatorAddr as `0x${string}`, address],
            } as const)
        )
      : [],
    query: { enabled: uniqueCreators.length > 0 },
  });

  const subscribedCreators = useMemo(() => {
    const set = new Set<string>();
    if (subResults && uniqueCreators.length > 0) {
      uniqueCreators.forEach((creatorAddr, i) => {
        if (subResults[i]?.result === true) {
          set.add(creatorAddr);
        }
      });
    }
    return set;
  }, [subResults, uniqueCreators]);

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-sm flex items-center justify-between px-6 py-3 border-b border-surface-800">
        <Link href="/" className="text-lg font-bold text-gradient">
          Hush
        </Link>
        <nav className="flex items-center gap-3">
          {isConnected && (
            <Link
              href="/my-subs"
              className="text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
              My Subs
            </Link>
          )}
          {isConnected && isRegistered && (
            <Link
              href="/dashboard"
              className="text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
              Dashboard
            </Link>
          )}
          <ConnectButton />
        </nav>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-xl mx-auto space-y-10">
          {/* Hero */}
          <div className="text-center space-y-4 pt-4">
            <h1 className="text-4xl font-bold">
              <span className="text-gradient">Hush</span>
            </h1>
            <p className="text-surface-300 text-base max-w-sm mx-auto leading-relaxed">
              Creator subscriptions with encrypted payments.
              Support who you want — nobody sees how much.
            </p>
            <p className="text-surface-500 text-xs max-w-md mx-auto leading-relaxed">
              Built on the Zama Protocol. Your payment is encrypted in your browser,
              computed onchain as ciphertext, and decrypted only by the creator.
            </p>

            {/* The privacy contrast */}
            <div className="grid grid-cols-2 gap-3 pt-2 max-w-md mx-auto">
              <div className="p-4 rounded-xl border border-red-900/40 bg-red-950/20 text-left">
                <p className="text-[11px] uppercase tracking-wider text-red-400 mb-1">Today</p>
                <p className="text-sm text-surface-400">
                  Every onchain tip is <span className="text-red-300">public forever</span>.
                  Anyone can see who paid whom and how much.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-hush-800/40 bg-hush-950/20 text-left">
                <p className="text-[11px] uppercase tracking-wider text-hush-400 mb-1">Hush</p>
                <p className="text-sm text-surface-400">
                  Payments are <span className="text-hush-300">encrypted onchain</span>.
                  Only the creator decrypts their total. Nobody else sees anything.
                </p>
              </div>
            </div>

            {!isConnected && (
              <div className="pt-4">
                <ConnectButton />
              </div>
            )}
            {isConnected && !isRegistered && (
              <div className="pt-4">
                <Link
                  href="/create"
                  className="inline-flex items-center px-6 py-2.5 rounded-xl bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
                >
                  Become a Creator
                </Link>
              </div>
            )}
          </div>

          {/* Feed */}
          <section className="space-y-2">
            <h2 className="text-xs font-medium text-surface-500 uppercase tracking-wider px-1">
              Latest
            </h2>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-surface-800 bg-surface-900/20 animate-pulse"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-surface-800" />
                      <div className="h-3 w-24 bg-surface-800 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-surface-800 rounded mb-2" />
                    <div className="h-3 w-full bg-surface-800 rounded mb-1" />
                    <div className="h-3 w-1/2 bg-surface-800 rounded" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <p className="text-3xl">📝</p>
                <div>
                  <p className="text-surface-300 font-medium">No posts yet</p>
                  <p className="text-surface-500 text-sm mt-1">
                    Be the first creator to share something with your audience.
                  </p>
                </div>
                <Link
                  href="/create"
                  className="inline-flex items-center px-5 py-2.5 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
                >
                  Create Your Page
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => {
                  const creatorAddr = post.creator_address.toLowerCase();
                  const isSubbed = subscribedCreators.has(creatorAddr);
                  const displayName =
                    post.creator_name || `${creatorAddr.slice(0, 6)}...${creatorAddr.slice(-4)}`;
                  const previewText = post.preview || post.content;

                  return (
                    <Link
                      key={post.id}
                      href={isSubbed ? `/${post.creator_address}/content` : `/${post.creator_address}`}
                      className="block"
                    >
                      <div
                        className={`relative p-4 rounded-xl border transition-all ${
                          isSubbed
                            ? "border-surface-700 bg-surface-900/50 hover:border-hush-500/30 hover:bg-surface-900/70"
                            : "border-surface-800 bg-surface-900/20 hover:border-surface-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-hush-500 to-hush-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                            {displayName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-surface-200 truncate">
                            {displayName}
                          </span>
                          <span className="text-[11px] text-surface-500 shrink-0">
                            {formatDate(post.created_at)}
                          </span>
                          {post.tier_index > 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-hush-900/30 border border-hush-800/50 text-hush-400 ml-auto">
                              Tier {post.tier_index + 1}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-surface-100 text-[15px] mb-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-surface-400 line-clamp-2 leading-relaxed">
                          {previewText || "Subscribe to read this post."}
                        </p>

                        {!isSubbed && post.tier_index > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-hush-400">
                            <span>🔒</span>
                            <span>Subscribe to unlock</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="text-center text-surface-600 text-[11px] py-6 border-t border-surface-800/50">
        Private payments &middot; Encrypted on Zama fhEVM &middot; Confidential payroll for the creator economy
      </footer>
    </div>
  );
}
