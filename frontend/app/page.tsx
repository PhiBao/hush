"use client";

import { useState, useEffect, useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContracts } from "wagmi";
import Link from "next/link";
import { ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { getAllPosts, type Post } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroDecryptPreview } from "@/components/creator/HeroDecryptPreview";
import { PrivateEstimator } from "@/components/creator/PrivateEstimator";
import { PostCard } from "@/components/creator/PostCard";
import { cn } from "@/lib/utils";

const CREATOR_TYPES = [
  {
    name: "Writers",
    blurb: "Essays, newsletters, serialised fiction. Paid readers, private income.",
    img: "https://picsum.photos/seed/hush-writer-desk/640/480",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    name: "Artists",
    blurb: "Studios, illustrators, print drops.",
    img: "https://picsum.photos/seed/hush-artist-studio/640/480",
    span: "",
  },
  {
    name: "Podcasters",
    blurb: "Bonus episodes, private feeds.",
    img: "https://picsum.photos/seed/hush-podcast-mic/640/480",
    span: "",
  },
  {
    name: "Musicians",
    blurb: "Releases, stems, patronage.",
    img: "https://picsum.photos/seed/hush-musician-amber/640/480",
    span: "",
  },
  {
    name: "Indie devs",
    blurb: "Build in public, fund the work.",
    img: "https://picsum.photos/seed/hush-dev-terminal/640/480",
    span: "md:col-span-2",
  },
] as const;

export default function Home() {
  const { address, isConnected } = useAccount();

  const { data: existingCreator } = useReadContracts({
    contracts: isConnected && address
      ? [{
          abi: HUSH_ABI,
          address: HUSH_CONTRACT_ADDRESS,
          functionName: "creators",
          args: [address],
        } as const]
      : [],
    query: { enabled: !!address },
  });
  const isRegistered =
    (existingCreator?.[0]?.result as [string, string, boolean] | undefined)?.[2] ?? false;

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
    [posts],
  );

  const { data: subResults } = useReadContracts({
    contracts: isConnected && address
      ? uniqueCreators.map((creatorAddr) => ({
          abi: HUSH_ABI,
          address: HUSH_CONTRACT_ADDRESS,
          functionName: "isSubscribed",
          args: [creatorAddr as `0x${string}`, address],
        } as const))
      : [],
    query: { enabled: uniqueCreators.length > 0 },
  });

  const subscribedCreators = useMemo(() => {
    const set = new Set<string>();
    if (subResults && uniqueCreators.length > 0) {
      uniqueCreators.forEach((creatorAddr, i) => {
        if (subResults[i]?.result === true) set.add(creatorAddr);
      });
    }
    return set;
  }, [subResults, uniqueCreators]);

  const heroPrimary = !isConnected ? (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <Button size="lg" onClick={openConnectModal}>
          <SparkleIcon className="h-4 w-4" />
          Connect wallet
        </Button>
      )}
    </ConnectButton.Custom>
  ) : isRegistered ? (
    <Button asChild size="lg">
      <Link href="/dashboard">Go to dashboard <ArrowRightIcon className="h-4 w-4" /></Link>
    </Button>
  ) : (
    <Button asChild size="lg">
      <Link href="/create">Become a creator <ArrowRightIcon className="h-4 w-4" /></Link>
    </Button>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />

      {/* 1. Hero - asymmetric split, real component preview on the right. */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 right-0 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[140px]" />
        </div>
        <Container size="full" className="grid items-center gap-10 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28 lg:py-32">
          <div className="max-w-xl">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter text-foreground md:text-6xl">
              Your income, off the public ledger.
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground md:text-lg">
              Subscription payments encrypted onchain. Only you can decrypt your
              total. Your supporters stay private.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {heroPrimary}
              <Button asChild variant="ghost" size="lg">
                <Link href="#feed">Explore</Link>
              </Button>
            </div>
          </div>

          <Reveal delay={0.15} className="md:justify-self-end md:w-full md:max-w-md">
            <HeroDecryptPreview />
          </Reveal>
        </Container>
      </section>

      {/* 2. Privacy contrast - full-width two halves. Different layout family. */}
      <section className="border-b border-border bg-muted/20">
        <Container size="full" className="grid md:grid-cols-2">
          <div className="border-b border-border p-8 md:border-b-0 md:border-r md:p-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive-foreground/70">
              Today
            </p>
            <p className="mt-3 text-xl font-medium leading-snug text-foreground/80">
              Every onchain tip is <span className="text-destructive-foreground/90">public forever</span>.
              Anyone can see who paid whom, and how much.
            </p>
          </div>
          <div className="p-8 md:p-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember-300">
              Hush
            </p>
            <p className="mt-3 text-xl font-medium leading-snug text-foreground">
              Payments are <span className="text-ember-300">encrypted onchain</span>.
              Only the creator decrypts their total. Nobody else sees anything.
            </p>
          </div>
        </Container>
      </section>

      {/* 3. Creator-type bento - asymmetric, real images, exact cell count. */}
      <section className="py-20 md:py-28">
        <Container size="full">
          <div className="mb-10 max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Built for every kind of creator.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              If you make things people love, you can get paid for it without
              putting your income on display.
            </p>
          </div>

          <div className="grid auto-rows-[200px] grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {CREATOR_TYPES.map((c) => (
              <Reveal
                key={c.name}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border bg-card",
                  c.span,
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.img}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-50 grayscale transition-all duration-500 ease-ember group-hover:opacity-70 group-hover:grayscale-0"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
                <div className="relative flex h-full flex-col justify-end p-5">
                  <h3 className="text-lg font-semibold text-foreground">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-[34ch]">{c.blurb}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Private estimator - centered interactive. Different layout family. */}
      <section className="border-y border-border bg-muted/20 py-20 md:py-28">
        <Container size="narrow">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              What could you earn?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Drag to estimate. The number stays private until you do.
            </p>
          </div>
          <PrivateEstimator ctaHref={isConnected && !isRegistered ? "/create" : "/create"} />
        </Container>
      </section>

      {/* 5. Feed - editorial list, divide-y. Different layout family. */}
      <section id="feed" className="py-20 md:py-28 scroll-mt-20">
        <Container size="narrow">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Latest
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2 py-5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
              <p className="text-lg font-medium text-foreground">No posts yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Be the first creator to share something with your audience.
              </p>
              <Button asChild className="mt-6">
                <Link href="/create">Create your page <ArrowRightIcon className="h-4 w-4" /></Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.slice(0, 12).map((post) => {
                const creatorAddr = post.creator_address.toLowerCase();
                const isSubbed = subscribedCreators.has(creatorAddr);
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    href={`/post/${post.id}`}
                    unlocked={isSubbed}
                    tierName={post.tier_index > 0 ? `Tier ${post.tier_index + 1}` : undefined}
                  />
                );
              })}
            </div>
          )}
        </Container>
      </section>

      {/* 6. How it works - vertical steps with hairlines. Different layout family. */}
      <section className="border-t border-border bg-muted/20 py-20 md:py-28">
        <Container size="narrow">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Private by design.
          </h2>
          <ol className="mt-10 divide-y divide-border">
            {[
              {
                t: "Shield",
                d: "Supporters convert USDT to encrypted cUSDT in their browser. The amount never leaves as plaintext.",
              },
              {
                t: "Encrypt",
                d: "The payment amount is encrypted client-side via the Zama relayer and submitted onchain as ciphertext.",
              },
              {
                t: "Decrypt",
                d: "Hush sums the ciphertext onchain with FHE. Only the creator can decrypt their own aggregate total.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-5 py-6">
                <span className="font-mono text-sm text-ember-300 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-[60ch] leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <SiteFooter />
    </div>
  );
}
