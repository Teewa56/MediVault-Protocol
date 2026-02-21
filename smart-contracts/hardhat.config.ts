import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.20",
        settings: {
          evmVersion: "london",
        },
      },
      production: {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "london",
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    /*sepolia: { --uncomment when deploying to sepolia
      type: "http",
      chainType: "l1",
      url: `${process.env.SEPOLIA_RPC_URL}`,
      accounts: [`${process.env.SEPOLIA_PRIVATE_KEY}`],
    },*/
    polkadotHubTestnet: {
      type: "http",
      chainType: "l1",
      url: `${process.env.POLKADOT_HUB_RPC}`,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    /*polkadotHub: { --uncomment when deploying to polkadot hub
      type: "http",
      chainType: "l1",
      url: `${process.env.POLKADOT_HUB_MAINNET_RPC}`,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },*/
  },
});
