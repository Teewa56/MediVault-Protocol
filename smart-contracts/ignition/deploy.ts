import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import HospitalRegistry from "./modules/HospitalRegistry.js";
import MediVault from "./modules/MediVault.js";
import MediVaultFactory from "./modules/MediVaultFactory.js";

const MediVaultProtocol = buildModule("MediVaultProtocol", (m) => {
  // Deploy individual modules
  const { hospitalRegistry } = m.useModule(HospitalRegistry);
  const { mediVault } = m.useModule(MediVault);
  const { factory } = m.useModule(MediVaultFactory);

  // Link factory to registry after deployment
  m.call(hospitalRegistry, "setFactory", [factory]);

  return {
    hospitalRegistry,
    mediVault,
    factory,
  };
});

export const deployMediVaultProtocol = MediVaultProtocol;
export default MediVaultProtocol;
