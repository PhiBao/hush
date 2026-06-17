"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../../../lib/contract";
import { getPosts, Post } from "../../../lib/supabase";

interface GatedPost extends Post {
  gated?: boolean;
}

export default function ContentPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { address, isConnected } = useAccount();
  const creatorAddr = creatorId as `0x${string}`;

  const { data: creator, isLoading: loadingCreator } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "creators",
    args: [creatorAddr],
    query: { enabled: !!creatorAddr },
  });

  const { data: tiers } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getTiers",
    args: [creatorAddr],
    query: { enabled: !!creatorAddr },
  });

  const { data: isSubscribed, isLoading: checkingSub } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "isSubscribed",
    args: [creatorAddr, address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!creatorAddr && !!address },
  });

  const { data: subTier } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "subscriptionTier",
    args: [creatorAddr, address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!creatorAddr && !!address },
  });

  const [posts, setPosts] = useState<GatedPost[]>([]);
  const [previews, setPreviews] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const creatorName = (creator as [string, string, boolean])?.[0] || "this creator";
  const tierList = Array.isArray(tiers) ? tiers : [];
  const subscriberTier = subTier !== undefined ? Number(subTier) : -1;

  // Load public previews (no full content).
  useEffect(() => {
    if (creatorAddr) {
      getPosts(creatorAddr).then((p) => {
        setPreviews(p);
      });
    }
  }, [creatorAddr]);

  // Load gated full content via server API (onchain-verified).
  useEffect(() => {
    if (!creatorAddr || !isConnected) {
      setLoadingPosts(false);
      return;
    }
    setLoadingPosts(true);
    fetch(`/api/posts/${creatorAddr}?subscriber=${address}`)
      .then((r) => r.json())
      .then((data: { posts: Post[]; subscribed: boolean; subscriberTier: number }) => {
        const gated = data.posts.map((p) => ({
          ...p,
          gated: p.content === "" && p.tier_index > (data.subscriberTier ?? -1),
        }));
        setPosts(gated);
        setLoadingPosts(false);
      })
      .catch(() => setLoadingPosts(false));
  }, [creatorAddr, isConnected, address]);

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loadingCreator || checkingSub) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-hush-500 border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-xl mx-auto space-y-8">
          {!isConnected ? (
            <div className="text-center py-20 space-y-4">
              <p className="text-2xl">🔐</p>
              <h1 className="text-xl font-bold">Connect to access content</h1>
              <p className="text-surface-400 text-sm">This content is for subscribers only.</p>
              <ConnectButton />
            </div>
          ) : !isSubscribed ? (
            <div className="text-center py-20 space-y-4">
              <p className="text-2xl">🔐</p>
              <h1 className="text-xl font-bold">Subscriber-only content</h1>
              <p className="text-surface-400 text-sm max-w-sm mx-auto">
                You need an active subscription to {creatorName} to access exclusive content.
              </p>
              <Link
                href={`/${creatorId}`}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
              >
                Subscribe Now
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 border border-green-800/50 text-green-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Subscribed
                  {tierList[subscriberTier] && (
                    <span> &middot; {(tierList[subscriberTier] as { name: string }).name}</span>
                  )}
                </p>
                <h1 className="text-xl font-bold">{creatorName}&apos;s Content</h1>
                <p className="text-[11px] text-surface-500">
                  Access verified onchain. No content is sent to your browser unless your subscription is active.
                </p>
              </div>

              {loadingPosts ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-surface-800 bg-surface-900/20 animate-pulse">
                      <div className="h-4 w-3/4 bg-surface-800 rounded mb-2" />
                      <div className="h-3 w-full bg-surface-800 rounded mb-1" />
                      <div className="h-3 w-1/2 bg-surface-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 && previews.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <p className="text-3xl">📝</p>
                  <p className="text-surface-400 text-sm">No posts yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className={`p-5 rounded-xl border bg-surface-900/50 ${
                        post.gated ? "border-surface-800" : "border-surface-700"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="font-semibold text-[15px]">{post.title}</h2>
                        {post.tier_index > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-hush-900/30 border border-hush-800/50 text-hush-400 ml-2 shrink-0">
                            {(tierList[post.tier_index] as { name: string })?.name || `Tier ${post.tier_index + 1}`}
                          </span>
                        )}
                      </div>
                      {post.gated ? (
                        <div className="space-y-3">
                          <p className="text-sm text-surface-500 italic">{post.preview || "Locked content."}</p>
                          <div className="flex items-center gap-2 text-xs text-hush-400">
                            <span>🔒</span>
                            <span>
                              Upgrade to {(tierList[post.tier_index] as { name: string })?.name} to read this.
                            </span>
                          </div>
                          <Link
                            href={`/${creatorId}`}
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-xs font-medium transition-colors"
                          >
                            Upgrade
                          </Link>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-surface-300 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>
                          <p className="text-[11px] text-surface-500 mt-4">{formatDate(post.created_at)}</p>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <div className="text-center">
                <Link href={`/${creatorId}`} className="text-hush-400 hover:text-hush-300 text-sm">
                  &larr; Back to {creatorName}&apos;s page
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-sm flex items-center justify-between px-6 py-3 border-b border-surface-800">
      <Link href="/" className="text-lg font-bold text-gradient">
        Hush
      </Link>
      <ConnectButton />
    </header>
  );
}
