// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IHospitalRegistry.sol";
import "./interfaces/IMediVaultFactory.sol";

/**
 * @title HospitalRegistry
 * @notice Manages registration, verification, and EIP-712 signed credentials
 *         for medical institutions in the MediVault Protocol.
 * @dev Upgradeable via UUPS. Admin-controlled verification (multisig at launch,
 *      DAO in Phase 4). Hospitals self-register; admins verify.
 */
contract HospitalRegistry is
    Initializable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    UUPSUpgradeable,
    IHospitalRegistry
{
    using ECDSA for bytes32;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    bytes32 public constant PAYMENT_REQUEST_TYPEHASH = keccak256(
        "PaymentRequest(address hospital,uint256 amount,address vault,uint256 nonce,uint256 deadline)"
    );

    mapping(address => Hospital) private _hospitals;
    mapping(address => uint256) public nonces;

    IMediVaultFactory public factory;

    uint256[47] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param admin_ Initial admin address (should be multisig)
     */
    function initialize(address admin_) external initializer {
        if (admin_ == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __EIP712_init("MediVaultRegistry", "1");
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(VERIFIER_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
    }

    /**
     * @notice Set the MediVault factory address. Can only be called once.
     * @param factory_ Address of the deployed MediVaultFactory
     */
    function setFactory(address factory_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(factory) != address(0)) revert("Factory already set");
        if (factory_ == address(0)) revert ZeroAddress();
        factory = IMediVaultFactory(factory_);
    }

    /**
     * @notice Any hospital can register. Verification by admin is required before
     *         they can trigger vault payments.
     */
    function registerHospital(
        string calldata name,
        string calldata country
    ) external override {
        if (_hospitals[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert EmptyString();
        if (bytes(country).length == 0) revert EmptyString();

        _hospitals[msg.sender] = Hospital({
            name: name,
            country: country,
            verified: false,
            registeredAt: block.timestamp,
            verifiedAt: 0
        });

        emit HospitalRegistered(msg.sender, name, country);
    }

    /**
     * @notice Verifier role grants Hospital Access Token (HAT) status on-chain.
     */
    function verifyHospital(address hospital) external override onlyRole(VERIFIER_ROLE) {
        if (hospital == address(0)) revert ZeroAddress();
        Hospital storage h = _hospitals[hospital];
        if (h.registeredAt == 0) revert NotRegistered();
        if (h.verified) revert AlreadyVerified();

        h.verified = true;
        h.verifiedAt = block.timestamp;

        emit HospitalVerified(hospital);
    }

    /**
     * @notice Revoke a hospital's verified status.
     */
    function revokeHospital(address hospital) external override onlyRole(VERIFIER_ROLE) {
        Hospital storage h = _hospitals[hospital];
        if (h.registeredAt == 0) revert NotRegistered();
        if (!h.verified) revert NotVerified();

        h.verified = false;
        emit HospitalRevoked(hospital);
    }

    /**
     * @notice Verifies that a payment request signature was signed by the hospital
     *         itself, is within deadline, and the nonce is valid.
     * @param hospital  Hospital wallet address
     * @param amount    Requested payment amount
     * @param vault     Target MediVault address
     * @param signature EIP-712 signature from hospital wallet
     */
    function verifySignature(
        address hospital,
        uint256 amount,
        address vault,
        bytes calldata signature
    ) external view override returns (bool) {
        // Decode nonce and deadline from signature payload
        // Signature is over: hospital, amount, vault, nonce, deadline
        // The deadline and nonce are packed into the first 64 bytes before the sig
        // Convention: caller passes (deadline ++ nonce ++ sig) as signature param
        if (signature.length < 64) revert InvalidSignature();

        uint256 deadline = abi.decode(signature[0:32], (uint256));
        uint256 nonce    = abi.decode(signature[32:64], (uint256));
        bytes memory sig = signature[64:];

        if (block.timestamp > deadline) revert InvalidSignature();
        if (nonce != nonces[hospital]) revert InvalidSignature();

        bytes32 structHash = keccak256(abi.encode(
            PAYMENT_REQUEST_TYPEHASH,
            hospital,
            amount,
            vault,
            nonce,
            deadline
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(sig);

        return signer == hospital;
    }

    /**
     * @notice Increments hospital nonce — called by MediVault after a successful payment
     *         to invalidate the used signature and prevent replays.
     */
    function incrementNonce(address hospital) external {
        // Only callable by a factory-deployed vault
        require(factory.isDeployedVault(msg.sender), "Not a deployed vault");
        nonces[hospital]++;
    }

    function isVerified(address hospital) external view override returns (bool) {
        return _hospitals[hospital].verified;
    }

    function getHospital(address hospital) external view override returns (Hospital memory) {
        if (_hospitals[hospital].registeredAt == 0) revert NotRegistered();
        return _hospitals[hospital];
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
