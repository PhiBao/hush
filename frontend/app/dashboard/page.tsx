"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS, formatTokenAmount } from "../../lib/contract";
import { EarningsCard } from "../../components/EarningsCard";
import { getPosts, createPost, deletePost, Post } from "../../lib/supabase";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: creator } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "creators",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const { data: tiers } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "getTiers",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const { data: subCount } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "activeSubscriberCount",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
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

  const loadPosts = useCallback(async () => {
    if (!address) return;
    setLoadingPosts(true);
    const p = await getPosts(address);
    setPosts(p);
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
    } catch {
      setPostError("Failed to create post. Make sure the posts table exists in Supabase.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePost(id: number) {
    await deletePost(id);
    await loadPosts();
  }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Connect your wallet</h1>
          <p className="text-surface-400">View your creator dashboard.</p>
          <ConnectButton />
        </main>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-3xl">👋</p>
          <h1 className="text-2xl font-bold">You haven&apos;t registered as a creator yet</h1>
          <p className="text-surface-400 max-w-md">
            Create your creator page to start earning private subscription payments.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
          >
            Get Started
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{creatorName}</h1>
              <p className="text-surface-400 text-sm">Creator Dashboard</p>
            </div>
            <Link
              href={`/${address}`}
              className="text-sm text-hush-400 hover:text-hush-300 transition-colors"
            >
              View public page →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {address && <EarningsCard creatorAddress={address} />}
            <div className="p-6 rounded-xl border border-surface-700 bg-surface-900/50">
              <h3 className="text-sm font-medium text-surface-400 mb-3">Active Subscribers</h3>
              <p className="text-3xl font-bold text-surface-200">
                {subCount !== undefined ? (subCount as bigint).toString() : "—"}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                Count is public. Individual supporter amounts are never visible to anyone.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-surface-700 bg-surface-900/50">
            <h3 className="text-sm font-medium text-surface-400 mb-3">Active Tiers</h3>
              {tierList.length === 0 ? (
                <p className="text-surface-500 text-sm">
                  No tiers yet. <Link href="/create" className="text-hush-400">Add tiers</Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {tierList.map((tier: unknown, i: number) => {
                    const t = tier as {
                      name: string;
                      price: string;
                      active: boolean;
                    };
                    return (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>{t.name}</span>
                        <span className="text-surface-400">
                          {formatTokenAmount(t.price)} cUSDT
                          {!t.active && (
                            <span className="ml-2 text-red-400">(inactive)</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                 </ul>
               )}
            </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Posts</h2>
              <button
                onClick={() => setShowNewPost(true)}
                className="px-4 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
              >
                + New Post
              </button>
            </div>

            {postError && (
              <p className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-4 py-3">
                {postError}
              </p>
            )}

            {showNewPost && (
              <div className="p-6 rounded-xl border border-hush-500/30 bg-surface-800 space-y-4">
                <h3 className="font-medium">New Post</h3>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Post title"
                  className="w-full px-4 py-3 rounded-xl bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 placeholder-surface-500"
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write your post content..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100 placeholder-surface-500 resize-none"
                />
                <div>
                  <label className="block text-sm text-surface-400 mb-1">
                    Visible to which tier and above?
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-surface-900 border border-surface-700 focus:border-hush-500 focus:outline-none text-surface-100"
                  >
                    {tierList.map((tier: unknown, i: number) => {
                      const t = tier as { name: string };
                      return (
                        <option key={i} value={i}>
                          {t.name} {i === 0 ? "(all subscribers)" : `+ above`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreatePost}
                    disabled={saving || !newTitle.trim()}
                    className="flex-1 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {saving ? "Publishing..." : "Publish"}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewPost(false);
                      setNewTitle("");
                      setNewContent("");
                    }}
                    className="px-4 py-2 rounded-lg border border-surface-700 hover:border-surface-500 text-surface-400 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingPosts ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-hush-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-surface-500 text-sm">
                  No posts yet. Create your first post for subscribers.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-xl border border-surface-700 bg-surface-900/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{post.title}</h3>
                        <p className="text-xs text-surface-500 mt-1">
                          {formatDate(post.created_at)}
                          {" · "}
                          <span className="text-hush-400">
                            {tierList[post.tier_index]
                              ? (tierList[post.tier_index] as { name: string }).name
                              : `Tier ${post.tier_index + 1}`}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-surface-300 whitespace-pre-wrap line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 rounded-xl border border-dashed border-surface-700 space-y-2">
            <h3 className="font-medium">Share Your Page</h3>
            <p className="text-sm text-surface-400">
              Share this link with your audience so they can subscribe confidentially.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 text-sm break-all">
                hush.vercel.app/{address}
              </code>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(`https://hush.vercel.app/${address}`)
                }
                className="px-4 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="text-center text-surface-500 text-sm">
            Sepolia Testnet
          </div>
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
      <Link href="/" className="text-xl font-bold text-gradient">
        Hush
      </Link>
      <ConnectButton />
    </header>
  );
}
