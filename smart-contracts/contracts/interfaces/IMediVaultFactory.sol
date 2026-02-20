// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMediVaultFactory
 * @notice Interface for the MediVault factory contract.
 */
interface IMediVaultFactory {
    function isDeployedVault(address addr) external view returns (bool);
    function implementation() external view returns (address);
    function registry() external view returns (address);
    function stablecoin() external view returns (address);
}
