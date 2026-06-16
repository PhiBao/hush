"use client";

import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../../../lib/contract";

export default function ContentPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const { address, isConnected } = useAccount();
  const creatorAddr = creatorId as `0x${string}`;

  const { data: creator } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "creators",
    args: [creatorAddr],
    query: { enabled: !!creatorAddr },
  });

  const { data: isSubscribed, isLoading: checking } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "isSubscribed",
    args: [creatorAddr, address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!creatorAddr && !!address },
  });

  const creatorName = (creator as [string, string, boolean])?.[0] || "this creator";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-2xl">🔐</p>
            <h1 className="text-xl font-bold">Connect to access content</h1>
            <p className="text-surface-400">This content is for subscribers only.</p>
            <ConnectButton />
          </div>
        ) : checking ? (
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-hush-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-surface-400">Checking subscription...</p>
          </div>
        ) : !isSubscribed ? (
          <div className="text-center space-y-4">
            <p className="text-2xl">🔐</p>
            <h1 className="text-xl font-bold">Subscriber-only content</h1>
            <p className="text-surface-400">
              You need an active subscription to {creatorName} to access this.
            </p>
            <Link
              href={`/${creatorId}`}
              className="inline-flex items-center px-6 py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
            >
              Subscribe Now
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl text-center space-y-6">
            <div className="text-4xl">✨</div>
            <h1 className="text-2xl font-bold">Welcome, subscriber!</h1>
            <p className="text-surface-400">
              Thank you for supporting {creatorName}. Your payment is encrypted onchain —
              only {creatorName} can decrypt their total earnings. Your individual support
              amount is private.
            </p>
            <div className="p-8 rounded-2xl border border-hush-500/30 bg-hush-950/50">
              <h2 className="text-xl font-semibold mb-4">Exclusive Content</h2>
              <p className="text-surface-300">
                This is where {creatorName}&apos;s subscriber-only content would live.
                Posts, videos, downloads, early access, community access — all gated by
                your encrypted subscription on Zama fhEVM.
              </p>
            </div>
            <Link
              href={`/${creatorId}`}
              className="text-hush-400 hover:text-hush-300 text-sm"
            >
              ← Back to {creatorName}&apos;s page
            </Link>
          </div>
        )}
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
