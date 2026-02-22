// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/mocks/MockV3Aggregator.sol";

/**
 * @title MockUSDCPriceFeed
 * @notice Mock Chainlink USDC/USD price feed returning $1.00 (1e8)
 * @dev Use for testnets where Chainlink feeds are not available
 */
contract MockUSDCPriceFeed is MockV3Aggregator {
    constructor() MockV3Aggregator(8, 100_000_000) {}
}
