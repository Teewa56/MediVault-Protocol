import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import HospitalRegistry from "./HospitalRegistry.js";
import MediVault from "./MediVault.js";

const MediVaultFactory = buildModule("MediVaultFactory", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const stablecoin = m.getParameter("stablecoin", "0x0"); // Will be set during deployment

  const { hospitalRegistry } = m.useModule(HospitalRegistry);
  const { mediVault } = m.useModule(MediVault);

  const factory = m.contract("MediVaultFactory", [
    mediVault,
    hospitalRegistry,
    stablecoin,
    admin,
  ]);

  return { factory };
});

export default MediVaultFactory;