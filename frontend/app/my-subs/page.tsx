"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { getAllPosts, type Post } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorAvatar } from "@/components/creator/CreatorAvatar";
import { cn } from "@/lib/utils";

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
    [posts],
  );

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

  function daysLeft(expiry: bigint): { label: string; tone: "destructive" | "warning" | "success" } {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const secs = expiry - now;
    if (secs <= 0n) return { label: "expired", tone: "destructive" };
    const d = Number(secs) / 86400;
    if (d >= 1) return { label: `${Math.floor(d)}d left`, tone: d < 3 ? "warning" : "success" };
    return { label: `${Math.floor(Number(secs) / 3600)}h left`, tone: "warning" };
  }

  function creatorName(addr: string) {
    const p = posts.find((x) => x.creator_address.toLowerCase() === addr);
    return p?.creator_name || `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1 py-12 md:py-16">
        <Container size="narrow" className="space-y-8">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-5 py-24 text-center">
              <h1 className="text-xl font-semibold text-foreground">Connect your wallet</h1>
              <p className="text-sm text-muted-foreground">
                See your active subscriptions and renew before they expire.
              </p>
              <ConnectButton />
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : activeSubs.length === 0 ? (
            <div className="flex flex-col items-center gap-5 py-24 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                <ClockIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">No active subscriptions</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Discover creators on the feed and subscribe privately.
                </p>
              </div>
              <Button asChild>
                <Link href="/">
                  Browse creators <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">My subscriptions</h1>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {activeSubs.length} active · amounts always private
                </p>
              </div>

              <ul className="divide-y divide-border rounded-2xl border border-border bg-card/40">
                {activeSubs.map((sub) => {
                  const name = creatorName(sub.creator);
                  const { label, tone } = daysLeft(sub.expiry);
                  return (
                    <li key={sub.creator}>
                      <Link
                        href={`/${sub.creator}/content`}
                        className="flex items-center justify-between gap-4 p-4 transition-colors ease-ember hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-3">
                          <CreatorAvatar nameOrAddress={name} size={40} />
                          <div>
                            <p className="font-medium text-foreground">{name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">Tier {sub.tierIndex + 1}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={tone === "success" ? "success" : tone === "warning" ? "warning" : "destructive"}
                            className={cn("font-mono")}
                          >
                            {label}
                          </Badge>
                          <span className="text-[11px] text-ember-300">
                            <Link href={`/${sub.creator}`} className="hover:text-ember-200">
                              Renew →
                            </Link>
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
