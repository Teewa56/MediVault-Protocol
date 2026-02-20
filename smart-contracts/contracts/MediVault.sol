// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IMediVault.sol";
import "./interfaces/IHospitalRegistry.sol";

/**
 * @title MediVault
 * @notice Per-user emergency medical payment vault. Holds stablecoins, stores a
 *         biometric commitment, and allows verified hospitals to trigger instant
 *         payments up to a user-configured cap.
 * @dev Deployed as a UUPS proxy by MediVaultFactory. Each user gets their own
 *      proxy instance pointing to a shared implementation. All critical state
 *      changes are owner-only. Payment requests go through the HospitalRegistry
 *      for credential verification and EIP-712 signature validation.
 */
contract MediVault is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    IMediVault
{
    using SafeERC20 for IERC20;

    address private _owner;
    IERC20 private _stablecoin;
    IHospitalRegistry private _registry;

    bytes32 public biometricCommitment;
    uint256 public emergencyCap;
    uint256 public cooldownPeriod;
    uint256 public lastWithdrawalTimestamp;

    mapping(address => bool) private _authorizedHospitals;
    address[] private _guardians;

    // Storage gap — 50 slots for future upgrades
    uint256[45] private __gap;

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    modifier onlyOwnerOrGuardian() {
        if (msg.sender != _owner && !_isGuardian(msg.sender)) revert NotOwner();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param owner_      Vault owner (the patient/user)
     * @param stablecoin_ ERC-20 stablecoin address (USDC)
     * @param registry_   HospitalRegistry contract address
     */
    function initialize(
        address owner_,
        address stablecoin_,
        address registry_
    ) external override initializer {
        if (owner_ == address(0))      revert ZeroAddress();
        if (stablecoin_ == address(0)) revert ZeroAddress();
        if (registry_ == address(0))   revert ZeroAddress();

        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _owner      = owner_;
        _stablecoin = IERC20(stablecoin_);
        _registry   = IHospitalRegistry(registry_);

        // Sensible defaults: $500 cap, 24-hour cooldown
        emergencyCap   = 500e6;    // 500 USDC (6 decimals)
        cooldownPeriod = 24 hours;
    }

    /**
     * @notice Deposit stablecoins into the vault.
     * @dev Caller must approve this contract for `amount` before calling.
     */
    function deposit(uint256 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        _stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(address(_stablecoin), amount);
    }

    /**
     * @notice Owner withdraws funds from the vault (non-emergency).
     */
    function withdraw(uint256 amount, address to) external override onlyOwner nonReentrant {
        if (amount == 0)       revert InvalidAmount();
        if (to == address(0))  revert ZeroAddress();
        _stablecoin.safeTransfer(to, amount);
        emit Withdrawn(address(_stablecoin), amount, to);
    }

    /**
     * @notice Called by a verified hospital terminal during a patient emergency.
     *         Verifies hospital credentials, biometric match, cap, and cooldown
     *         before releasing funds directly to the hospital.
     *
     * @param amount        Amount of stablecoin requested
     * @param biometricHash keccak256 hash of patient biometric template (generated
     *                      client-side by the hospital terminal via WebAuthn)
     * @param signature     EIP-712 signed PaymentRequest: packed as
     *                      (deadline[32] ++ nonce[32] ++ ecdsaSig[65])
     */
    function requestPayment(
        uint256 amount,
        bytes32 biometricHash,
        bytes calldata signature
    ) external override nonReentrant whenNotPaused {
        // 1. Hospital must be globally verified in the registry
        if (!_registry.isVerified(msg.sender)) revert NotAuthorizedHospital();

        // 2. Hospital must also be explicitly authorized by this vault's owner
        if (!_authorizedHospitals[msg.sender]) revert NotAuthorizedHospital();

        // 3. Biometric hash must match the on-chain commitment
        if (biometricCommitment == bytes32(0))         revert InvalidCommitment();
        if (biometricHash != biometricCommitment)      revert BiometricMismatch();

        // 4. Amount within emergency cap
        if (amount == 0)            revert InvalidAmount();
        if (amount > emergencyCap)  revert ExceedsEmergencyCap();

        // 5. Cooldown check
        if (
            lastWithdrawalTimestamp != 0 &&
            block.timestamp < lastWithdrawalTimestamp + cooldownPeriod
        ) revert CooldownNotElapsed();

        // 6. Verify EIP-712 signature from the hospital wallet
        bool validSig = _registry.verifySignature(
            msg.sender,
            amount,
            address(this),
            signature
        );
        if (!validSig) revert InvalidSignature();

        // 7. Update state before transfer (CEI pattern)
        lastWithdrawalTimestamp = block.timestamp;

        // 8. Increment hospital nonce to prevent signature replay
        _registry.incrementNonce(msg.sender);

        // 9. Transfer funds directly to hospital
        _stablecoin.safeTransfer(msg.sender, amount);

        emit EmergencyPayment(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Set biometric commitment. Called once by owner after WebAuthn
     *         credential generation on the frontend.
     * @param commitment keccak256 hash of the biometric template
     */
    function setBiometricCommitment(bytes32 commitment) external override onlyOwner {
        if (commitment == bytes32(0)) revert InvalidCommitment();
        biometricCommitment = commitment;
        emit BiometricCommitmentSet(commitment);
    }

    /**
     * @notice Configure emergency cap and cooldown period.
     * @param cap      Max USDC per single hospital withdrawal (in token units)
     * @param cooldown Minimum seconds between hospital withdrawals
     */
    function setEmergencyConfig(
        uint256 cap,
        uint256 cooldown
    ) external override onlyOwner {
        if (cap == 0) revert InvalidAmount();
        emergencyCap   = cap;
        cooldownPeriod = cooldown;
        emit EmergencyConfigSet(cap, cooldown);
    }

    /**
     * @notice Owner authorizes a specific verified hospital to access this vault.
     */
    function authorizeHospital(address hospital) external override onlyOwner {
        if (hospital == address(0))          revert ZeroAddress();
        if (_authorizedHospitals[hospital])  revert AlreadyAuthorized();
        _authorizedHospitals[hospital] = true;
        emit HospitalAuthorized(hospital);
    }

    /**
     * @notice Owner revokes a hospital's access to this vault.
     */
    function revokeHospital(address hospital) external override onlyOwner {
        if (!_authorizedHospitals[hospital]) revert NotAuthorized();
        _authorizedHospitals[hospital] = false;
        emit HospitalRevoked(hospital);
    }

    /**
     * @notice Add a guardian wallet (family member / trusted contact).
     *         Guardians can approve withdrawals above cap in future iterations.
     */
    function addGuardian(address guardian) external override onlyOwner {
        if (guardian == address(0)) revert ZeroAddress();
        _guardians.push(guardian);
        emit GuardianAdded(guardian);
    }

    /**
     * @notice Remove a guardian by address.
     */
    function removeGuardian(address guardian) external override onlyOwner {
        uint256 len = _guardians.length;
        for (uint256 i = 0; i < len; i++) {
            if (_guardians[i] == guardian) {
                _guardians[i] = _guardians[len - 1];
                _guardians.pop();
                emit GuardianRemoved(guardian);
                return;
            }
        }
        revert NotAuthorized();
    }

    function pause() external onlyOwnerOrGuardian {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function owner() external view override returns (address) {
        return _owner;
    }

    function stablecoin() external view override returns (address) {
        return address(_stablecoin);
    }

    function registry() external view override returns (address) {
        return address(_registry);
    }

    function isHospitalAuthorized(address hospital) external view override returns (bool) {
        return _authorizedHospitals[hospital];
    }

    function getGuardians() external view override returns (address[] memory) {
        return _guardians;
    }

    function getBalance() external view override returns (uint256) {
        return _stablecoin.balanceOf(address(this));
    }

    function _isGuardian(address addr) internal view returns (bool) {
        uint256 len = _guardians.length;
        for (uint256 i = 0; i < len; i++) {
            if (_guardians[i] == addr) return true;
        }
        return false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
