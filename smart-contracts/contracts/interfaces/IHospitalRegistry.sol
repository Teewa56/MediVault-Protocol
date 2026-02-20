// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHospitalRegistry {
    struct Hospital {
        string name;
        string country;
        bool verified;
        uint256 registeredAt;
        uint256 verifiedAt;
    }

    event HospitalRegistered(address indexed hospital, string name, string country);
    event HospitalVerified(address indexed hospital);
    event HospitalRevoked(address indexed hospital);

    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyVerified();
    error NotVerified();
    error ZeroAddress();
    error EmptyString();
    error InvalidSignature();

    function initialize(address admin_) external;

    function registerHospital(string calldata name, string calldata country) external;

    function verifyHospital(address hospital) external;

    function revokeHospital(address hospital) external;

    function isVerified(address hospital) external view returns (bool);

    function getHospital(address hospital) external view returns (Hospital memory);

    function verifySignature(
        address hospital,
        uint256 amount,
        address vault,
        bytes calldata signature
    ) external view returns (bool);
}
