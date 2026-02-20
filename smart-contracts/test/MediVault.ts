import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * MediVault Ignition Deployment Module
 *
 * Deployment order:
 * 1. HospitalRegistry implementation + proxy
 * 2. MediVault implementation (shared logic, no proxy here)
 * 3. MediVaultFactory (uses vault impl + registry addresses)
 *
 * Environment variables required (set in hardhat.config.ts or .env):
 *   ADMIN_ADDRESS    — multisig or deployer address for admin roles
 *   USDC_ADDRESS     — stablecoin contract on Polkadot Hub
 */
export default buildModule("MediVaultModule", (m) => {
    const admin    = m.getParameter("adminAddress");
    const usdc     = m.getParameter("usdcAddress");

    const registryImpl = m.contract("HospitalRegistry", [], {
        id: "HospitalRegistryImpl",
    });

    const registryInitData = m.encodeFunctionCall(
        registryImpl,
        "initialize",
        [admin]
    );

    const registryProxy = m.contract("ERC1967Proxy", [registryImpl, registryInitData], {
        id: "HospitalRegistryProxy",
    });

    const vaultImpl = m.contract("MediVault", [], {
        id: "MediVaultImpl",
    });

    const factory = m.contract("MediVaultFactory", [
        vaultImpl,
        registryProxy,
        usdc,
        admin,
    ]);

    return {
        registryImpl,
        registryProxy,
        vaultImpl,
        factory,
    };
});
