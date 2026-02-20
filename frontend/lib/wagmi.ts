"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const polkadotHubTestnet = defineChain({
    id: 420420421,
    name: "Polkadot Hub Westend",
    nativeCurrency: { name: "Westend DOT", symbol: "WND", decimals: 18 },
    rpcUrls: {
        default: {
        http: ["https://westend-asset-hub-eth-rpc.polkadot.io"],
        },
    },
    blockExplorers: {
        default: {
        name: "Subscan",
        url: "https://assethub-westend.subscan.io",
        },
    },
    testnet: true,
});

export const polkadotHub = defineChain({
    id: 420420422,
    name: "Polkadot Hub",
    nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 18 },
    rpcUrls: {
        default: {
        http: [process.env.NEXT_PUBLIC_HUB_MAINNET_RPC ?? ""],
        },
    },
    blockExplorers: {
        default: {
        name: "Subscan",
        url: "https://assethub-polkadot.subscan.io",
        },
    },
});

// Wagmi Config
export const wagmiConfig = getDefaultConfig({
    appName: "MediVault Protocol",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "medivault",
    chains: [polkadotHubTestnet, polkadotHub],
    ssr: true,
});
