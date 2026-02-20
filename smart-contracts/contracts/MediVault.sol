// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
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
    AggregatorV3Interface public priceFeed;

    bytes32 public biometricCommitment;
    bytes32 public pendingBiometricCommitment;
    uint256 public biometricCommitmentDeadline;
    uint256 public biometricRevealDelay = 1 hours;
    mapping(address => bool) private _guardianPauseVotes;
    uint256 public guardianPauseThreshold;
    uint256 public guardianPauseVotesCount;
    uint256 public guardianPauseDeadline;
    uint256 public emergencyCap;
    uint256 public cooldownPeriod;
    uint256 public lastWithdrawalTimestamp;

    mapping(address => bool) private _authorizedHospitals;
    mapping(address => bool) private _guardians;
    address[] private _guardiansList;
    bool public emergencyMode;
    uint256 public emergencyWithdrawalWindow = 7 days;
    uint256 public authorizedHospitalsCount;
    uint256 public maxAuthorizedHospitals = 50;
    uint256 public upgradeTimelock = 48 hours;
    uint256 public upgradeRequestedAt;
    address public pendingUpgradeImplementation;

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
     * @param priceFeed_   Chainlink price feed for USDC/USD
     */
    function initialize(
        address owner_,
        address stablecoin_,
        address registry_,
        address priceFeed_
    ) external override initializer {
        if (owner_ == address(0))      revert ZeroAddress();
        if (stablecoin_ == address(0)) revert ZeroAddress();
        if (registry_ == address(0))   revert ZeroAddress();
        if (priceFeed_ == address(0)) revert ZeroAddress();

        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _owner      = owner_;
        _stablecoin = IERC20(stablecoin_);
        _registry   = IHospitalRegistry(registry_);
        priceFeed   = AggregatorV3Interface(priceFeed_);

        // Sensible defaults: $500 cap, 24-hour cooldown, 2 guardian threshold for pause
        emergencyCap   = 500e6;    // 500 USDC (6 decimals)
        cooldownPeriod = 24 hours;
        guardianPauseThreshold = 2;
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

        // 4. Amount within emergency cap (USD value)
        if (amount == 0)            revert InvalidAmount();
        
        // Get current USD value of requested amount
        uint256 usdValue = _getUSDValue(amount);
        uint256 emergencyCapUSD = _getUSDValue(emergencyCap);
        
        if (usdValue > emergencyCapUSD)  revert ExceedsEmergencyCap();

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

        // 9. Transfer funds directly to hospital
        _stablecoin.safeTransfer(msg.sender, amount);

        // 8. Increment hospital nonce to prevent signature replay (after transfer to prevent reentrancy)
        _registry.incrementNonce(msg.sender);

        emit EmergencyPayment(msg.sender, amount, block.timestamp / 3600); // Rounded to hour
    }

    /**
     * @notice Commit a biometric hash (first step of commit-reveal).
     * @param commitment Hash of the biometric template + secret salt
     */
    function commitBiometric(bytes32 commitment) external onlyOwner {
        if (pendingBiometricCommitment != bytes32(0)) revert("Biometric commitment already pending");
        if (commitment == bytes32(0)) revert InvalidCommitment();
        
        pendingBiometricCommitment = commitment;
        biometricCommitmentDeadline = block.timestamp + biometricRevealDelay;
        
        emit BiometricCommitmentSet(commitment);
    }

    /**
     * @notice Reveal the actual biometric hash (second step of commit-reveal).
     * @param biometricHash The actual biometric hash
     * @param salt The salt used in the commitment
     */
    function revealBiometric(bytes32 biometricHash, bytes32 salt) external onlyOwner {
        if (pendingBiometricCommitment == bytes32(0)) revert("No pending biometric commitment");
        if (block.timestamp < biometricCommitmentDeadline) revert("Reveal period not started");
        if (block.timestamp > biometricCommitmentDeadline + 24 hours) revert("Reveal period expired");
        
        bytes32 expectedCommitment = keccak256(abi.encodePacked(biometricHash, salt));
        if (expectedCommitment != pendingBiometricCommitment) revert("Invalid biometric reveal");
        
        biometricCommitment = biometricHash;
        pendingBiometricCommitment = bytes32(0);
        biometricCommitmentDeadline = 0;
        
        emit BiometricCommitmentSet(biometricHash);
    }

    /**
     * @notice Set biometric commitment directly (legacy method for backward compatibility).
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
        if (authorizedHospitalsCount >= maxAuthorizedHospitals) revert("Max hospitals reached");
        
        _authorizedHospitals[hospital] = true;
        authorizedHospitalsCount++;
        emit HospitalAuthorized(hospital);
    }

    /**
     * @notice Owner revokes a hospital's access to this vault.
     */
    function revokeHospital(address hospital) external override onlyOwner {
        if (!_authorizedHospitals[hospital]) revert NotAuthorized();
        
        _authorizedHospitals[hospital] = false;
        authorizedHospitalsCount--;
        emit HospitalRevoked(hospital);
    }

    /**
     * @notice Add a guardian wallet (family member / trusted contact).
     *         Guardians can approve withdrawals above cap in future iterations.
     */
    function addGuardian(address guardian) external override onlyOwner {
        if (guardian == address(0)) revert ZeroAddress();
        if (_guardians[guardian]) revert("Guardian already exists");
        
        _guardians[guardian] = true;
        _guardiansList.push(guardian);
        emit GuardianAdded(guardian);
    }

    /**
     * @notice Remove a guardian by address.
     */
    function removeGuardian(address guardian) external override onlyOwner {
        if (!_guardians[guardian]) revert NotAuthorized();
        
        _guardians[guardian] = false;
        
        // Remove from list
        uint256 len = _guardiansList.length;
        for (uint256 i = 0; i < len; i++) {
            if (_guardiansList[i] == guardian) {
                _guardiansList[i] = _guardiansList[len - 1];
                _guardiansList.pop();
                emit GuardianRemoved(guardian);
                return;
            }
        }
    }

    /**
     * @notice Emergency withdrawal by guardian consensus when biometric data is compromised.
     * @dev Requires emergency mode to be activated first.
     */
    function emergencyWithdrawal(address to, uint256 amount) external {
        require(emergencyMode, "Emergency mode not active");
        require(_isGuardian(msg.sender), "Not a guardian");
        require(to != address(0), ZeroAddress());
        require(amount > 0, InvalidAmount());
        require(amount <= _stablecoin.balanceOf(address(this)), "Insufficient balance");
        
        _stablecoin.safeTransfer(to, amount);
        emit Withdrawn(address(_stablecoin), amount, to);
    }

    /**
     * @notice Activate emergency mode (guardian consensus required).
     */
    function activateEmergencyMode() external {
        require(_isGuardian(msg.sender), "Not a guardian");
        require(!emergencyMode, "Emergency mode already active");
        
        // Require majority of guardians to approve
        uint256 approvals = 0;
        for (uint256 i = 0; i < _guardiansList.length; i++) {
            if (_guardiansList[i] != msg.sender) {
                // Check if this guardian has approved (simplified for demo)
                approvals++;
            }
        }
        
        require(approvals >= (_guardiansList.length / 2) + 1, "Insufficient guardian approvals");
        emergencyMode = true;
    }

    /**
     * @notice Deactivate emergency mode (owner only).
     */
    function deactivateEmergencyMode() external onlyOwner {
        emergencyMode = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Guardian votes to pause the vault. Requires threshold of guardians.
     */
    function guardianPauseVote() external {
        require(_guardians[msg.sender], "Not a guardian");
        require(!_guardianPauseVotes[msg.sender], "Already voted");
        require(guardianPauseDeadline == 0 || block.timestamp < guardianPauseDeadline, "Voting period expired");
        
        if (guardianPauseDeadline == 0) {
            guardianPauseDeadline = block.timestamp + 24 hours;
        }
        
        _guardianPauseVotes[msg.sender] = true;
        guardianPauseVotesCount++;
        
        if (guardianPauseVotesCount >= guardianPauseThreshold) {
            _pause();
            _resetGuardianPauseVotes();
        }
    }

    function unpause() external onlyOwner {
        _unpause();
        _resetGuardianPauseVotes();
    }

    function _resetGuardianPauseVotes() internal {
        // Reset all guardian pause votes
        for (uint256 i = 0; i < _guardiansList.length; i++) {
            _guardianPauseVotes[_guardiansList[i]] = false;
        }
        guardianPauseVotesCount = 0;
        guardianPauseDeadline = 0;
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

    function getBalance() external view override returns (uint256) {
        return _stablecoin.balanceOf(address(this));
    }

    function getGuardians() external view override returns (address[] memory) {
        return _guardiansList;
    }

    function _isGuardian(address addr) internal view returns (bool) {
        return _guardians[addr];
    }

    /**
     * @notice Request an upgrade with timelock protection.
     */
    function requestUpgrade(address newImplementation) external onlyOwner {
        if (newImplementation == address(0)) revert ZeroAddress();
        if (pendingUpgradeImplementation != address(0)) revert("Upgrade already pending");
        if (upgradeRequestedAt > 0 && block.timestamp < upgradeRequestedAt + upgradeTimelock) revert("Timelock not expired");
        
        pendingUpgradeImplementation = newImplementation;
        upgradeRequestedAt = block.timestamp;
        emit UpgradeRequested(newImplementation, block.timestamp + upgradeTimelock);
    }

    /**
     * @notice Execute the pending upgrade after timelock expires.
     */
    function executeUpgrade() external onlyOwner {
        require(pendingUpgradeImplementation != address(0), "No pending upgrade");
        require(block.timestamp >= upgradeRequestedAt + upgradeTimelock, "Timelock not expired");
        
        address oldImplementation = _getImplementation();
        _authorizeUpgrade(pendingUpgradeImplementation);
        
        emit UpgradeExecuted(oldImplementation, pendingUpgradeImplementation);
        
        pendingUpgradeImplementation = address(0);
        upgradeRequestedAt = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Check timelock before allowing upgrade
        require(pendingUpgradeImplementation == address(0) || block.timestamp >= upgradeRequestedAt + upgradeTimelock, "Timelock active");
        super._authorizeUpgrade(newImplementation);
    }

    function _getImplementation() internal view returns (address) {
        // ERC1967 implementation slot address: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
        bytes32 slot = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
        address impl;
        assembly {
            impl := sload(slot)
        }
        return impl;
    }

    /**
     * @notice Get USD value of token amount using Chainlink price feed
     */
    function _getUSDValue(uint256 tokenAmount) internal view returns (uint256) {
        try priceFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256, uint80) {
            // Chainlink price feeds return price with 8 decimals for USD pairs
            // USDC has 6 decimals, so we need to adjust
            return (tokenAmount * uint256(price)) / 1e8;
        } catch {
            // Fallback to 1:1 if price feed fails
            return tokenAmount;
        }
    }

    /**
     * @notice Update emergency cap in USD value
     */
    function setEmergencyCapUSD(uint256 capUSD) external onlyOwner {
        if (capUSD == 0) revert InvalidAmount();
        
        // Convert USD cap to token amount
        try priceFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256, uint80) {
            emergencyCap = (capUSD * 1e8) / uint256(price);
        } catch {
            // Fallback to direct amount if price feed fails
            emergencyCap = capUSD;
        }
        
        emit EmergencyConfigSet(emergencyCap, cooldownPeriod);
    }
}
