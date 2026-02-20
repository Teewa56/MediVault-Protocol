"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { VaultCard } from "@/components/VaultCard";
import { DepositForm } from "@/components/DepositForm";
import { BiometricSetup } from "@/components/BiometricSetup";
import { FACTORY_ABI, VAULT_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { parseUnits, formatUnits } from "viem";

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "biometric" | "hospitals">("overview");
    const [hospitalInput, setHospitalInput] = useState("");
    const [configCap, setConfigCap] = useState("");
    const [configCooldown, setConfigCooldown] = useState("");

    useEffect(() => {
        if (!isConnected) router.push("/");
    }, [isConnected, router]);

    // Fetch vault address for connected user
    const { data: vaultAddress, refetch: refetchVault } = useReadContract({
        address: CONTRACT_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: "vaultOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const hasVault = vaultAddress && vaultAddress !== "0x0000000000000000000000000000000000000000";

    const { writeContractAsync: createVault, isPending: isCreating } = useWriteContract();
    const { writeContractAsync: authorizeHospital } = useWriteContract();
    const { writeContractAsync: setEmergencyConfig } = useWriteContract();

    async function handleCreateVault() {
        await createVault({
        address: CONTRACT_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: "createVault",
        });
        await refetchVault();
    }

    async function handleAuthorizeHospital() {
        if (!hasVault || !hospitalInput) return;
        await authorizeHospital({
        address: vaultAddress as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "authorizeHospital",
        args: [hospitalInput as `0x${string}`],
        });
        setHospitalInput("");
    }

    async function handleSetConfig() {
        if (!hasVault || !configCap) return;
        await setEmergencyConfig({
        address: vaultAddress as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "setEmergencyConfig",
        args: [parseUnits(configCap, 6), BigInt(Number(configCooldown || "24") * 3600)],
        });
    }

    if (!isConnected) return null;

    return (
        <main className="min-h-screen bg-zinc-950">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
            <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">MV</span>
            </div>
            <span className="text-white font-semibold text-lg">MediVault</span>
            </Link>
            <ConnectButton />
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
            <div>
            <h1 className="text-3xl font-bold text-white">Your Vault</h1>
            <p className="text-zinc-400 mt-1">Manage your emergency medical fund.</p>
            </div>

            {/* No vault state */}
            {!hasVault ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">🏦</span>
                <h2 className="text-white text-xl font-semibold">No Vault Found</h2>
                <p className="text-zinc-400 text-sm max-w-sm">
                Deploy your personal MediVault smart contract to start securing your emergency medical fund.
                </p>
                <button
                onClick={handleCreateVault}
                disabled={isCreating}
                className="px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
                >
                {isCreating ? "Deploying..." : "Create My Vault"}
                </button>
            </div>
            ) : (
            <>
                {/* Tabs */}
                <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                {(["overview", "deposit", "biometric", "hospitals"] as const).map((tab) => (
                    <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        activeTab === tab
                        ? "bg-violet-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                    >
                    {tab}
                    </button>
                ))}
                </div>

                {/* Tab content */}
                {activeTab === "overview" && (
                <VaultCard vaultAddress={vaultAddress as `0x${string}`} />
                )}

                {activeTab === "deposit" && (
                <div className="flex flex-col gap-4">
                    <DepositForm vaultAddress={vaultAddress as `0x${string}`} />

                    {/* Emergency config */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="text-white font-semibold text-lg">Emergency Config</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 text-xs">Cap (USDC)</label>
                        <input
                            type="number"
                            placeholder="500"
                            value={configCap}
                            onChange={(e) => setConfigCap(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500"
                        />
                        </div>
                        <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 text-xs">Cooldown (hours)</label>
                        <input
                            type="number"
                            placeholder="24"
                            value={configCooldown}
                            onChange={(e) => setConfigCooldown(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500"
                        />
                        </div>
                    </div>
                    <button
                        onClick={handleSetConfig}
                        disabled={!configCap}
                        className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                    >
                        Update Config
                    </button>
                    </div>
                </div>
                )}

                {activeTab === "biometric" && address && (
                <BiometricSetup
                    vaultAddress={vaultAddress as `0x${string}`}
                    ownerAddress={address}
                />
                )}

                {activeTab === "hospitals" && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="text-white font-semibold text-lg">Authorized Hospitals</h3>
                    <p className="text-zinc-400 text-sm">
                    Only hospitals you explicitly authorize here can request payments from your vault.
                    They must also be globally verified in the MediVault registry.
                    </p>
                    <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="0x... hospital wallet address"
                        value={hospitalInput}
                        onChange={(e) => setHospitalInput(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-violet-500"
                    />
                    <button
                        onClick={handleAuthorizeHospital}
                        disabled={!hospitalInput}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap"
                    >
                        Authorize
                    </button>
                    </div>
                </div>
                )}
            </>
            )}
        </div>
        </main>
    );
}