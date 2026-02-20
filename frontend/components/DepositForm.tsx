"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { VAULT_ABI, ERC20_ABI } from "@/lib/contracts";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

interface DepositFormProps {
  vaultAddress: `0x${string}`;
}

type Step = "idle" | "approving" | "depositing" | "success" | "error";

export function DepositForm({ vaultAddress }: DepositFormProps) {
    const { address } = useAccount();
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState<Step>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const { data: allowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, vaultAddress] : undefined,
        query: { enabled: !!address },
    });

    const { writeContractAsync: approveUSDC } = useWriteContract();
    const { writeContractAsync: deposit } = useWriteContract();

    async function handleDeposit() {
        if (!amount || parseFloat(amount) <= 0) return;

        const amountParsed = parseUnits(amount, 6);
        setErrorMsg("");

        try {
        // Step 1: Approve if needed
        if (!allowance || allowance < amountParsed) {
            setStep("approving");
            const approveTx = await approveUSDC({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [vaultAddress, amountParsed],
            });
        }

        // Step 2: Deposit
        setStep("depositing");
        await deposit({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: "deposit",
            args: [amountParsed],
        });

        setStep("success");
        setAmount("");
        setTimeout(() => setStep("idle"), 3000);
        } catch (e: any) {
        setErrorMsg(e?.shortMessage ?? e?.message ?? "Transaction failed.");
        setStep("error");
        }
    }

    const isLoading = step === "approving" || step === "depositing";

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
        <h3 className="text-white font-semibold text-lg">Deposit USDC</h3>

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

        {/* Quick amounts */}
        <div className="flex gap-2">
            {["100", "500", "1000", "5000"].map((q) => (
            <button
                key={q}
                onClick={() => setAmount(q)}
                disabled={isLoading}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg py-2 transition-colors disabled:opacity-50"
            >
                ${q}
            </button>
            ))}
        </div>

        {/* Status messages */}
        {step === "approving" && (
            <StatusBanner type="info" msg="Step 1/2 — Approving USDC spend..." />
        )}
        {step === "depositing" && (
            <StatusBanner type="info" msg="Step 2/2 — Depositing to vault..." />
        )}
        {step === "success" && (
            <StatusBanner type="success" msg={`Successfully deposited $${amount} USDC into your vault.`} />
        )}
        {step === "error" && (
            <StatusBanner type="error" msg={errorMsg} />
        )}

        <button
            onClick={handleDeposit}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-colors"
        >
            {isLoading ? "Processing..." : "Deposit"}
        </button>
        </div>
    );
}

function StatusBanner({ type, msg }: { type: "info" | "success" | "error"; msg: string }) {
    const styles = {
        info:    "bg-blue-950 border-blue-800 text-blue-300",
        success: "bg-emerald-950 border-emerald-800 text-emerald-300",
        error:   "bg-red-950 border-red-800 text-red-300",
    };
    return (
        <div className={`border rounded-xl px-4 py-3 text-sm ${styles[type]}`}>
        {msg}
        </div>
    );
}