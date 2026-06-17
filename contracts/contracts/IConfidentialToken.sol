// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

/// @dev Minimal ERC-7984 confidential-token interface used by Hush.
///      On Sepolia this is implemented by the Zama cUSDT (Mock) token.
interface IConfidentialToken {
    function confidentialBalanceOf(address account) external view returns (euint64);

    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64);

    function confidentialTransferFrom(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint64);

    function confidentialTransfer(address to, euint64 amount) external returns (euint64);

    function confidentialTransfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64);

    function setOperator(address operator, uint48 until) external;

    function isOperator(address holder, address spender) external view returns (bool);

    function underlying() external view returns (address);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}
