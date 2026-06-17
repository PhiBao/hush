// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @dev Minimal ERC-7984-style confidential token for Hardhat mock tests.
///      Mirrors the subset of the real Zama cUSDT ABI that Hush relies on.
contract MockConfidentialToken is ZamaEthereumConfig {
    string public name;
    string public symbol;
    uint8 public decimals;
    address public underlying;

    mapping(address => euint64) private _confBalances;
    mapping(address => mapping(address => bool)) private _operators;

    constructor(string memory name_, string memory symbol_, uint8 decimals_, address underlying_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        underlying = underlying_;
    }

    /// @dev Mint encrypted tokens to `to` (test helper / faucet).
    function mintEncrypted(address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amt = FHE.fromExternal(encryptedAmount, inputProof);
        _confBalances[to] = FHE.add(_confBalances[to], amt);
        _allow(_confBalances[to], to);
    }

    function confidentialBalanceOf(address account) external view returns (euint64) {
        return _confBalances[account];
    }

    function setOperator(address operator, uint48 until) external {
        _operators[msg.sender][operator] = until > 0;
    }

    function isOperator(address holder, address spender) external view returns (bool) {
        return _operators[holder][spender];
    }

    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64) {
        require(_operators[from][msg.sender], "Not operator");
        _confBalances[from] = FHE.sub(_confBalances[from], amount);
        _confBalances[to] = FHE.add(_confBalances[to], amount);
        _allow(_confBalances[from], from);
        _allow(_confBalances[to], to);
        return amount;
    }

    function confidentialTransferFrom(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint64) {
        require(_operators[from][msg.sender], "Not operator");
        euint64 amt = FHE.fromExternal(encryptedAmount, inputProof);
        _confBalances[from] = FHE.sub(_confBalances[from], amt);
        _confBalances[to] = FHE.add(_confBalances[to], amt);
        _allow(_confBalances[from], from);
        _allow(_confBalances[to], to);
        return amt;
    }

    function confidentialTransfer(address to, euint64 amount) external returns (euint64) {
        _confBalances[msg.sender] = FHE.sub(_confBalances[msg.sender], amount);
        _confBalances[to] = FHE.add(_confBalances[to], amount);
        _allow(_confBalances[msg.sender], msg.sender);
        _allow(_confBalances[to], to);
        return amount;
    }

    function confidentialTransfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64)
    {
        euint64 amt = FHE.fromExternal(encryptedAmount, inputProof);
        _confBalances[msg.sender] = FHE.sub(_confBalances[msg.sender], amt);
        _confBalances[to] = FHE.add(_confBalances[to], amt);
        _allow(_confBalances[msg.sender], msg.sender);
        _allow(_confBalances[to], to);
        return amt;
    }

    function _allow(euint64 value, address account) internal {
        FHE.allowThis(value);
        FHE.allow(value, account);
    }
}
