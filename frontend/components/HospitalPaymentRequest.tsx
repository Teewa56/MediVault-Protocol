"use client";

import { useState } from "react";
import { useWriteContract, useReadContract, useAccount, useSignTypedData } from "wagmi";
import { parseUnits, encodeAbiParameters, parseAbiParameters, toHex } from "viem";
import { VAULT_ABI, REGISTRY_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { authenticateBiometric } from "@/lib/biometric";

interface HospitalPaymentRequestProps {
  /** Vault address retrieved by looking up patient identity */
  vaultAddress: `0x${string}`;
  /** Credential ID stored during patient's biometric registration */
  credentialId: string;
}

type Step = "idle" | "biometric" | "signing" | "sending" | "success" | "error";

export function HospitalPaymentRequest({
    vaultAddress,
    credentialId,
}: HospitalPaymentRequestProps) {
    const { address: hospitalAddress } = useAccount();
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState<Step>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [txHash, setTxHash] = useState("");

    const { data: isVerified } = useReadContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName: "isVerified",
        args: hospitalAddress ? [hospitalAddress] : undefined,
        query: { enabled: !!hospitalAddress },
    });

    const { data: nonce } = useReadContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI as any,
        functionName: "nonces",
        args: hospitalAddress ? [hospitalAddress] : undefined,
        query: { enabled: !!hospitalAddress },
    });

    const { signTypedDataAsync } = useSignTypedData();
    const { writeContractAsync: requestPayment } = useWriteContract();

    async function handlePaymentRequest() {
        if (!amount || parseFloat(amount) <= 0 || !hospitalAddress) return;
        setErrorMsg("");

        const amountParsed = parseUnits(amount, 6);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1hr window
        const currentNonce = (nonce as bigint) ?? 0n;

        try {
        // Step 1: Biometric authentication
        setStep("biometric");
        const biometricHash = await authenticateBiometric(credentialId);

        // Step 2: Sign EIP-712 PaymentRequest
        setStep("signing");
        const signature = await signTypedDataAsync({
            domain: {
            name: "MediVaultRegistry",
            version: "1",
            chainId: 420420421,
            verifyingContract: CONTRACT_ADDRESSES.registry,
            },
            types: {
            PaymentRequest: [
                { name: "hospital",  type: "address" },
                { name: "amount",    type: "uint256" },
                { name: "vault",     type: "address" },
                { name: "nonce",     type: "uint256" },
                { name: "deadline",  type: "uint256" },
            ],
            },
            primaryType: "PaymentRequest",
            message: {
            hospital: hospitalAddress,
            amount:   amountParsed,
            vault:    vaultAddress,
            nonce:    currentNonce,
            deadline,
            },
        });

        // Pack: deadline (32 bytes) ++ nonce (32 bytes) ++ sig (65 bytes)
        const packedSignature = encodeAbiParameters(
            parseAbiParameters("uint256, uint256, bytes"),
            [deadline, currentNonce, signature]
        );

        // Step 3: Submit payment request to vault
        setStep("sending");
        const tx = await requestPayment({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: "requestPayment",
            args: [amountParsed, biometricHash, packedSignature],
        });

        setTxHash(tx);
        setStep("success");
        setAmount("");
        } catch (e: any) {
        setErrorMsg(e?.shortMessage ?? e?.message ?? "Payment request failed.");
        setStep("error");
        }
    }

    if (!isVerified) {
        return (
        <div className="bg-zinc-900 border border-amber-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold text-lg mb-2">Hospital Not Verified</h3>
            <p className="text-amber-400 text-sm">
            This wallet is not a verified hospital in the MediVault registry. Contact the protocol admin to complete verification.
            </p>
        </div>
        );
    }

    const isLoading = ["biometric", "signing", "sending"].includes(step);

    const stepLabels: Record<string, string> = {
        biometric: "Scanning patient biometric...",
        signing:   "Sign payment request...",
        sending:   "Submitting to blockchain...",
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-white font-semibold text-lg">Emergency Payment Request</h3>
        </div>

        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
            <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-20 py-3 text-white text-lg focus:outline-none focus:border-violet-500 disabled:opacity-50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">USDC</span>
        </div>

        {/* Live step indicator */}
        {isLoading && (
            <div className="bg-violet-950 border border-violet-800 rounded-xl px-4 py-3 text-violet-300 text-sm flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            {stepLabels[step]}
            </div>
        )}

        {step === "success" && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-emerald-300 text-sm">
            <p className="font-semibold">Payment released successfully.</p>
            {txHash && (
                <p className="mt-1 font-mono text-xs text-emerald-500 break-all">Tx: {txHash}</p>
            )}
            </div>
        )}

        {step === "error" && (
            <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
            {errorMsg}
            </div>
        )}

        <div className="bg-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-500 leading-relaxed">
            Submitting will scan the patient&apos;s biometric, generate an EIP-712 signed request from this wallet, and release funds directly to this hospital address.
        </div>

        <button
            onClick={handlePaymentRequest}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold rounded-xl transition-colors text-lg"
        >
            {isLoading ? "Processing..." : "Release Emergency Funds"}
        </button>
        </div>
    );
}
