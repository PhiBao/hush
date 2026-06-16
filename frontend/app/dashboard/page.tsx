"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../../lib/contract";
import { EarningsCard } from "../../components/EarningsCard";

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

  const { data: totalCreators } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "totalCreators",
    args: [],
  });

  const creatorData = creator as [string, string, boolean] | undefined;
  const isRegistered = creatorData?.[2] ?? false;
  const creatorName = creatorData?.[0] || "";

  const tierList = Array.isArray(tiers) ? tiers : [];

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
            Create your creator page to start earning private subscription payments from your
            audience.
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
              <h3 className="text-sm font-medium text-surface-400 mb-3">
                Active Tiers
              </h3>
              {tierList.length === 0 ? (
                <p className="text-surface-500 text-sm">No tiers yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tierList.map(
                    (tier: unknown, i: number) => {
                      const t = tier as { name: string; price: string; active: boolean };
                      return (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span>{t.name}</span>
                          <span className="text-surface-400">
                            {t.price} wei
                            {!t.active && (
                              <span className="ml-2 text-red-400">(inactive)</span>
                            )}
                          </span>
                        </li>
                      );
                    }
                  )}
                </ul>
              )}
            </div>
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
                  navigator.clipboard.writeText(
                    `https://hush.vercel.app/${address}`
                  )
                }
                className="px-4 py-2 rounded-lg bg-hush-600 hover:bg-hush-500 text-white text-sm font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="text-center text-surface-500 text-sm">
            {totalCreators ? `${totalCreators} creators on Hush · ` : ""}
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
