import { ethers } from "ethers";
import hardhat from "hardhat";
import ignition from "hardhat";
import MediVaultProtocol from "../ignition/deploy.js";

async function main() {
  console.log("Starting MediVault Protocol deployment...");

  // Get deployer account
  const [deployer] = await hardhat.viem.getWalletClients();
  console.log("Deploying contracts with account:", deployer.account.address);

  // Get account balance
  const publicClient = hardhat.viem.getPublicClient();
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get configuration from environment variables
  const stablecoinAddress = process.env.USDC_ADDRESS || "0x0";
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.account.address;

  if (stablecoinAddress === "0x0") {
    console.warn("WARNING: USDC_ADDRESS not set in environment. Using placeholder address.");
  }

  console.log("Deployment parameters:");
  console.log("- Stablecoin (USDC):", stablecoinAddress);
  console.log("- Admin:", adminAddress);

  try {
    // Deploy the protocol using Ignition
    const { hospitalRegistry, mediVault, factory } = await ignition.deploy(MediVaultProtocol, {
      parameters: {
        HospitalRegistry: {
          admin: adminAddress,
        },
        MediVaultFactory: {
          stablecoin: stablecoinAddress,
          admin: adminAddress,
        },
      },
    });

    console.log("\n✅ Deployment successful!");
    console.log("Contract addresses:");
    console.log("- HospitalRegistry:", hospitalRegistry.address);
    console.log("- MediVault Implementation:", mediVault.address);
    console.log("- MediVaultFactory:", factory.address);

    // Verify deployment by calling view functions
    console.log("\n🔍 Verifying deployment...");
    
    // Check factory configuration
    const deployedImplementation = await factory.read.implementation();
    const deployedRegistry = await factory.read.registry();
    const deployedStablecoin = await factory.read.stablecoin();
    
    console.log("Factory configuration:");
    console.log("- Implementation:", deployedImplementation);
    console.log("- Registry:", deployedRegistry);
    console.log("- Stablecoin:", deployedStablecoin);
    
    // Check registry admin
    const DEFAULT_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
    const registryAdmin = await hospitalRegistry.read.hasRole([
      DEFAULT_ADMIN_ROLE,
      adminAddress,
    ]);
    console.log("- Registry admin set correctly:", registryAdmin);

    console.log("\n🎉 MediVault Protocol deployed successfully!");
    console.log("\nNext steps:");
    console.log("1. Update frontend .env with contract addresses");
    console.log("2. Register hospitals in the HospitalRegistry");
    console.log("3. Users can create vaults via the MediVaultFactory");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });