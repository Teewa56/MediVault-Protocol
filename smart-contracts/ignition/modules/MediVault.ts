import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MediVault = buildModule("MediVault", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));

  const mediVault = m.contract("MediVault", [], {
    id: "MediVault_Implementation",
  });

  return { mediVault };
});

export default MediVault;