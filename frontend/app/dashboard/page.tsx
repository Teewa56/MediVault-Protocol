"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Heart, 
  Shield, 
  Plus, 
  Settings, 
  Building2, 
  Home,
  Wallet,
  User,
  ArrowLeft,
  CheckCircle
} from "lucide-react";
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
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        {/* Nav */}
        <motion.nav 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="sticky top-0 z-50 glass-effect border-b border-blue-100"
        >
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-3">
                        <motion.div 
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg"
                        >
                            <Heart className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            MediVault
                        </span>
                    </Link>
                    <ConnectButton />
                </div>
            </div>
        </motion.nav>

        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Vault</h1>
                <p className="text-xl text-gray-600">Manage your emergency medical fund.</p>
            </motion.div>

            {/* No vault state */}
            {!hasVault ? (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white rounded-3xl shadow-xl border border-blue-100 p-16 flex flex-col items-center gap-6 text-center"
            >
                <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center"
                >
                    <Wallet className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900">No Vault Found</h2>
                <p className="text-gray-600 max-w-md leading-relaxed">
                Deploy your personal MediVault smart contract to start securing your emergency medical fund.
                </p>
                <motion.button
                    onClick={handleCreateVault}
                    disabled={isCreating}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Plus className="w-5 h-5" />
                    {isCreating ? "Deploying..." : "Create My Vault"}
                </motion.button>
            </motion.div>
            ) : (
            <>
                {/* Tabs */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex gap-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-2 shadow-lg"
                >
                {[
                    { id: "overview", label: "Overview", icon: Home },
                    { id: "deposit", label: "Deposit", icon: Plus },
                    { id: "biometric", label: "Biometric", icon: User },
                    { id: "hospitals", label: "Hospitals", icon: Building2 }
                ].map((tab) => (
                    <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                        activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    </motion.button>
                ))}
                </motion.div>

                {/* Tab content */}
                {activeTab === "overview" && (
                <VaultCard vaultAddress={vaultAddress as `0x${string}`} />
                )}

                {activeTab === "deposit" && (
                <div className="flex flex-col gap-4">
                    <DepositForm vaultAddress={vaultAddress as `0x${string}`} />

                    {/* Emergency config */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 flex flex-col gap-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-gray-900 font-semibold text-xl">Emergency Config</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-700 text-sm font-medium">Cap (USDC)</label>
                                <input
                                    type="number"
                                    placeholder="500"
                                    value={configCap}
                                    onChange={(e) => setConfigCap(e.target.value)}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-gray-700 text-sm font-medium">Cooldown (hours)</label>
                                <input
                                    type="number"
                                    placeholder="24"
                                    value={configCooldown}
                                    onChange={(e) => setConfigCooldown(e.target.value)}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                        <motion.button
                            onClick={handleSetConfig}
                            disabled={!configCap}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                            whileHover={{ scale: configCap ? 1.02 : 1 }}
                            whileTap={{ scale: configCap ? 0.98 : 1 }}
                        >
                            Update Config
                        </motion.button>
                    </motion.div>
                </div>
                )}

                {activeTab === "biometric" && address && (
                <BiometricSetup
                    vaultAddress={vaultAddress as `0x${string}`}
                    ownerAddress={address}
                />
                )}

                {activeTab === "hospitals" && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 flex flex-col gap-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-xl">Authorized Hospitals</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                    Only hospitals you explicitly authorize here can request payments from your vault.
                    They must also be globally verified in the MediVault registry.
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="0x... hospital wallet address"
                            value={hospitalInput}
                            onChange={(e) => setHospitalInput(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <motion.button
                            onClick={handleAuthorizeHospital}
                            disabled={!hospitalInput}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 whitespace-nowrap"
                            whileHover={{ scale: hospitalInput ? 1.05 : 1 }}
                            whileTap={{ scale: hospitalInput ? 0.95 : 1 }}
                        >
                            <CheckCircle className="w-4 h-4" />
                            Authorize
                        </motion.button>
                    </div>
                </motion.div>
                )}
            </>
            )}
        </div>
        </main>
    );
}