import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";
import { encodeFunctionData } from "viem";

describe("HospitalRegistry", async () => {
    const { viem } = await network.connect();
    const [admin, hospital1, hospital2, stranger] = await viem.getWalletClients();

    let registryImpl: any;
    let registry: any; // proxy
    let proxy: any;

    before(async () => {
        // Deploy implementation
        registryImpl = await viem.deployContract("HospitalRegistry");

        // Deploy proxy using viem's built-in proxy deployment
        const initData = encodeFunctionData({
            abi: registryImpl.abi,
            functionName: "initialize",
            args: [admin.account.address],
        });
        
        // Deploy ERC1967Proxy directly - it should be available through OpenZeppelin
        proxy = await viem.deployContract("TestERC1967Proxy", [
            registryImpl.address,
            initData,
        ]);

        // Attach registry ABI to proxy address
        registry = await viem.getContractAt("HospitalRegistry", proxy.address);
    });

    it("should allow a hospital to self-register", async () => {
        await registry.write.registerHospital(["City Medical Center", "PH"], {
        account: hospital1.account,
        });

        const h = await registry.read.getHospital([hospital1.account.address]);
        assert.equal(h.name, "City Medical Center");
        assert.equal(h.country, "PH");
        assert.equal(h.verified, false);
    });

    it("should revert on duplicate registration", async () => {
        await assert.rejects(
        registry.write.registerHospital(["City Medical Center", "PH"], {
            account: hospital1.account,
        }),
        "/AlreadyRegistered/"
        );
    });

    it("should revert registration with empty name", async () => {
        await assert.rejects(
        registry.write.registerHospital(["", "PH"], {
            account: hospital2.account,
        }),
        "/EmptyString/"
        );
    });

    it("admin should verify a registered hospital", async () => {
        await registry.write.verifyHospital([hospital1.account.address], {
        account: admin.account,
        });

        assert.equal(
        await registry.read.isVerified([hospital1.account.address]),
        true
        );
    });

    it("non-admin should not be able to verify", async () => {
        await registry.write.registerHospital(["General Hospital", "VN"], {
        account: hospital2.account,
        });

        await assert.rejects(
        registry.write.verifyHospital([hospital2.account.address], {
            account: stranger.account,
        }),
        "AccessControl"
        );
    });

    it("admin should revoke a verified hospital", async () => {
        await registry.write.revokeHospital([hospital1.account.address], {
        account: admin.account,
        });

        assert.equal(
        await registry.read.isVerified([hospital1.account.address]),
        false
        );
    });

    it("should revert revoking an unverified hospital", async () => {
        await assert.rejects(
        registry.write.revokeHospital([hospital1.account.address], {
            account: admin.account,
        }),
        "NotVerified"
        );
    });
});