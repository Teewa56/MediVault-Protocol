# MediVault Protocol
### Decentralized Emergency Medical Payment Infrastructure on Polkadot Hub

---

## Introduction

Healthcare emergencies do not wait for paperwork, insurance approvals, or wire transfers. Every second of delay between a patient arriving at a hospital and receiving treatment can carry life-or-death consequences. Yet across the world and particularly across Afrcica, the financial infrastructure surrounding emergency medical care remains archaic, siloed, and deeply inaccessible. Patients arrive at emergency rooms unable to produce funds quickly enough. Hospitals are forced to make impossible decisions. Families are devastated not just by illness, but by the financial shock that follows.

MediVault Protocol is a decentralized medical payment infrastructure built on Polkadot Hub that fundamentally reimagines how emergency healthcare is financed. By allowing users to pre-fund personal health vaults with stablecoins ahead of emergencies, and enabling verified hospitals to access those funds instantly through biometric identity authentication, MediVault eliminates the financial friction that costs lives and destroys families every day.

Built using EVM-compatible Solidity smart contracts deployed natively on Polkadot Hub, MediVault is the first protocol of its kind to combine decentralized vault finance, on-chain biometric identity, and hospital access control into a single, production-ready healthcare payment system. It is not a payment gateway — it is a financial safety net, designed for the moment you need it most.

This project is a submission to the Polkadot Solidity Hackathon (February–March 2026), competing in Track 1: EVM Smart Contracts, under the DeFi and stablecoin-enabled dApps focus area.

---

## Problem / Gap

The emergency healthcare payment problem is not a technology problem — it is an infrastructure problem. Current solutions fail at multiple levels simultaneously, and no existing protocol has addressed the full stack of the issue.

**The Patient Side:** Most people, especially in developing and emerging economies across APAC, do not have immediate liquid access to emergency funds. Insurance reimbursement is slow, often requiring pre-authorization. Credit lines are unavailable or insufficient. Digital wallets are personal but not medically accessible. When a patient arrives unconscious or incapacitated at a hospital, they cannot initiate a payment themselves, and there is no system in place to do it on their behalf — instantly, trustlessly, and verifiably.

**The Hospital Side:** Hospitals bear enormous financial risk by treating patients before payment is confirmed. Emergency departments globally absorb billions in uncompensated care annually. Without a reliable, real-time payment mechanism, hospitals in under-resourced regions are forced to delay treatment or request upfront deposits — a practice that is both ethically troubling and legally complex. There is no decentralized, permissionless system through which a verified medical institution can access a pre-authorized patient fund without human intermediaries or bureaucratic overhead.

**The Identity Gap:** Traditional payment systems have no way to verify patient identity in a trustless manner during an emergency. Centralized identity databases are fragile, siloed across institutions, and inaccessible cross-border. Polkadot's on-chain identity system offers a solution that existing chains cannot — a native, verifiable, ecosystem-wide identity layer that MediVault can plug into directly.

**The Blockchain Gap:** Most healthcare blockchain projects have been theoretical or enterprise-only. They require consortiums, permissioned networks, and lengthy onboarding. None leverage the full power of a public, EVM-compatible, cross-chain blockchain like Polkadot Hub to deliver open, composable healthcare finance to individuals.

MediVault fills this gap entirely.

---

## Solution

MediVault Protocol is a three-layer decentralized system: a **user-facing vault layer**, a **biometric identity layer**, and a **hospital access layer** — all operating on Polkadot Hub through EVM-compatible Solidity smart contracts.

**The Vault Layer** allows any user to create a personal MediVault — a smart contract wallet funded with stablecoins (USDC or DOT-backed stablecoins on Polkadot Hub). Users deposit funds at any time, not just during emergencies, building a financial cushion that is liquid, non-custodial, and programmable. The vault is owned by the user's wallet and governed entirely by on-chain logic — no third party can access or freeze it.

**The Identity Layer** links each MediVault to the user's Polkadot on-chain identity. Through an off-chain biometric binding process (fingerprint or facial recognition hash stored as an encrypted commitment on-chain), a user's vault is associated with their biometric signature. In an emergency, a hospital-side terminal can verify the patient's identity biometrically, retrieve the on-chain commitment, and cryptographically match it to the corresponding vault — all without the patient needing to present a card, phone, or password.

**The Hospital Access Layer** is a permissioned access module through which verified medical institutions are registered on-chain. Hospitals undergo an on-chain verification process (analogous to Polkadot's on-chain identity verification) and are issued a Hospital Access Token (HAT). When a patient emergency occurs, the hospital submits a signed payment request to the patient's vault contract, which automatically releases the requested funds (up to a pre-configured emergency cap set by the user) directly to the hospital's verified wallet — instantly and without intermediaries.

---

## Approach

### Logical Approach

The logical design of MediVault is built around one core principle: **pre-authorization, not post-authorization**. Traditional healthcare payments are reactive — they happen after treatment, after bureaucracy, after delay. MediVault flips this entirely. The user pre-funds a vault, pre-configures emergency access rules, and pre-verifies their identity — so that when an emergency occurs, the system executes autonomously. The human decision has already been made. The smart contract simply enforces it.

The access model is tiered: users set a maximum emergency withdrawal limit (e.g., $2,000 USDC), a list of authorized hospital categories (e.g., any W3F-verified public hospital), and optional time-locks or cooldown periods to prevent abuse. Multiple guardians (family members' wallets) can also be added as secondary approvers for withdrawals above the cap, introducing a social recovery layer.

### Technical Approach

On the technical side, MediVault deploys a factory contract pattern on Polkadot Hub's EVM environment. A central `MediVaultFactory.sol` contract allows any user to deploy a personal `MediVault.sol` instance. Each vault instance holds funds, stores an encrypted biometric commitment hash, and maintains an access control mapping of verified hospital addresses.

Biometric data is never stored on-chain in raw form. Instead, a one-way hash of the biometric template (generated client-side using a WebAuthn-compatible library) is stored as a bytes32 commitment. Hospital terminals produce a hash from the patient's scanned biometric and compare it against the on-chain commitment — a match triggers payment authorization.

Hospital verification is managed by a `HospitalRegistry.sol` contract, which is governed by a multisig of MediVault protocol administrators and can be progressively decentralized via on-chain governance. Each registered hospital is issued a signed credential (EIP-712 typed signature) that is verified on-chain during every payment request.

---

## Technical Architecture and Design

```
[ User Device / Web App ]
        |
        | (Deploy Vault, Fund, Set Biometric Commitment)
        v
[ MediVaultFactory.sol ] ──────────────────────────────────┐
        |                                                  |
        | (Creates per-user vault instances)               |
        v                                                  |
[ MediVault.sol (per user) ]                               |
   - stablecoin balance                                    |
   - biometric commitment (bytes32)                        |
   - emergency cap setting                                 |
   - authorized hospital mapping                           |
   - guardian wallet list                                  |
        |                                                  |
        | (Hospital submits signed payment request)        |
        v                                                  |
[ Payment Authorization Logic ]                            |
   - Verify hospital HAT via HospitalRegistry.sol          |
   - Verify biometric match (hash comparison)              |
   - Check withdrawal cap & cooldown                       |
   - Release funds via ERC-20 transfer                     |
        |                                                  |
        v                                                  |
[ HospitalRegistry.sol ] ◄─────────────────────────────────┘
   - Hospital registration & verification
   - HAT (Hospital Access Token) issuance
   - Multisig-governed admin functions

[ Polkadot On-Chain Identity Layer ]
   - User identity linked to vault address
   - Parachain-level identity propagation via XCM (future)
```
For more information on the technical architecture and design, please refer to the [TECHNICAL_DOCUMENT.md](./TECHNICAL_DOCUMENT.md) file.

The entire architecture is deployed on Polkadot Hub's EVM environment, making it fully composable with other Solidity protocols on Hub while remaining connected to the broader Polkadot ecosystem through XCM for future cross-parachain identity and payment features.

---

## Tech Stack

**Smart Contracts:** Solidity (^0.8.20), deployed on Polkadot Hub EVM
**Development Framework:** Hardhat with ethers.js
**Testing:** Hardhat test suite + Chai assertions
**Frontend:** Next.js 14 (App Router), TailwindCSS, shadcn/ui components
**Wallet Integration:** RainbowKit + wagmi for Polkadot Hub EVM wallet connection
**Biometric Layer:** WebAuthn API (client-side biometric hashing), stored as bytes32 on-chain
**Identity:** Polkadot on-chain identity (linked via wallet address)
**Stablecoins:** USDC (bridged) or DOT-backed stablecoin on Polkadot Hub
**Contract Standards:** ERC-20 (fund deposits/withdrawals), EIP-712 (typed signatures for hospital requests)
**Deployment Tools:** Hardhat Ignition, dotenv for environment config
**Version Control:** Git + GitHub

---

## Local Setup Guide

### Prerequisites
- Node.js v18+ and npm/yarn installed
- MetaMask or any EVM-compatible wallet configured for Polkadot Hub testnet
- Git installed

### Step 1: Clone the Repository
```bash
git clone https://github.com/Teewa56/medivault-protocol.git
cd medivault-protocol
```

### Step 2: Install Dependencies
```bash
cd frontend 
npm install
cd ../smart-contracts
npm install (add --legacy-peer-deps if you get an error)
```

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
cd ../frontend
cp .env.example .env
```

### Step 4: Compile Smart Contracts
```bash
cd ../smart-contracts
npx hardhat compile
```

### Step 5: Run Tests
```bash
npx hardhat test
```

### Step 6: Deploy to Polkadot Hub Testnet
```bash
npx hardhat run scripts/deploy.ts --network polkadotHubTestnet
```

### Step 7: Run the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Visit `http://localhost:3000` to interact with the protocol locally.

---

## Roadmap

**Phase 1 — Hackathon MVP (March 2026)**
Deploy core vault contracts, hospital registry, biometric commitment system, and functional frontend on Polkadot Hub testnet. Complete demo with end-to-end emergency payment flow.

**Phase 2 — Mainnet & Pilot (Q2 2026)**
Deploy on Polkadot Hub mainnet. Onboard 3–5 pilot hospitals in APAC (starting with Philippines and Vietnam, leveraging OpenGuild's regional community). Launch KYC-lite hospital verification process.

**Phase 3 — Cross-Chain Identity (Q3 2026)**
Integrate XCM-based identity propagation so that a MediVault created on Polkadot Hub is accessible and verifiable from any parachain in the ecosystem. Explore integration with Kilt Protocol for decentralized credential management.

**Phase 4 — DAO Governance & Grant Expansion (Q4 2026)**
Transition hospital registry governance to a DAO. Apply for Web3 Foundation grants and regional health ministry partnerships. Launch MediVault mobile app for mass consumer adoption across APAC.

---

## Why Polkadot Hub

MediVault is not an Ethereum project wrapped in a different chain. It is natively designed for Polkadot Hub because of three irreplaceable features. First, Polkadot's native on-chain identity system is the only public blockchain identity layer robust enough to anchor biometric commitments without a centralized identity provider. Second, Polkadot Hub's EVM compatibility means MediVault benefits from the full Solidity developer ecosystem while running on infrastructure that is fundamentally more scalable and interoperable than Ethereum mainnet. Third, XCM opens the door for MediVault to become a cross-parachain protocol — where a vault funded on Hub can authorize payments across any connected parachain in the future — something architecturally impossible on any single-chain EVM network. Polkadot Hub is not just a deployment target; it is the foundation that makes MediVault's full vision possible.

---

## Conclusion

MediVault Protocol is a blueprint for what decentralized infrastructure can do in the real world when it is applied to a problem that actually matters. Emergency healthcare payment is a crisis that affects hundreds of millions of people across APAC and beyond, and no existing blockchain project has addressed it with the depth, technical rigor, and ecosystem alignment that MediVault brings to the table. By combining Solidity smart contracts on Polkadot Hub with biometric identity, hospital access control, and a pre-authorization vault model, MediVault creates a system that is trustless, permissionless, and — most importantly — ready to save lives. The code is open, the architecture is composable, and the roadmap is clear. MediVault is built for the future of healthcare finance, and that future starts on Polkadot.
