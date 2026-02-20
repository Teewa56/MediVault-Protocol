### MediVault Protocol

### Technical Architecture Document

## 1. Project Overview
MediVault Protocol is a decentralized emergency healthcare payment system deployed on Polkadot Hub's EVM layer. Users pre-fund personal smart contract vaults with stablecoins, bind them to biometric identity commitments on-chain, and grant verified hospitals the ability to trigger instant withdrawals during emergencies — all without intermediaries, paperwork, or delay.
The system is structured around three core contracts: a factory that deploys per-user vaults, a vault contract that holds funds and enforces access rules, and a hospital registry that manages institutional credentials. A Next.js frontend connects end users and hospital terminals to the on-chain system via wagmi and RainbowKit.

## 2. Folder Structure
The repository is split into two top-level workspaces:
smart-contracts/
smart-contracts/
├── contracts/
│   ├── MediVaultFactory.sol     # Deploys per-user vault instances
│   ├── MediVault.sol            # Core vault: funds, biometric, access control
│   ├── HospitalRegistry.sol     # Hospital registration & HAT issuance
│   └── interfaces/
│       ├── IMediVault.sol
│       └── IHospitalRegistry.sol
├── ignition/
│   └── modules/
│       └── MediVault.ts         # Hardhat Ignition deployment module
├── test/
│   ├── MediVaultFactory.ts
│   ├── MediVault.ts
│   └── HospitalRegistry.ts
├── scripts/
│   └── deploy.ts
├── hardhat.config.ts
└── package.json
frontend/
frontend/
├── app/
│   ├── layout.tsx               # Root layout with wallet providers
│   ├── page.tsx                 # Landing / connect wallet
│   ├── dashboard/               # User vault dashboard
│   │   └── page.tsx
│   └── hospital/                # Hospital terminal interface
│       └── page.tsx
├── components/
│   ├── VaultCard.tsx
│   ├── DepositForm.tsx
│   ├── BiometricSetup.tsx
│   └── HospitalPaymentRequest.tsx
├── lib/
│   ├── contracts.ts             # ABI imports & contract addresses
│   ├── wagmi.ts                 # wagmi + RainbowKit config
│   └── biometric.ts             # WebAuthn hashing utilities
└── package.json

## 3. Smart Contract Architecture
### 3.1 Contract Roles & Separation of Concerns
The contracts follow a strict data-logic separation enforced through the proxy upgrade pattern (OpenZeppelin TransparentUpgradeableProxy). Logic lives in implementation contracts; state lives behind the proxy. This means the core vault logic can be upgraded without users losing funds or needing to redeploy vaults.
Contract	Responsibility
=> (**MediVaultFactory.sol**)	Deploys and tracks individual MediVault instances per user. Entry point for all new vault creation.
=> (**MediVault.sol**)	Holds stablecoin balance, stores biometric commitment (bytes32), enforces emergency cap, manages hospital allowlist, processes payment requests.
=> (**HospitalRegistry.sol**)	Registers and verifies hospitals via multisig admin. Issues EIP-712 signed Hospital Access Tokens (HAT). Single source of truth for institutional credentials.
### 3.2 Proxy & Upgrade Setup
(**MediVault.sol**) and (**HospitalRegistry.sol**) are both deployed behind OpenZeppelin's TransparentUpgradeableProxy. The factory deploys each vault as a proxy pointing to a shared MediVault implementation, keeping deployment gas low and enabling global logic upgrades.
=> MediVault implementation contract: deployed once, shared across all vault proxies
=> MediVaultFactory: stores a mapping of userAddress → vaultProxyAddress
=> HospitalRegistry: standalone upgradeable proxy, governed by a 2-of-3 multisig admin
All storage variables in MediVault.sol use storage gaps (uint256[50] __gap) to prevent storage slot collision on upgrades
### 3.3 Data & State Design
MediVault.sol stores the following state per vault:
address public owner;                          // Vault owner
IERC20 public stablecoin;                      // Accepted token (USDC)
bytes32 public biometricCommitment;            // keccak256 hash of biometric template
uint256 public emergencyCap;                   // Max single withdrawal (in token units)
uint256 public cooldownPeriod;                 // Seconds between hospital withdrawals
uint256 public lastWithdrawalTimestamp;
mapping(address => bool) public authorizedHospitals;
address[] public guardians;                    // Social recovery wallets
=> HospitalRegistry.sol stores:
mapping(address => Hospital) public hospitals;
struct Hospital {
    string name;
    bool verified;
    uint256 registeredAt;
}

## 4. Key Protocol Flows
### 4.1 User Vault Setup
User calls MediVaultFactory.createVault() → factory deploys proxy → emits VaultCreated(user, vaultAddress)
User deposits USDC into vault via vault.deposit(amount) after approving the ERC-20 spend
User sets biometric commitment: vault.setBiometricCommitment(bytes32 hash) — hash generated client-side via WebAuthn
User configures emergency cap and cooldown via vault.setEmergencyConfig(cap, cooldown)
### 4.2 Hospital Payment Request
Hospital terminal scans patient biometric → generates keccak256 hash client-side
Hospital calls vault.requestPayment(amount, biometricHash, EIP712Signature)
Vault verifies: (1) hospital is in HospitalRegistry, (2) biometricHash matches on-chain commitment, (3) amount ≤ emergencyCap, (4) cooldown has elapsed
On success: USDC transferred directly to hospital wallet, event emitted

## 5. Tech Stack Summary
```table
| Layer | Stack |
|-------|-------|
| Smart Contracts | Solidity ^0.8.20, OpenZeppelin Upgradeable, EIP-712 |
| Dev Framework | Hardhat 3 Beta, hardhat-ignition, hardhat-toolbox-viem |
| Testing | Hardhat node:test runner + viem assertions |
| Frontend | Next.js 14 (App Router), TailwindCSS v4, shadcn/ui |
| Wallet | RainbowKit + wagmi v2 |
| Biometric | WebAuthn API (client-side), bytes32 on-chain commitment |
| Blockchain | Polkadot Hub EVM (Westend testnet) |
```

## 6. Environment Configuration
### => Required .env variables for smart-contracts:
PRIVATE_KEY=<deployer_private_key>
POLKADOT_HUB_RPC=https://westend-asset-hub-eth-rpc.polkadot.io
USDC_ADDRESS=<stablecoin_contract_on_hub>
MULTISIG_ADMIN=<3 wallet addresses separated by comma>
### => Required .env variables for frontend:
NEXT_PUBLIC_FACTORY_ADDRESS=<deployed_factory_address>
NEXT_PUBLIC_REGISTRY_ADDRESS=<deployed_registry_address>
NEXT_PUBLIC_CHAIN_ID=420420421

## 7. Implementation Notes
1. Biometric data is never stored raw on-chain. Only a keccak256 hash of the client-generated WebAuthn credential is stored as bytes32.
2. The proxy pattern means all vault proxies share one implementation — a single upgrade call on the factory updates logic for all users simultaneously.
3. Hospital Registry is governed by multisig at launch, with planned DAO transition in Phase 4.
4. EIP-712 typed signatures are used for hospital payment requests to prevent replay attacks across chains and vaults.
5. Hardhat 3 Beta is used for its native viem integration and improved network simulation — note that some Hardhat 2 plugins are not yet compatible.