"use client";

import { useReadContract } from "wagmi";
import { VAULT_ABI } from "@/lib/contracts";
import { formatUnits } from "viem";
import { formatCommitment } from "@/lib/biometric";

interface VaultCardProps {
    vaultAddress: `0x${string}`;
}

export function VaultCard({ vaultAddress }: VaultCardProps) {
    const { data: balance } = useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getBalance",
    });

    const { data: commitment } = useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "biometricCommitment",
    });

    const { data: cap } = useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "emergencyCap",
    });

    const { data: cooldown } = useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "cooldownPeriod",
    });

    const { data: lastWithdrawal } = useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "lastWithdrawalTimestamp",
    });

    const balanceUSDC = balance ? parseFloat(formatUnits(balance, 6)).toFixed(2) : "—";
    const capUSDC = cap ? parseFloat(formatUnits(cap, 6)).toFixed(2) : "—";
    const cooldownHrs = cooldown ? Number(cooldown) / 3600 : "—";
    const hasCommitment = commitment && commitment !== "0x0000000000000000000000000000000000000000000000000000000000000000";

    const lastWithdrawalDate = lastWithdrawal && lastWithdrawal > 0n
        ? new Date(Number(lastWithdrawal) * 1000).toLocaleDateString()
        : "Never";

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
        {/* Balance */}
        <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-xs uppercase tracking-widest">Vault Balance</span>
            <span className="text-4xl font-bold text-white">
            ${balanceUSDC} <span className="text-zinc-500 text-xl font-normal">USDC</span>
            </span>
        </div>

        {/* Status row */}
        <div className="grid grid-cols-2 gap-3">
            <StatTile
            label="Biometric"
            value={hasCommitment ? "Linked ✓" : "Not Set"}
            accent={hasCommitment ? "text-emerald-400" : "text-amber-400"}
            />
            <StatTile label="Emergency Cap" value={`$${capUSDC}`} />
            <StatTile label="Cooldown" value={`${cooldownHrs}h`} />
            <StatTile label="Last Payment" value={lastWithdrawalDate} />
        </div>

        {/* Commitment */}
        {hasCommitment && (
            <div className="bg-zinc-800 rounded-xl px-4 py-3">
            <span className="text-zinc-500 text-xs">Biometric Commitment</span>
            <p className="text-zinc-300 font-mono text-sm mt-0.5">
                {formatCommitment(commitment as `0x${string}`)}
            </p>
            </div>
        )}

        {/* Vault address */}
        <div className="bg-zinc-800 rounded-xl px-4 py-3">
            <span className="text-zinc-500 text-xs">Vault Address</span>
            <p className="text-zinc-300 font-mono text-sm mt-0.5 break-all">{vaultAddress}</p>
        </div>
        </div>
    );
}

function StatTile({
    label,
    value,
    accent = "text-white",
}: {
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div className="bg-zinc-800 rounded-xl px-4 py-3">
        <span className="text-zinc-500 text-xs">{label}</span>
        <p className={`font-semibold mt-0.5 ${accent}`}>{value}</p>
        </div>
    );
}
