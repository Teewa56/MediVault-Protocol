// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MediVault.sol";
import "./interfaces/IMediVault.sol";

/**
 * @title MediVaultFactory
 * @notice Deploys and tracks individual MediVault proxy instances for each user.
 *         One user → one vault. Uses ERC1967Proxy pointing to a shared
 *         MediVault implementation contract to minimize deployment gas.
 * @dev Not upgradeable itself — it's a simple stateless factory. The vault
 *      implementation it points to can be upgraded independently.
 */
contract MediVaultFactory is Ownable {
    event VaultCreated(address indexed user, address indexed vault);
    event ImplementationUpdated(address indexed newImplementation);

    error VaultAlreadyExists();
    error ZeroAddress();

    /// @notice Shared MediVault logic contract
    address public implementation;

    /// @notice HospitalRegistry address passed to every new vault
    address public immutable registry;

    /// @notice Accepted stablecoin passed to every new vault (USDC)
    address public immutable stablecoin;

    /// @notice Chainlink price feed passed to every new vault
    address public immutable priceFeed;

    /// @notice user address → vault proxy address
    mapping(address => address) public vaultOf;

    /// @notice All deployed vault addresses (for enumeration)
    address[] public allVaults;

    /**
     * @param implementation_ Initial MediVault implementation contract
     * @param registry_       HospitalRegistry contract address
     * @param stablecoin_     Stablecoin address (USDC)
     * @param priceFeed_     Chainlink price feed address
     * @param admin_          Factory owner (multisig)
     */
    constructor(
        address implementation_,
        address registry_,
        address stablecoin_,
        address priceFeed_,
        address admin_
    ) {
        transferOwnership(admin_);
        if (implementation_ == address(0)) revert ZeroAddress();
        if (registry_ == address(0))       revert ZeroAddress();
        if (stablecoin_ == address(0))     revert ZeroAddress();
        if (priceFeed_ == address(0))      revert ZeroAddress();
        if (admin_ == address(0))          revert ZeroAddress();

        implementation = implementation_;
        registry       = registry_;
        stablecoin     = stablecoin_;
        priceFeed      = priceFeed_;
    }

    /**
     * @notice Deploy a new MediVault proxy for msg.sender.
     *         Reverts if the caller already has a vault.
     * @return vault Address of the newly deployed vault proxy
     */
    function createVault() external returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert VaultAlreadyExists();

        // Encode initialize call data
        bytes memory initData = abi.encodeCall(
            IMediVault.initialize,
            (msg.sender, stablecoin, registry, priceFeed)
        );

        // Deploy ERC1967 proxy pointing to shared implementation
        vault = address(new ERC1967Proxy(implementation, initData));

        vaultOf[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault);
    }

    /**
     * @notice Update the implementation address for future vault deployments.
     *         Does NOT affect already-deployed vaults (they manage their own upgrades).
     * @param newImplementation New MediVault logic contract
     */
    function setImplementation(address newImplementation) external onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
        implementation = newImplementation;
        emit ImplementationUpdated(newImplementation);
    }

    /**
     * @notice Returns total number of vaults deployed by the factory.
     */
    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    /**
     * @notice Check whether an address is a factory-deployed vault.
     *         Useful for access control in HospitalRegistry's incrementNonce.
     */
    function isDeployedVault(address addr) external view returns (bool) {
        uint256 len = allVaults.length;
        for (uint256 i = 0; i < len; i++) {
            if (allVaults[i] == addr) return true;
        }
        return false;
    }
}
