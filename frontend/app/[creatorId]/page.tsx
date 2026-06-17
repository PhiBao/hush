"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../../lib/contract";
import { TierCard } from "../../components/TierCard";
import { SubscribeModal } from "../../components/SubscribeModal";
import { getPosts, Post } from "../../lib/supabase";

interface TierData {
  name: string;
  price: string;
  durationSecs: string;
  description: string;
}

export default function CreatorPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { address, isConnected } = useAccount();
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{
    name: string;
    price: string;
    index: number;
  } | null>(null);
  const [localSubscribed, setLocalSubscribed] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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

  const { data: isSubscribed } = useReadContract({
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

  const creatorName = (creator as [string, string, boolean])?.[0] || "";
  const creatorBio = (creator as [string, string, boolean])?.[1] || "";
  const isRegistered = (creator as [string, string, boolean])?.[2] || false;
  const subscribed = isSubscribed || localSubscribed;
  const subscriberTierIndex = subTier !== undefined ? Number(subTier) : -1;

  const tierList: TierData[] = Array.isArray(tiers) ? (tiers as unknown as TierData[]) : [];

  useEffect(() => {
    if (isSubscribed) setLocalSubscribed(true);
  }, [isSubscribed]);

  useEffect(() => {
    if (creatorAddr) {
      getPosts(creatorAddr).then((p) => {
        setPosts(p);
        setLoadingPosts(false);
      });
    }
  }, [creatorAddr]);

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function canViewPost(post: Post) {
    return subscribed && post.tier_index <= subscriberTierIndex;
  }

  function previewText(post: Post) {
    return post.preview || (post.content ? post.content.slice(0, 160) : "");
  }

  if (loadingCreator) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-hush-500 border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-2xl">🔍</p>
          <h1 className="text-xl font-bold">Creator not found</h1>
          <p className="text-surface-400 text-sm">This address hasn&apos;t registered on Hush yet.</p>
          <Link href="/" className="text-hush-400 hover:text-hush-300 text-sm">
            Back to feed
          </Link>
        </main>
      </div>
    );
  }

  const hasPosts = posts.length > 0;
  const hasTiers = tierList.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="w-full max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-hush-500 to-hush-700 mx-auto flex items-center justify-center text-2xl font-bold">
              {creatorName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{creatorName}</h1>
              {creatorBio && (
                <p className="text-surface-400 text-sm max-w-sm mx-auto mt-1">{creatorBio}</p>
              )}
            </div>
            {subscribed && address && (
              <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 border border-green-800/50 text-green-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Subscribed
                {tierList[subscriberTierIndex] && (
                  <span> &middot; {(tierList[subscriberTierIndex] as { name: string }).name}</span>
                )}
              </p>
            )}
          </div>

          {hasPosts && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-surface-400 px-1">Posts</h2>
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
              ) : (
                <div className="space-y-2">
                  {posts.map((post) => {
                    const viewable = canViewPost(post);
                    return (
                      <div
                        key={post.id}
                        className={`relative p-4 rounded-xl border transition-colors ${
                          viewable
                            ? "border-surface-700 bg-surface-900/50 hover:border-hush-500/30"
                            : "border-surface-800 bg-surface-900/20"
                        }`}
                      >
                        {viewable ? (
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-[15px]">{post.title}</h3>
                              {post.tier_index > 0 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-hush-900/30 border border-hush-800/50 text-hush-400 ml-2 shrink-0">
                                  {(tierList[post.tier_index] as { name: string })?.name || `Tier ${post.tier_index + 1}`}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-surface-300 whitespace-pre-wrap leading-relaxed">
                              {post.content}
                            </p>
                            <p className="text-[11px] text-surface-500 mt-3">
                              {formatDate(post.created_at)}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <h3 className="font-semibold text-[15px] mb-1">{post.title}</h3>
                              <p className="text-sm text-surface-400 line-clamp-2 leading-relaxed">
                                {previewText(post) || "Subscribe to read this post."}
                              </p>
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-950/70">
                              <p className="text-xs text-surface-300">
                                {isConnected
                                  ? `Subscribe to unlock ${(tierList[post.tier_index] as { name: string })?.name || "this"} content`
                                  : "Connect to subscribe"}
                              </p>
                              {!isConnected ? (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <ConnectButton />
                                </div>
                              ) : !subscribed ? (
                                <button
                                  onClick={() => {
                                    setSelectedTier({
                                      name: tierList[post.tier_index]?.name || `Tier ${post.tier_index + 1}`,
                                      price: tierList[post.tier_index]?.price || "0",
                                      index: post.tier_index,
                                    });
                                    setShowSubscribe(true);
                                  }}
                                  className="px-4 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-xs font-medium transition-colors"
                                >
                                  Subscribe
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedTier({
                                      name: tierList[post.tier_index]?.name || `Tier ${post.tier_index + 1}`,
                                      price: tierList[post.tier_index]?.price || "0",
                                      index: post.tier_index,
                                    });
                                    setShowSubscribe(true);
                                  }}
                                  className="px-4 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-xs font-medium transition-colors"
                                >
                                  Upgrade to{" "}
                                  {(tierList[post.tier_index] as { name: string })?.name || `Tier ${post.tier_index + 1}`}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {hasTiers && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-surface-400 px-1">Support {creatorName}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tierList.map((tier, i) => (
                  <TierCard
                    key={i}
                    tier={tier}
                    disabled={!isConnected}
                    onSubscribe={() => {
                      setSelectedTier({ name: tier.name, price: tier.price, index: i });
                      setShowSubscribe(true);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {!isConnected && (
            <div className="text-center pb-4">
              <p className="text-surface-400 text-sm mb-3">Connect your wallet to subscribe</p>
              <ConnectButton />
            </div>
          )}

          {subscribed && address && (
            <div className="text-center">
              <Link
                href={`/${creatorId}/content`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
              >
                View all content &rarr;
              </Link>
            </div>
          )}
        </div>
      </main>

      {selectedTier && (
        <SubscribeModal
          creatorAddress={creatorAddr}
          creatorName={creatorName}
          tierName={selectedTier.name}
          tierPrice={selectedTier.price}
          tierIndex={selectedTier.index}
          isOpen={showSubscribe}
          onClose={() => setShowSubscribe(false)}
        />
      )}
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
