"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS, formatTokenAmount } from "@/lib/contract";
import { EarningsCard } from "@/components/EarningsCard";
import { getPosts, createPost, deletePost, type Post } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: creator } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "creators",
    args: [address ?? ZERO],
    query: { enabled: !!address },
  });

  const { data: tiers } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getTiers",
    args: [address ?? ZERO],
    query: { enabled: !!address },
  });

  const { data: subCount } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "activeSubscriberCount",
    args: [address ?? ZERO],
    query: { enabled: !!address },
  });

  const creatorData = creator as [string, string, boolean] | undefined;
  const isRegistered = creatorData?.[2] ?? false;
  const creatorName = creatorData?.[0] || "";
  const tierList = Array.isArray(tiers) ? tiers : [];

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTier, setNewTier] = useState(0);
  const [saving, setSaving] = useState(false);
  const [postError, setPostError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const loadPosts = useCallback(async () => {
    if (!address) return;
    setLoadingPosts(true);
    setPosts(await getPosts(address));
    setLoadingPosts(false);
  }, [address]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleCreatePost() {
    if (!newTitle.trim() || !address) return;
    setPostError("");
    setSaving(true);
    try {
      await createPost(address, creatorName, newTitle.trim(), newContent.trim(), newTier);
      setNewTitle("");
      setNewContent("");
      setNewTier(0);
      setShowNewPost(false);
      await loadPosts();
      toast.success("Post published");
    } catch {
      setPostError("Failed to create post. Make sure the posts table exists in Supabase.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePost(id: number) {
    await deletePost(id);
    await loadPosts();
    toast.success("Post deleted");
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Connect your wallet</h1>
          <p className="text-sm text-muted-foreground">View your creator dashboard.</p>
          <ConnectButton />
        </main>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-ember-300">
            <UsersIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            You have not registered as a creator yet
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your creator page to start earning private subscription payments.
          </p>
          <Button asChild>
            <Link href="/create">Get started</Link>
          </Button>
        </main>
      </div>
    );
  }

  const shareUrl = address ? `${origin}/${address}` : "";

  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied", { description: shareUrl });
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1 py-10 md:py-14">
        <Container size="wide" className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{creatorName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Creator dashboard</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${address}`}>
                View public page <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Earnings + subscribers */}
          <div className="grid gap-4 md:grid-cols-2">
            {address && <EarningsCard creatorAddress={address} />}
            <Card className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UsersIcon className="h-4 w-4" />
                  Active subscribers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-mono text-4xl font-semibold tabular-nums text-foreground">
                  {subCount !== undefined ? (subCount as bigint).toString() : "-"}
                </p>
                <CardDescription>
                  Count is public. Individual supporter amounts are never visible to anyone.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Active tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Active tiers</CardTitle>
            </CardHeader>
            <CardContent>
              {tierList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tiers yet.{" "}
                  <Link href="/create" className="text-ember-300 hover:text-ember-200">Add tiers</Link>
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {tierList.map((tier: unknown, i: number) => {
                    const t = tier as { name: string; price: string; active: boolean };
                    return (
                      <li key={i} className="flex items-center justify-between py-3 text-sm">
                        <span className="text-foreground">{t.name}</span>
                        <span className="font-mono text-muted-foreground">
                          {formatTokenAmount(t.price)} cUSDT
                          {!t.active && <span className="ml-2 text-destructive-foreground/80">(inactive)</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Posts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Posts</h2>
              <Button size="sm" onClick={() => setShowNewPost((v) => !v)}>
                <PlusIcon className="h-4 w-4" />
                New post
              </Button>
            </div>

            {postError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive-foreground/90">
                {postError}
              </p>
            )}

            {showNewPost && (
              <Card className="border-primary/30">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="post-title">Title</Label>
                    <Input
                      id="post-title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Post title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="post-content">Content</Label>
                    <Textarea
                      id="post-content"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Write your post content"
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="post-tier">Visible to which tier and above?</Label>
                    <Select value={String(newTier)} onValueChange={(v) => setNewTier(Number(v))}>
                      <SelectTrigger id="post-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tierList.map((tier: unknown, i: number) => {
                          const t = tier as { name: string };
                          return (
                            <SelectItem key={i} value={String(i)}>
                              {t.name} {i === 0 ? "(all subscribers)" : "+ above"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleCreatePost} disabled={saving || !newTitle.trim()} className="flex-1">
                      {saving ? "Publishing" : "Publish"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewPost(false);
                        setNewTitle("");
                        setNewContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingPosts ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading posts…</p>
            ) : posts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No posts yet. Create your first post for subscribers.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card/40">
                {posts.map((post) => (
                  <li key={post.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        <span className="text-ember-300">
                          {tierList[post.tier_index]
                            ? (tierList[post.tier_index] as { name: string }).name
                            : `Tier ${post.tier_index + 1}`}
                        </span>
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePost(post.id)}
                      aria-label="Delete post"
                    >
                      <TrashIcon className="h-4 w-4 text-destructive-foreground/80" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Share */}
          <Card className="border-dashed">
            <CardContent className="space-y-3 pt-6">
              <h3 className="font-medium text-foreground">Share your page</h3>
              <p className="text-sm text-muted-foreground">
                Share this link with your audience so they can subscribe confidentially.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 break-all rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm text-foreground/80">
                  {origin}/{address}
                </code>
                <Button onClick={copyShare} aria-label="Copy share link">
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />
          <p className="text-center font-mono text-xs text-muted-foreground/60">Sepolia testnet</p>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
