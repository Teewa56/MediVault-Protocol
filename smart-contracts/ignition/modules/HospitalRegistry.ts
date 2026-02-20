import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HospitalRegistry = buildModule("HospitalRegistry", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));

  const hospitalRegistry = m.contract("HospitalRegistry", [], {
    id: "HospitalRegistry_Proxy",
  });

  m.call(hospitalRegistry, "initialize", [admin]);

  return { hospitalRegistry };
});

export default HospitalRegistry;