import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
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
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    polkadotHubTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("POLKADOT_HUB_RPC"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
    polkadotHub: {
      type: "http",
      chainType: "l1",
      url: configVariable("POLKADOT_HUB_MAINNET_RPC"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});
