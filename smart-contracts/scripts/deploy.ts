import { network } from "hardhat";
import { formatEther, encodeFunctionData } from "viem";

async function main() {
  console.log("Starting MediVault Protocol deployment...");

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  console.log("Deploying with account:", deployer.account.address);

  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log("Account balance:", formatEther(balance), "ETH");

  const stablecoinAddress = (process.env.USDC_ADDRESS ?? "0xfffFFfFF00000000000000000000000000007A69") as `0x${string}`;
  const priceFeedAddress  = (process.env.PRICE_FEED_ADDRESS ?? deployer.account.address) as `0x${string}`;
  const adminAddress      = (process.env.ADMIN_ADDRESS ?? deployer.account.address) as `0x${string}`;

  console.log("\nDeployment parameters:");
  console.log("- Stablecoin (USDC):", stablecoinAddress);
  console.log("- Price Feed:       ", priceFeedAddress);
  console.log("- Admin:            ", adminAddress);

  // 1. Deploy HospitalRegistry implementation
  console.log("\n[1/4] Deploying HospitalRegistry implementation...");
  const registryImpl = await viem.deployContract("HospitalRegistry");
  console.log("  HospitalRegistry impl:", registryImpl.address);

  // 2. Deploy HospitalRegistry proxy
  console.log("[2/4] Deploying HospitalRegistry proxy...");
  const registryInitData = encodeFunctionData({
    abi: registryImpl.abi,
    functionName: "initialize",
    args: [adminAddress],
  });

  const registryProxy = await viem.deployContract("TestERC1967Proxy", [
    registryImpl.address,
    registryInitData,
  ]);
  console.log("  HospitalRegistry proxy:", registryProxy.address);

  const registry = await viem.getContractAt("HospitalRegistry", registryProxy.address);

  // 3. Deploy MediVault implementation
  console.log("[3/4] Deploying MediVault implementation...");
  const vaultImpl = await viem.deployContract("MediVault");
  console.log("  MediVault impl:", vaultImpl.address);

  // 4. Deploy MediVaultFactory
  console.log("[4/4] Deploying MediVaultFactory...");
  const factory = await viem.deployContract("MediVaultFactory", [
    vaultImpl.address,
    registryProxy.address,
    stablecoinAddress,
    priceFeedAddress,
    adminAddress,
  ]);
  console.log("  MediVaultFactory:", factory.address);

  // Link factory to registry
  console.log("\nLinking factory to registry...");
  await registry.write.setFactory([factory.address], {
    account: deployer.account,
  });
  console.log("  Factory linked.");

  // Verify
  console.log("\nVerifying deployment...");
  const deployedImpl      = await factory.read.implementation();
  const deployedRegistry  = await factory.read.registry();
  const deployedStablecoin = await factory.read.stablecoin();
  const linkedFactory     = await registry.read.factory();

  console.log("  Factory implementation:", deployedImpl);
  console.log("  Factory registry:      ", deployedRegistry);
  console.log("  Factory stablecoin:    ", deployedStablecoin);
  console.log("  Registry factory:      ", linkedFactory);

  console.log("\nMediVault Protocol deployed successfully!");
  console.log("\nAdd these to your frontend .env:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factory.address}`);
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registryProxy.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });