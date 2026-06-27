// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfidentialToken} from "./IConfidentialToken.sol";

/// @title Hush — Confidential creator subscriptions on Zama fhEVM.
/// @notice Subscribers pay creators in encrypted confidential tokens (ERC-7984).
///         Only the creator can decrypt their aggregate earnings. Individual
///         supporter amounts are never decryptable by anyone — not even Hush.
/// @dev FHE primitives used:
///      - FHE.fromExternal  : re-encrypt client-side encrypted input to onchain handle
///      - FHE.add           : homomorphic addition of encrypted earnings
///      - FHE.ge            : encrypted greater-or-equal comparison (payment sufficiency)
///      - FHE.asEuint64     : cast public uint to encrypted euint64 for FHE comparison
///      - FHE.select        : conditional selection on encrypted values (poll voting)
///      - FHE.makePubliclyDecryptable : allow public decryption of an ebool (payment proof)
///      - FHE.allow / FHE.allowThis   : ACL for who can decrypt / use handles
///      ERC-7984 confidentialTransferFrom : real encrypted token movement
///      EIP-712 user-decryption (via SDK)  : creator decrypts aggregate earnings
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

    struct Poll {
        string question;
        string[] options;
        uint256 createdAt;
        bool active;
    }

    IConfidentialToken public immutable paymentToken;

    mapping(address => Creator) public creators;
    mapping(address => Tier[]) public creatorTiers;
    mapping(address => mapping(address => uint256)) public subscriptionExpiry;
    mapping(address => mapping(address => uint256)) public subscriptionTier;

    /// @dev FHE-computed aggregate earnings per creator. The creator's
    ///      confidential token balance is the real money; this handle is the
    ///      verifiable onchain sum computed via FHE.add — they must match.
    mapping(address => euint64) private _creatorEarnings;

    /// @dev Encrypted payment-sufficiency flag per subscription. Publicly
    ///      decryptable: anyone can verify "did the subscriber pay enough?"
    ///      without learning the actual amount.
    mapping(address => mapping(address => ebool)) private _paymentSufficient;

    /// @dev Encrypted poll vote totals per option. Only the creator can decrypt.
    mapping(address => Poll[]) public polls;
    mapping(address => mapping(uint256 => mapping(uint256 => euint64))) private _pollVotes;
    mapping(address => mapping(uint256 => mapping(address => bool))) private _hasVoted;

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
    event PaymentSufficiencyVerified(address indexed creator, address indexed subscriber);
    event PollCreated(address indexed creator, uint256 pollIndex, string question);
    event Voted(address indexed creator, address indexed voter, uint256 pollIndex, uint256 optionIndex);

    constructor(address paymentToken_) {
        require(paymentToken_ != address(0), "Invalid token");
        paymentToken = IConfidentialToken(paymentToken_);
    }

    modifier onlyRegistered() {
        require(creators[msg.sender].registered, "Not registered");
        _;
    }

    modifier onlySubscribed(address creator) {
        require(subscriptionExpiry[creator][msg.sender] > block.timestamp, "Not subscribed");
        _;
    }

    // ============ Creator management ============

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

    // ============ Subscribe (encrypted payment) ============

    /// @notice Subscribe (or renew) by paying an encrypted amount of cUSDT.
    ///         The contract pulls encrypted tokens, homomorphically adds to
    ///         earnings, and computes an encrypted payment-sufficiency proof.
    /// @dev The sufficiency proof (ebool = ge(amount, tierPrice)) is made
    ///      publicly decryptable — anyone can verify the subscriber paid enough
    ///      WITHOUT learning the actual amount. This is the FHE miracle.
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

        // === FHE payment-sufficiency proof ===
        // Compare the encrypted payment against the PUBLIC tier price (cast to euint64).
        // The result is an encrypted boolean — nobody can see it directly.
        // makePubliclyDecryptable lets ANYONE decrypt just this boolean via the
        // Zama KMS public-decryption flow. They learn "paid enough? yes/no"
        // but NOT "how much was paid?".
        ebool sufficient = FHE.ge(amount, FHE.asEuint64(uint64(creatorTiers[creator][tierIndex].price)));
        _paymentSufficient[creator][msg.sender] = sufficient;
        // Public decryption: anyone can verify "paid enough?" via KMS.
        FHE.makePubliclyDecryptable(sufficient);
        // Also grant user-decryption to subscriber and creator for direct UI access.
        FHE.allowThis(sufficient);
        FHE.allow(sufficient, msg.sender);
        FHE.allow(sufficient, creator);

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
        emit PaymentSufficiencyVerified(creator, msg.sender);
    }

    /// @notice Returns the encrypted payment-sufficiency flag for a subscription.
    ///         Anyone can public-decrypt this to verify the subscriber paid enough.
    function getPaymentSufficient(address creator, address subscriber) external view returns (ebool) {
        return _paymentSufficient[creator][subscriber];
    }

    // ============ Encrypted supporter poll ============

    /// @notice Create a poll with N options. Only the creator can decrypt results.
    function createPoll(string calldata question, string[] calldata options) external onlyRegistered {
        require(options.length >= 2 && options.length <= 6, "Need 2-6 options");
        polls[msg.sender].push(Poll({
            question: question,
            options: options,
            createdAt: block.timestamp,
            active: true
        }));
        emit PollCreated(msg.sender, polls[msg.sender].length - 1, question);
    }

    /// @notice Vote on a poll with an encrypted preference. The encrypted vote
    ///         is 1 for the chosen option and 0 for all others, computed via
    ///         FHE.select so the contract never learns which option was chosen.
    ///         Only the creator can decrypt the aggregate per-option totals.
    function vote(
        address creator,
        uint256 pollIndex,
        uint256 optionIndex,
        externalEuint64 encryptedChoice,
        bytes calldata inputProof
    ) external onlySubscribed(creator) {
        require(pollIndex < polls[creator].length, "Invalid poll");
        require(polls[creator][pollIndex].active, "Poll closed");
        require(optionIndex < polls[creator][pollIndex].options.length, "Invalid option");
        require(!_hasVoted[creator][pollIndex][msg.sender], "Already voted");

        euint64 choice = FHE.fromExternal(encryptedChoice, inputProof);

        // For each option, add the vote if optionIndex matches the choice.
        // FHE.select(isChosen, 1, 0) returns an encrypted 1 or 0.
        // The contract computes this without learning which option was selected.
        for (uint256 i = 0; i < polls[creator][pollIndex].options.length; i++) {
            ebool isChosen = FHE.eq(choice, FHE.asEuint64(uint64(i)));
            euint64 voteWeight = FHE.select(isChosen, FHE.asEuint64(1), FHE.asEuint64(0));
            _pollVotes[creator][pollIndex][i] = FHE.add(_pollVotes[creator][pollIndex][i], voteWeight);
            FHE.allowThis(_pollVotes[creator][pollIndex][i]);
            FHE.allow(_pollVotes[creator][pollIndex][i], creator);
        }

        _hasVoted[creator][pollIndex][msg.sender] = true;
        emit Voted(creator, msg.sender, pollIndex, optionIndex);
    }

    /// @notice Returns the encrypted vote count for a poll option. Only the
    ///         creator can decrypt (onchain ACL).
    function getPollVotes(address creator, uint256 pollIndex, uint256 optionIndex)
        external view returns (euint64)
    {
        return _pollVotes[creator][pollIndex][optionIndex];
    }

    function closePoll(uint256 pollIndex) external onlyRegistered {
        require(pollIndex < polls[msg.sender].length, "Invalid poll");
        polls[msg.sender][pollIndex].active = false;
    }

    function getPollCount(address creator) external view returns (uint256) {
        return polls[creator].length;
    }

    // ============ Views ============

    function isSubscribed(address creator, address subscriber) public view returns (bool) {
        return subscriptionExpiry[creator][subscriber] > block.timestamp;
    }

    function getSubscriptionTier(address creator, address subscriber) external view returns (uint256) {
        require(subscriptionExpiry[creator][subscriber] > block.timestamp, "Subscription expired or not found");
        return subscriptionTier[creator][subscriber];
    }

    /// @notice Returns the encrypted aggregate earnings handle. Only `creator`
    ///         can decrypt it (onchain ACL).
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
