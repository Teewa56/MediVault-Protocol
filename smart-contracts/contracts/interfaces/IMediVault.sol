// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMediVault {
    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);
    event EmergencyPayment(address indexed hospital, uint256 amount, uint256 timestamp);
    event BiometricCommitmentSet(bytes32 commitment);
    event EmergencyConfigSet(uint256 cap, uint256 cooldown);
    event HospitalAuthorized(address indexed hospital);
    event HospitalRevoked(address indexed hospital);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event UpgradeRequested(address indexed newImplementation, uint256 executeAfter);
    event UpgradeExecuted(address indexed oldImplementation, address indexed newImplementation);

    error NotOwner();
    error NotAuthorizedHospital();
    error BiometricMismatch();
    error ExceedsEmergencyCap();
    error CooldownNotElapsed();
    error InvalidAmount();
    error InvalidCommitment();
    error InvalidSignature();
    error AlreadyAuthorized();
    error NotAuthorized();
    error ZeroAddress();
    error TransferFailed();

    function initialize(
        address owner_,
        address stablecoin_,
        address registry_
    ) external;

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount, address to) external;

    function requestPayment(
        uint256 amount,
        bytes32 biometricHash,
        bytes calldata signature
    ) external;

    function setBiometricCommitment(bytes32 commitment) external;

    function setEmergencyConfig(uint256 cap, uint256 cooldown) external;

    function authorizeHospital(address hospital) external;

    function revokeHospital(address hospital) external;

    function addGuardian(address guardian) external;

    function removeGuardian(address guardian) external;

    function owner() external view returns (address);

    function stablecoin() external view returns (address);

    function registry() external view returns (address);

    function biometricCommitment() external view returns (bytes32);

    function emergencyCap() external view returns (uint256);

    function cooldownPeriod() external view returns (uint256);

    function lastWithdrawalTimestamp() external view returns (uint256);

    function isHospitalAuthorized(address hospital) external view returns (bool);

    function getGuardians() external view returns (address[] memory);

    function getBalance() external view returns (uint256);
}
