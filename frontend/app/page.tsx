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
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3 pb-2">
            <h1 className="text-3xl font-bold">
              <span className="text-gradient">Hush</span>
            </h1>
            <p className="text-surface-400 text-sm max-w-sm mx-auto leading-relaxed">
              Creator subscriptions with encrypted payments. Support who you want. Nobody sees how much.
            </p>
            {!isConnected && (
              <div className="pt-3">
                <ConnectButton />
              </div>
            )}
            {isConnected && !isRegistered && (
              <div className="pt-3">
                <Link
                  href="/create"
                  className="inline-flex items-center px-6 py-2.5 rounded-xl bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
                >
                  Become a Creator
                </Link>
              </div>
            )}
          </div>

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
                  const displayName = post.creator_name || `${creatorAddr.slice(0, 6)}...${creatorAddr.slice(-4)}`;

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

                        <div className={isSubbed ? "" : "blur-[3px] select-none opacity-30"}>
                          <h3 className="font-semibold text-surface-100 text-[15px] mb-1">
                            {post.title}
                          </h3>
                          <p className="text-sm text-surface-400 line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        {!isSubbed && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-950/50">
                            <p className="text-xs text-surface-300">
                              {isConnected
                                ? "Subscribe to read"
                                : "Connect to read"}
                            </p>
                            {!isConnected ? (
                              <div onClick={(e) => e.preventDefault()}>
                                <ConnectButton />
                              </div>
                            ) : (
                              <span className="text-[11px] text-hush-400">
                                Click to view
                              </span>
                            )}
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
        Private payments &middot; Encrypted on Zama fhEVM
      </footer>
    </div>
  );
}
