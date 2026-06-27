"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { ArrowLeftIcon, KeyholeIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { getPostMeta, supabase, type Post } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

interface GatedPost extends Post {
  authorized?: boolean;
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { address, isConnected } = useAccount();

  const [meta, setMeta] = useState<Post | null>(null);
  const [post, setPost] = useState<GatedPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Load post metadata (public fields).
  useEffect(() => {
    const id = Number(postId);
    if (!id) return;
    getPostMeta(id).then((m) => setMeta(m));
  }, [postId]);

  const creatorAddr = (meta?.creator_address ?? ZERO) as `0x${string}`;

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

  const subscriberTier = subTier !== undefined ? Number(subTier) : -1;
  const postTier = meta?.tier_index ?? 0;
  const authorized = !!isSubscribed && postTier <= subscriberTier;

  // Fetch full post from Supabase (public anon key, RLS allows SELECT).
  useEffect(() => {
    const id = Number(postId);
    if (!id) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", id).single();
      if (error) console.error("Failed to fetch post:", error.message);
      setPost((data as GatedPost) || null);
      setLoading(false);
    })();
  }, [postId]);

  const displayName = meta?.creator_name || (creatorAddr !== ZERO
    ? `${creatorAddr.slice(0, 6)}...${creatorAddr.slice(-4)}`
    : "");

  const previewText = meta?.preview || "Subscribe to read this post.";

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1 py-12 md:py-16">
        <Container size="default" className="max-w-2xl">
          {!meta ? (
            <div className="space-y-4 py-12">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : loading ? (
            <div className="space-y-4 py-12">
              <div className="flex items-center gap-2 mb-6">
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ) : authorized && post && post.content ? (
            <article className="py-4">
              <Button asChild variant="ghost" size="sm" className="mb-8">
                <Link href={`/${creatorAddr}`}>
                  <ArrowLeftIcon className="h-4 w-4" />
                  {displayName}
                </Link>
              </Button>

              <header className="space-y-4 mb-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {meta.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Link href={`/${creatorAddr}`} className="font-medium text-foreground/80 hover:text-foreground transition-colors">
                    {displayName}
                  </Link>
                  {post.tier_index > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Tier {post.tier_index + 1}
                    </Badge>
                  )}
                  <span className="font-mono text-[11px]">
                    {new Date(meta.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </header>

              <div className="prose-custom whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground/90">
                {post.content}
              </div>

              <div className="mt-12 pt-6 border-t border-border">
                <Button asChild variant="ghost">
                  <Link href={`/${creatorAddr}/content`}>
                    <ArrowLeftIcon className="h-4 w-4" />
                    All posts by {displayName}
                  </Link>
                </Button>
              </div>
            </article>
          ) : (
            <div className="py-12 space-y-5">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/${creatorAddr}`}>
                  <ArrowLeftIcon className="h-4 w-4" />
                  {displayName}
                </Link>
              </Button>

              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {meta.title}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Link href={`/${creatorAddr}`} className="font-medium text-foreground/80 hover:text-foreground transition-colors">
                  {displayName}
                </Link>
                {meta.tier_index > 0 && (
                  <Badge variant="secondary" className="text-[10px]">Tier {meta.tier_index + 1}</Badge>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-6 space-y-4 mt-6">
                <p className="text-sm text-muted-foreground">{previewText}</p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-ember-300">
                    <KeyholeIcon weight="fill" className="h-3.5 w-3.5" />
                    {isConnected
                      ? "Subscribe to read the full post."
                      : "Connect to subscribe"}
                  </span>
                  {isConnected ? (
                    <Button asChild size="sm">
                      <Link href={`/${creatorAddr}`}>Subscribe</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/${creatorAddr}`}>Go to creator page</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
