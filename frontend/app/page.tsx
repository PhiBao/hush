"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
        <Link href="/" className="text-xl font-bold text-gradient">
          Hush
        </Link>
        <nav className="flex items-center gap-4">
          <ConnectButton />
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              Earn from your audience.
              <br />
              <span className="text-gradient">Privately.</span>
            </h1>
            <p className="text-lg text-surface-400 max-w-lg mx-auto">
              Subscription payments your subscribers can trust and nobody else can see.
              Encrypted onchain. Only you can decrypt your earnings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-hush-600 hover:bg-hush-500 text-white font-medium transition-colors text-lg"
            >
              I&apos;m a Creator
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-3 rounded-xl border border-surface-700 hover:border-surface-500 text-surface-200 font-medium transition-colors text-lg"
            >
              Creator Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
            <FeatureCard
              icon="🔒"
              title="Encrypted Payments"
              description="Subscription amounts are encrypted onchain. Nobody can see who paid what."
            />
            <FeatureCard
              icon="👁️"
              title="Your Income, Private"
              description="Only you can decrypt your total earnings. Not even Hush can see it."
            />
            <FeatureCard
              icon="⚡"
              title="Composable"
              description="Built on the Zama Protocol. Works with any ERC-7984 confidential token."
            />
          </div>
        </div>
      </main>

      <footer className="text-center text-surface-500 text-sm py-6">
        Built on Zama fhEVM &middot; Sepolia Testnet
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-surface-800 bg-surface-900/50">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold text-surface-100 mb-2">{title}</h3>
      <p className="text-sm text-surface-400">{description}</p>
    </div>
  );
}
