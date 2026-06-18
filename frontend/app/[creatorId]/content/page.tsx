"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ArrowLeftIcon, KeyholeIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { getPosts, type Post } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface GatedPost extends Post {
  gated?: boolean;
}

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

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

  const [posts, setPosts] = useState<GatedPost[]>([]);
  const [previews, setPreviews] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const creatorName = (creator as [string, string, boolean] | undefined)?.[0] || "this creator";
  const tierList = Array.isArray(tiers) ? tiers : [];
  const subscriberTier = subTier !== undefined ? Number(subTier) : -1;

  useEffect(() => {
    if (creatorAddr) getPosts(creatorAddr).then(setPreviews);
  }, [creatorAddr]);

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

  if (loadingCreator || checkingSub) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-8 rounded-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />

      <main className="flex-1 py-12 md:py-16">
        <Container size="default" className="max-w-2xl space-y-8">
          {!isConnected ? (
            <Gate
              icon={<KeyholeIcon className="h-9 w-9" />}
              title="Connect to access content"
              body="This content is for subscribers only."
            >
              <ConnectButton />
            </Gate>
          ) : !isSubscribed ? (
            <Gate
              icon={<KeyholeIcon className="h-9 w-9" />}
              title="Subscriber-only content"
              body={`You need an active subscription to ${creatorName} to access exclusive content.`}
            >
              <Button asChild>
                <Link href={`/${creatorId}`}>Subscribe now</Link>
              </Button>
            </Gate>
          ) : (
            <>
              <div className="space-y-3 text-center">
                <Badge variant="success" className="mx-auto">
                  <ShieldCheckIcon weight="fill" className="h-3 w-3" />
                  Subscribed
                  {tierList[subscriberTier] && (
                    <span className="opacity-70">
                      {" "}- {(tierList[subscriberTier] as { name: string }).name}
                    </span>
                  )}
                </Badge>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {creatorName}
                </h1>
                <p className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-ember-300" />
                  Access verified onchain. No content is sent to your browser unless your subscription is active.
                </p>
              </div>

              <Separator />

              {loadingPosts ? (
                <div className="space-y-6">
                  {[0, 1].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 && previews.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No posts yet.</p>
              ) : (
                <div className="space-y-10">
                  {posts.map((post) => (
                    <article key={post.id}>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                          {post.title}
                        </h2>
                        {post.tier_index > 0 && (
                          <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {(tierList[post.tier_index] as { name: string })?.name || `Tier ${post.tier_index + 1}`}
                          </span>
                        )}
                      </div>

                      {post.gated ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm italic text-muted-foreground">
                            {post.preview || "Locked content."}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-ember-300">
                              <KeyholeIcon weight="fill" className="h-3.5 w-3.5" />
                              Upgrade to {(tierList[post.tier_index] as { name: string })?.name} to read this.
                            </span>
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/${creatorId}`}>Upgrade</Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground/90">
                            {post.content}
                          </p>
                          <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">
                            {new Date(post.created_at).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <div className="pt-4">
                <Button asChild variant="ghost">
                  <Link href={`/${creatorId}`}>
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to {creatorName}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}

function Gate({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-ember-300">
        {icon}
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  );
}
