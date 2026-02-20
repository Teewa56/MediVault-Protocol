// ── Deployed Addresses (set in .env) ─────────────────────────────────────────
export const CONTRACT_ADDRESSES = {
  factory:  process.env.NEXT_PUBLIC_FACTORY_ADDRESS  as `0x${string}`,
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`,
} as const;

// ── MediVaultFactory ABI ──────────────────────────────────────────────────────
export const FACTORY_ABI = [
  {
    name: "createVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "vault", type: "address" }],
  },
  {
    name: "vaultOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "totalVaults",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "VaultCreated",
    type: "event",
    inputs: [
      { name: "user",  type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
    ],
  },
] as const;

// ── MediVault ABI ─────────────────────────────────────────────────────────────
export const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "to",     type: "address" },
    ],
    outputs: [],
  },
  {
    name: "requestPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",        type: "uint256" },
      { name: "biometricHash", type: "bytes32" },
      { name: "signature",     type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "setBiometricCommitment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "setEmergencyConfig",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cap",      type: "uint256" },
      { name: "cooldown", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "authorizeHospital",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "hospital", type: "address" }],
    outputs: [],
  },
  {
    name: "revokeHospital",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "hospital", type: "address" }],
    outputs: [],
  },
  {
    name: "pause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "unpause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // Views
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "biometricCommitment",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "emergencyCap",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "cooldownPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastWithdrawalTimestamp",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isHospitalAuthorized",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "hospital", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getGuardians",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  // Events
  {
    name: "Deposited",
    type: "event",
    inputs: [
      { name: "token",  type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "EmergencyPayment",
    type: "event",
    inputs: [
      { name: "hospital",  type: "address", indexed: true },
      { name: "amount",    type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

// ── ERC20 ABI (USDC approve + balanceOf) ──────────────────────────────────────
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── HospitalRegistry ABI ──────────────────────────────────────────────────────
export const REGISTRY_ABI = [
  {
    name: "registerHospital",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name",    type: "string" },
      { name: "country", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "hospital", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getHospital",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "hospital", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name",         type: "string"  },
          { name: "country",      type: "string"  },
          { name: "verified",     type: "bool"    },
          { name: "registeredAt", type: "uint256" },
          { name: "verifiedAt",   type: "uint256" },
        ],
      },
    ],
  },
] as const;
