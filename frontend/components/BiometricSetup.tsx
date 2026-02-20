"use client";

import { useState } from "react";
import { useWriteContract, useReadContract } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";
import { registerBiometric, isBiometricAvailable, formatCommitment } from "@/lib/biometric";

interface BiometricSetupProps {
    vaultAddress: `0x${string}`;
    ownerAddress: `0x${string}`;
}

type Step = "idle" | "scanning" | "committing" | "success" | "error";

export function BiometricSetup({ vaultAddress, ownerAddress }: BiometricSetupProps) {
    const [step, setStep] = useState<Step>("idle");
    const [commitment, setCommitment] = useState<`0x${string}` | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const { data: existingCommitment, refetch } = useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "biometricCommitment",
    });

    const { writeContractAsync: setCommitmentOnChain } = useWriteContract();

    const isAlreadySet =
        existingCommitment &&
        existingCommitment !== "0x0000000000000000000000000000000000000000000000000000000000000000";

    async function handleRegister() {
        if (!isBiometricAvailable()) {
        setErrorMsg("WebAuthn / biometrics not available on this device.");
        setStep("error");
        return;
        }

        setErrorMsg("");
        try {
        // Step 1: Scan biometric via WebAuthn
        setStep("scanning");
        const { commitment: hash, credentialId } = await registerBiometric(
            ownerAddress,
            `MediVault User ${ownerAddress.slice(0, 6)}`
        );

        // Store credentialId locally (for future assertions by hospital terminal)
        localStorage.setItem(`medivault_credential_${ownerAddress}`, credentialId);
        setCommitment(hash);

        // Step 2: Write commitment to chain
        setStep("committing");
        await setCommitmentOnChain({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: "setBiometricCommitment",
            args: [hash],
        });

        await refetch();
        setStep("success");
        } catch (e: any) {
        setErrorMsg(e?.shortMessage ?? e?.message ?? "Biometric registration failed.");
        setStep("error");
        }
    }

    if (isAlreadySet) {
        return (
        <div className="bg-zinc-900 border border-emerald-800 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-xl">✓</span>
            <h3 className="text-white font-semibold text-lg">Biometric Linked</h3>
            </div>
            <p className="text-zinc-400 text-sm">
            Your vault is biometrically secured. Hospitals can identify you by fingerprint or face scan.
            </p>
            <div className="bg-zinc-800 rounded-xl px-4 py-3">
            <span className="text-zinc-500 text-xs">On-chain Commitment</span>
            <p className="text-zinc-300 font-mono text-sm mt-0.5">
                {formatCommitment(existingCommitment as `0x${string}`)}
            </p>
            </div>
            <button
            onClick={handleRegister}
            className="text-zinc-500 hover:text-zinc-300 text-sm underline underline-offset-2 text-left transition-colors"
            >
            Re-register biometric
            </button>
        </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="text-white font-semibold text-lg">Link Biometric Identity</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
            Register your fingerprint or face using your device&apos;s biometric sensor.
            Only a cryptographic hash is stored on-chain — your raw biometric never leaves your device.
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-2">
            {[
            { num: 1, label: "Scan biometric via WebAuthn", active: step === "scanning" },
            { num: 2, label: "Write commitment hash on-chain", active: step === "committing" },
            ].map((s) => (
            <div key={s.num} className={`flex items-center gap-3 text-sm ${s.active ? "text-violet-400" : "text-zinc-500"}`}>
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${s.active ? "border-violet-500 text-violet-400" : "border-zinc-700"}`}>
                {s.num}
                </span>
                {s.label}
                {s.active && <span className="ml-auto animate-pulse">⏳</span>}
            </div>
            ))}
        </div>

        {commitment && step === "committing" && (
            <div className="bg-zinc-800 rounded-xl px-4 py-3">
            <span className="text-zinc-500 text-xs">Commitment hash</span>
            <p className="text-zinc-300 font-mono text-sm mt-0.5">{formatCommitment(commitment)}</p>
            </div>
        )}

        {step === "success" && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-emerald-300 text-sm">
            Biometric successfully linked to your vault!
            </div>
        )}

        {step === "error" && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
            {errorMsg}
            </div>
        )}

        <button
            onClick={handleRegister}
            disabled={step === "scanning" || step === "committing"}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-colors"
        >
            {step === "scanning" ? "Scanning..." : step === "committing" ? "Writing to chain..." : "Register Biometric"}
        </button>
        </div>
    );
}
