"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "../../lib/contract";
import { TierCard } from "../../components/TierCard";
import { SubscribeModal } from "../../components/SubscribeModal";

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
  } | null>(null);
  const [localSubscribed, setLocalSubscribed] = useState(false);

  const creatorAddr = creatorId as `0x${string}`;

  const { data: creator } = useReadContract({
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

  const creatorName = (creator as [string, string, boolean])?.[0] || "";
  const creatorBio = (creator as [string, string, boolean])?.[1] || "";
  const isRegistered = (creator as [string, string, boolean])?.[2] || false;
  const subscribed = isSubscribed || localSubscribed;

  const tierList: TierData[] = Array.isArray(tiers)
    ? (tiers as unknown as TierData[])
    : [];

  useEffect(() => {
    if (isSubscribed) setLocalSubscribed(true);
  }, [isSubscribed]);

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-2xl">🔍</p>
          <h1 className="text-xl font-bold">Creator not found</h1>
          <p className="text-surface-400">This creator hasn&apos;t registered on Hush yet.</p>
          <Link href="/" className="text-hush-400 hover:text-hush-300">
            Go home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-hush-500 to-hush-700 mx-auto flex items-center justify-center text-2xl font-bold">
              {creatorName.charAt(0)}
            </div>
            <h1 className="text-3xl font-bold">{creatorName}</h1>
            {creatorBio && <p className="text-surface-400 max-w-md mx-auto">{creatorBio}</p>}
            {subscribed && address && (
              <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 border border-green-800 text-green-400 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                You&apos;re subscribed
              </p>
            )}
          </div>

          {tierList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-center">Subscription Tiers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tierList.map((tier, i) => (
                  <TierCard
                    key={i}
                    tier={tier}
                    disabled={!isConnected}
                    onSubscribe={() => {
                      setSelectedTier({
                        name: tier.name,
                        price: tier.price,
                      });
                      setShowSubscribe(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {subscribed && address && (
            <div className="text-center">
              <Link
                href={`/${creatorId}/content`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors"
              >
                Access Gated Content →
              </Link>
            </div>
          )}

          {!isConnected && (
            <div className="text-center">
              <p className="text-surface-400 mb-3">Connect your wallet to subscribe</p>
              <ConnectButton />
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
          isOpen={showSubscribe}
          onClose={() => setShowSubscribe(false)}
        />
      )}
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
