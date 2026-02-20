"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { HospitalPaymentRequest } from "@/components/HospitalPaymentRequest";
import { FACTORY_ABI, REGISTRY_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";

export default function HospitalPage() {
    const { address, isConnected } = useAccount();
    const [patientAddress, setPatientAddress] = useState("");
    const [submittedAddress, setSubmittedAddress] = useState<`0x${string}` | null>(null);
    const [credentialId, setCredentialId] = useState("");

    // Look up patient's vault
    const { data: vaultAddress, isFetching } = useReadContract({
        address: CONTRACT_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: "vaultOf",
        args: submittedAddress ? [submittedAddress] : undefined,
        query: { enabled: !!submittedAddress },
    });

    // Check if current wallet is a verified hospital
    const { data: isVerified } = useReadContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName: "isVerified",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const hasVault =
        vaultAddress && vaultAddress !== "0x0000000000000000000000000000000000000000";

    function handleLookup() {
        if (!patientAddress) return;
        setSubmittedAddress(patientAddress as `0x${string}`);
    }

    return (
        <main className="min-h-screen bg-zinc-950">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
            <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">MV</span>
            </div>
            <span className="text-white font-semibold text-lg">MediVault</span>
            <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full ml-1">Hospital Terminal</span>
            </Link>
            <ConnectButton />
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
            <div>
            <h1 className="text-3xl font-bold text-white">Emergency Payment Terminal</h1>
            <p className="text-zinc-400 mt-1">
                Verified hospitals can access patient vaults instantly during emergencies.
            </p>
            </div>

            {/* Not connected */}
            {!isConnected && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                <span className="text-4xl">🏥</span>
                <p className="text-zinc-400 text-sm">Connect your hospital wallet to access the payment terminal.</p>
                <ConnectButton />
            </div>
            )}

            {/* Connected but not verified */}
            {isConnected && !isVerified && (
            <div className="bg-amber-950 border border-amber-800 rounded-2xl p-6 flex flex-col gap-3">
                <h2 className="text-white font-semibold">Hospital Not Verified</h2>
                <p className="text-amber-300 text-sm leading-relaxed">
                Your wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) is not in the MediVault
                hospital registry. Contact the protocol admin to register and verify your institution.
                </p>
            </div>
            )}

            {/* Verified hospital UI */}
            {isConnected && isVerified && (
            <>
                <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3">
                <span className="text-emerald-400">✓</span>
                <span className="text-emerald-300 text-sm font-medium">Verified Hospital</span>
                <span className="text-emerald-600 text-xs ml-auto font-mono">{address?.slice(0, 10)}...</span>
                </div>

                {/* Step 1: Patient lookup */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-white font-semibold text-lg">1. Locate Patient Vault</h3>
                <p className="text-zinc-400 text-sm">
                    Enter the patient&apos;s wallet address to retrieve their MediVault.
                    In production, this lookup will be QR-code or NFC-based from patient&apos;s ID card.
                </p>
                <div className="flex gap-2">
                    <input
                    type="text"
                    placeholder="0x... patient wallet address"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-violet-500"
                    />
                    <button
                    onClick={handleLookup}
                    disabled={!patientAddress || isFetching}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                    >
                    {isFetching ? "..." : "Lookup"}
                    </button>
                </div>

                {submittedAddress && !isFetching && !hasVault && (
                    <div className="bg-zinc-800 rounded-xl px-4 py-3 text-zinc-400 text-sm">
                    No vault found for this address.
                    </div>
                )}

                {hasVault && (
                    <div className="bg-zinc-800 rounded-xl px-4 py-3">
                    <span className="text-zinc-500 text-xs">Patient Vault</span>
                    <p className="text-zinc-300 font-mono text-sm mt-0.5 break-all">{vaultAddress}</p>
                    </div>
                )}
                </div>

                {/* Step 2: Credential ID input (for biometric assertion) */}
                {hasVault && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                    <h3 className="text-white font-semibold text-lg">2. Enter Credential ID</h3>
                    <p className="text-zinc-400 text-sm">
                    The patient&apos;s WebAuthn credential ID is stored on the hospital terminal or scanned from their emergency card.
                    </p>
                    <input
                    type="text"
                    placeholder="base64url credential ID"
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-violet-500"
                    />
                </div>
                )}

                {/* Step 3: Payment request */}
                {hasVault && credentialId && (
                <div className="flex flex-col gap-2">
                    <h3 className="text-white font-semibold text-lg px-1">3. Request Payment</h3>
                    <HospitalPaymentRequest
                    vaultAddress={vaultAddress as `0x${string}`}
                    credentialId={credentialId}
                    />
                </div>
                )}
            </>
            )}
        </div>
        </main>
    );
}