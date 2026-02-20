"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MV</span>
          </div>
          <span className="text-white font-semibold text-lg">MediVault</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/hospital" className="text-zinc-400 hover:text-white text-sm transition-colors">
            Hospital Terminal
          </Link>
          <ConnectButton />
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="inline-flex items-center gap-2 bg-violet-950 border border-violet-800 rounded-full px-4 py-1.5 text-violet-300 text-sm">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Built on Polkadot Hub EVM
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight max-w-4xl">
          Your Emergency{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            Medical Fund
          </span>
          , Always Ready
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl leading-relaxed">
          Pre-fund a personal vault with stablecoins. Link your biometric identity.
          Let verified hospitals access your funds instantly — no paperwork, no delays.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Create Your Vault
              </button>
            )}
          </ConnectButton.Custom>
          <Link
            href="/hospital"
            className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold rounded-xl transition-colors text-lg"
          >
            Hospital Access →
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 pb-24 max-w-5xl mx-auto w-full">
        {[
          {
            icon: "🏦",
            title: "Pre-Funded Vault",
            desc: "Deposit USDC anytime. Your vault holds funds non-custodially on-chain — only you and verified hospitals can access it.",
          },
          {
            icon: "🔐",
            title: "Biometric Identity",
            desc: "Link your vault to a biometric commitment. No wallet needed at the ER — a fingerprint scan is enough.",
          },
          {
            icon: "🏥",
            title: "Instant Hospital Payments",
            desc: "Verified hospitals submit signed payment requests. Funds transfer in seconds, not days.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3"
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="text-white font-semibold text-lg">{f.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-6 text-center text-zinc-600 text-sm">
        MediVault Protocol · Polkadot Solidity Hackathon 2026 · MIT License
      </footer>
    </main>
  );
}
