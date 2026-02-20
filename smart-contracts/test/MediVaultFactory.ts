import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData } from "viem";

describe("MediVaultFactory", async () => {
    const { viem } = await network.connect();
    const [admin, user1, user2] = await viem.getWalletClients();

    let registryImpl: any;
    let registryProxy: any;
    let registry: any;
    let vaultImpl: any;
    let factory: any;

    before(async () => {
        // Deploy registry implementation
        registryImpl = await viem.deployContract("HospitalRegistry");

        // Deploy registry proxy
        const registryInitData = encodeFunctionData({
            abi: registryImpl.abi,
            functionName: "initialize",
            args: [admin.account.address],
        });
        
        // Deploy ERC1967Proxy from OpenZeppelin
        registryProxy = await viem.deployContract("TestERC1967Proxy", [
            registryImpl.address,
            registryInitData,
        ]);

        // Attach registry ABI to proxy
        registry = await viem.getContractAt("HospitalRegistry", registryProxy.address);

        // Deploy vault implementation
        vaultImpl = await viem.deployContract("MediVault");

        // Deploy factory (using dummy addresses for stablecoin and priceFeed)
        factory = await viem.deployContract("MediVaultFactory", [
            vaultImpl.address,
            registryProxy.address,
            admin.account.address, // dummy stablecoin
            admin.account.address, // dummy priceFeed
            admin.account.address,
        ]);
    });

    it("should allow a user to create a vault", async () => {
        const vaultAddress = await factory.read.vaultOf([user1.account.address]);
        assert.equal(vaultAddress, "0x0000000000000000000000000000000000000000");

        await factory.write.createVault({ account: user1.account });

        const newVaultAddress = await factory.read.vaultOf([user1.account.address]);
        assert.notEqual(newVaultAddress, "0x0000000000000000000000000000000000000000");

        const allVaults = await factory.read.totalVaults();
        assert.equal(allVaults, 1n);
    });

    it("should prevent duplicate vault creation", async () => {
        await assert.rejects(
            factory.write.createVault({ account: user1.account }),
            "/VaultAlreadyExists/"
        );
    });

    it("should allow multiple users to create vaults", async () => {
        await factory.write.createVault({ account: user2.account });

        const user2Vault = await factory.read.vaultOf([user2.account.address]);
        assert.notEqual(user2Vault, "0x0000000000000000000000000000000000000000");
        assert.notEqual(user2Vault, await factory.read.vaultOf([user1.account.address]));

        const allVaults = await factory.read.totalVaults();
        assert.equal(allVaults, 2n);
    });

    it("should return correct implementation address", async () => {
        const impl = await factory.read.implementation();
        assert.equal(impl.toLowerCase(), vaultImpl.address.toLowerCase());
    });

    it("should return correct registry address", async () => {
        const reg = await factory.read.registry();
        assert.equal(reg.toLowerCase(), registryProxy.address.toLowerCase());
    });
});
