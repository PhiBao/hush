"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ArrowRightIcon, KeyholeIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { getPosts, type Post } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { TierCard, type TierData } from "@/components/creator/TierCard";
import { SubscribeModal } from "@/components/creator/SubscribeModal";
import { cn } from "@/lib/utils";

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

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
  const [localSubTierIndex, setLocalSubTierIndex] = useState(-1);
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
    args: [creatorAddr, address ?? ZERO],
    query: { enabled: !!creatorAddr && !!address },
  });

  const { data: subTier } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "subscriptionTier",
    args: [creatorAddr, address ?? ZERO],
    query: { enabled: !!creatorAddr && !!address },
  });

  const creatorName = (creator as [string, string, boolean] | undefined)?.[0] || "";
  const creatorBio = (creator as [string, string, boolean] | undefined)?.[1] || "";
  const isRegistered = (creator as [string, string, boolean] | undefined)?.[2] || false;
  const subscribed = isSubscribed || localSubscribed;
  const subscriberTierIndex = isSubscribed ? (subTier !== undefined ? Number(subTier) : -1)
    : localSubTierIndex;

  const tierList: TierData[] = Array.isArray(tiers)
    ? (tiers as unknown as TierData[])
    : [];

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

  function canViewPost(post: Post) {
    return subscribed && post.tier_index <= subscriberTierIndex;
  }

  function previewText(post: Post) {
    return post.preview || (post.content ? post.content.slice(0, 160) : "");
  }

  if (loadingCreator) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-8 rounded-full" />
        </main>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <KeyholeIcon className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Creator not found</h1>
          <p className="text-sm text-muted-foreground">This address has not registered on Hush yet.</p>
          <Button asChild variant="ghost">
            <Link href="/">Back to feed</Link>
          </Button>
        </main>
      </div>
    );
  }

  const hasPosts = posts.length > 0;
  const hasTiers = tierList.length > 0;
  const featuredIndex = tierList.length >= 3 ? Math.floor(tierList.length / 2) : -1;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />

      <main className="flex-1 py-12 md:py-16">
        <Container size="narrow" className="space-y-12">
          {/* Creator header - left-aligned, publication feel. */}
          <Reveal className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CreatorAvatar nameOrAddress={creatorName || creatorAddr} size={72} />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {creatorName}
                </h1>
                {creatorBio && (
                  <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
                    {creatorBio}
                  </p>
                )}
                {subscribed && (
                  <Badge variant="success" className="mt-3">
                    Subscribed
                    {tierList[subscriberTierIndex] && (
                      <span className="opacity-70">
                        {" "}- {(tierList[subscriberTierIndex] as { name: string }).name}
                      </span>
                    )}
                  </Badge>
                )}
              </div>
            </div>

            {subscribed && address && (
              <Button asChild>
                <Link href={`/${creatorId}/content`}>
                  View all content <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </Reveal>

          {/* Posts */}
          {hasPosts && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Posts</h2>
              {loadingPosts ? (
                <div className="space-y-4">
                  {[0, 1].map((i) => (
                    <div key={i} className="space-y-2 py-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <AnimatePresence>
                    {posts.map((post) => {
                      const viewable = canViewPost(post);
                      const tierName =
                        (tierList[post.tier_index] as { name: string } | undefined)?.name ||
                        `Tier ${post.tier_index + 1}`;
                      return (
                        <article key={post.id} className="py-6">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/post/${post.id}`}
                              className="text-lg font-semibold tracking-tight text-foreground hover:text-ember-300 transition-colors"
                            >
                              {post.title}
                            </Link>
                            {post.tier_index > 0 && (
                              <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {tierName}
                              </span>
                            )}
                          </div>

                          {viewable ? (
                            <>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 max-w-[65ch]">
                                {post.content}
                              </p>
                              <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
                                {new Date(post.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 max-w-[65ch]">
                                {previewText(post) || "Subscribe to read this post."}
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 text-xs text-ember-300">
                                  <KeyholeIcon weight="fill" className="h-3.5 w-3.5" />
                                  {isConnected
                                    ? `Subscribe to unlock ${tierName}`
                                    : "Connect to subscribe"}
                                </span>
                                {!isConnected ? (
                                  <ConnectButton />
                                ) : !subscribed ? (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTier({
                                        name: tierName,
                                        price: (tierList[post.tier_index] as { price: string })?.price || "0",
                                        index: post.tier_index,
                                      });
                                      setShowSubscribe(true);
                                    }}
                                  >
                                    Subscribe
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      setSelectedTier({
                                        name: tierName,
                                        price: (tierList[post.tier_index] as { price: string })?.price || "0",
                                        index: post.tier_index,
                                      });
                                      setShowSubscribe(true);
                                    }}
                                  >
                                    Upgrade to {tierName}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}

          {/* Tiers */}
          {hasTiers && (
            <section className="space-y-5">
              <h2 className="text-sm font-medium text-muted-foreground">
                Support {creatorName}
              </h2>
              <div
                className={cn(
                  "grid gap-4",
                  tierList.length === 1
                    ? "grid-cols-1 sm:max-w-sm"
                    : tierList.length === 2
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                )}
              >
                {tierList.map((tier, i) => (
                  <TierCard
                    key={i}
                    tier={tier}
                    index={i}
                    featured={i === featuredIndex}
                    isCurrentTier={subscribed && i === subscriberTierIndex}
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
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 py-12 text-center">
              <p className="text-sm text-muted-foreground">Connect your wallet to subscribe</p>
              <ConnectButton />
            </div>
          )}
        </Container>
      </main>

      <SiteFooter />

      {selectedTier && (
        <SubscribeModal
          creatorAddress={creatorAddr}
          creatorName={creatorName}
          tierName={selectedTier.name}
          tierPrice={selectedTier.price}
          tierIndex={selectedTier.index}
          isOpen={showSubscribe}
          onClose={() => {
            setShowSubscribe(false);
            setLocalSubscribed(true);
            setLocalSubTierIndex(selectedTier?.index ?? -1);
          }}
        />
      )}
    </div>
  );
}
