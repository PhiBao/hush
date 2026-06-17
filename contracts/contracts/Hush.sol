// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfidentialToken} from "./IConfidentialToken.sol";

/// @title Hush — Confidential creator subscriptions on Zama fhEVM.
/// @notice Subscribers pay creators in encrypted confidential tokens (ERC-7984).
///         Only the creator can decrypt their aggregate earnings. Individual
///         supporter amounts are never decryptable by anyone — not even Hush.
contract Hush is ZamaEthereumConfig {
    struct Creator {
        string name;
        string bio;
        bool registered;
    }

    struct Tier {
        string name;
        uint256 price;
        uint256 durationSecs;
        string description;
        bool active;
    }

    IConfidentialToken public immutable paymentToken;

    mapping(address => Creator) public creators;
    mapping(address => Tier[]) public creatorTiers;
    mapping(address => mapping(address => uint256)) public subscriptionExpiry;
    mapping(address => mapping(address => uint256)) public subscriptionTier;

    /// @dev FHE-computed aggregate earnings per creator (the "proof" that the
    ///      contract sums encrypted payments on ciphertext). The creator's
    ///      confidential token balance is the real money; this handle is the
    ///      verifiable onchain sum computed via FHE.add — they must match.
    mapping(address => euint64) private _creatorEarnings;

    uint256 public totalCreators;
    uint256 public totalSubscriptions;
    mapping(address => uint256) public activeSubscriberCount;

    event CreatorRegistered(address indexed creator, string name);
    event TierAdded(address indexed creator, uint256 tierIndex, string name, uint256 price);
    event Subscribed(
        address indexed creator,
        address indexed subscriber,
        uint256 tierIndex,
        uint256 expiry
    );
    event EarningsUpdated(address indexed creator);

    constructor(address paymentToken_) {
        require(paymentToken_ != address(0), "Invalid token");
        paymentToken = IConfidentialToken(paymentToken_);
    }

    modifier onlyRegistered() {
        require(creators[msg.sender].registered, "Not registered");
        _;
    }

    function registerCreator(string calldata name, string calldata bio) external {
        require(!creators[msg.sender].registered, "Already registered");
        require(bytes(name).length > 0, "Empty name");
        creators[msg.sender] = Creator({name: name, bio: bio, registered: true});
        totalCreators++;
        emit CreatorRegistered(msg.sender, name);
    }

    function updateCreator(string calldata name, string calldata bio) external onlyRegistered {
        creators[msg.sender].name = name;
        creators[msg.sender].bio = bio;
    }

    function addTier(
        string calldata name,
        uint256 price,
        uint256 durationSecs,
        string calldata description
    ) external onlyRegistered {
        require(price > 0, "Price must be greater than 0");
        require(durationSecs > 0, "Duration must be greater than 0");
        require(creatorTiers[msg.sender].length < 10, "Too many tiers");

        creatorTiers[msg.sender].push(
            Tier({name: name, price: price, durationSecs: durationSecs, description: description, active: true})
        );
        emit TierAdded(msg.sender, creatorTiers[msg.sender].length - 1, name, price);
    }

    function removeTier(uint256 tierIndex) external onlyRegistered {
        require(tierIndex < creatorTiers[msg.sender].length, "Invalid tier");
        creatorTiers[msg.sender][tierIndex].active = false;
    }

    /// @notice Subscribe (or renew) to a creator by paying an encrypted amount of
    ///         the confidential payment token. The contract pulls the encrypted
    ///         tokens from the subscriber (who must have approved Hush via
    ///         `setOperator`) and homomorphically adds the amount to the creator's
    ///         encrypted earnings aggregate.
    /// @dev The encrypted input must be bound to THIS contract address. Hush
    ///      resolves it once via `FHE.fromExternal`, grants the token contract
    ///      ACL access to the resulting handle, then pulls the tokens. The amount
    ///      stays encrypted the entire time.
    function subscribe(
        address creator,
        uint256 tierIndex,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        require(creators[creator].registered, "Creator not registered");
        require(tierIndex < creatorTiers[creator].length, "Invalid tier");
        require(creatorTiers[creator][tierIndex].active, "Tier not active");
        require(msg.sender != creator, "Cannot subscribe to yourself");

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Grant the token contract ACL access so it can use this handle in FHE.sub.
        FHE.allow(amount, address(paymentToken));

        // Atomic encrypted payment: pull confidential tokens from subscriber to creator.
        paymentToken.confidentialTransferFrom(msg.sender, creator, amount);

        // Hush's own FHE computation: homomorphically accumulate encrypted earnings.
        _creatorEarnings[creator] = FHE.add(_creatorEarnings[creator], amount);
        FHE.allowThis(_creatorEarnings[creator]);
        FHE.allow(_creatorEarnings[creator], creator);

        uint256 expiry = block.timestamp + creatorTiers[creator][tierIndex].durationSecs;
        bool isRenewal = subscriptionExpiry[creator][msg.sender] > block.timestamp;
        subscriptionExpiry[creator][msg.sender] = expiry;
        subscriptionTier[creator][msg.sender] = tierIndex;
        if (!isRenewal) {
            totalSubscriptions++;
            activeSubscriberCount[creator]++;
        }

        emit Subscribed(creator, msg.sender, tierIndex, expiry);
        emit EarningsUpdated(creator);
    }

    function isSubscribed(address creator, address subscriber) public view returns (bool) {
        return subscriptionExpiry[creator][subscriber] > block.timestamp;
    }

    function getSubscriptionTier(address creator, address subscriber) external view returns (uint256) {
        require(subscriptionExpiry[creator][subscriber] > block.timestamp, "Subscription expired or not found");
        return subscriptionTier[creator][subscriber];
    }

    /// @notice Returns the encrypted aggregate earnings handle. Only `creator`
    ///         can decrypt it (onchain ACL). This is the FHE-computed sum of all
    ///         encrypted payments — it must equal the creator's confidential token
    ///         balance, proving the math was done on ciphertext.
    function getCreatorEarnings(address creator) external view returns (euint64) {
        require(creators[creator].registered, "Creator not registered");
        return _creatorEarnings[creator];
    }

    function getTiers(address creator) external view returns (Tier[] memory) {
        return creatorTiers[creator];
    }

    function getTierCount(address creator) external view returns (uint256) {
        return creatorTiers[creator].length;
    }

    function getActiveTierCount(address creator) external view returns (uint256) {
        uint256 count = 0;
        Tier[] storage tiers = creatorTiers[creator];
        for (uint256 i = 0; i < tiers.length; i++) {
            if (tiers[i].active) {
                count++;
            }
        }
        return count;
    }
}
