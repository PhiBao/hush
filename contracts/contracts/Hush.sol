// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint256, ebool, externalEuint64, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IConfidentialToken} from "./IConfidentialToken.sol";

/// @title Hush v4 — Confidential creator subscriptions on Zama fhEVM.
///
/// FHE primitives used (11 in total):
///   FHE.fromExternal  — re-encrypt client input to onchain handle
///   FHE.add           — homomorphic addition (earnings, poll votes)
///   FHE.ge            — encrypted ≥ comparison (payment sufficiency)
///   FHE.asEuint64     — cast public uint → euint64
///   FHE.select        — conditional selection (poll voting)
///   FHE.eq            — encrypted equality check (poll matching)
///   FHE.makePubliclyDecryptable — public decryption of sufficiency bool
///   FHE.allow / FHE.allowThis   — ACL for encrypted handles
///   ERC-7984 confidentialTransferFrom — real encrypted token transfer
///   euint256 (content key)  — FHE-encrypted AES-256 key for content gating
///   EIP-712 user-decryption — creator decrypts earnings + content keys
///
/// Gas profile (approximate, Sepolia fhEVM):
///   FHE.add               ~ 30k gas
///   FHE.ge                ~ 35k gas
///   FHE.select            ~ 40k gas
///   FHE.eq                ~ 32k gas
///   FHE.makePubliclyDecryptable ~ 25k gas
///   FHE.allow              ~ 10k gas per address
///   confidentialTransferFrom ~ 120k gas (includes ERC-7984 encrypted balance update)
///   subscribe (full flow)  ~ 280k gas (5 FHE ops + token transfer)
///   vote (per option)      ~ 120k gas (eq + select + add + 2x allow per option)
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

    struct SubscriberInfo {
        address subscriber;
    }

    IConfidentialToken public immutable paymentToken;

    mapping(address => Creator) public creators;
    mapping(address => Tier[]) public creatorTiers;
    mapping(address => mapping(address => uint256)) public subscriptionExpiry;
    mapping(address => mapping(address => uint256)) public subscriptionTier;

    /// @dev FHE-computed aggregate earnings per creator.
    mapping(address => euint64) private _creatorEarnings;

    /// @dev FHE-encrypted content key (AES-256) per creator. Only subscribers
    ///      can decrypt it via EIP-712 user-decryption.
    mapping(address => euint256) private _contentKeys;

    /// @dev Encrypted payment-sufficiency flag per subscription. Publicly decryptable.
    mapping(address => mapping(address => ebool)) private _paymentSufficient;

    /// @dev Encrypted poll vote totals per option.
    mapping(address => Poll[]) public polls;
    mapping(address => mapping(uint256 => mapping(uint256 => euint64))) private _pollVotes;
    mapping(address => mapping(uint256 => mapping(address => bool))) private _hasVoted;

    /// @dev Track subscribers so content keys can be re-allowed to them.
    mapping(address => address[]) private _subscriberList;

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
    event ContentKeyPublished(address indexed creator);

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

    /// @notice Subscribe with an encrypted cUSDT payment. The contract:
    ///         1) Pulls encrypted tokens via confidentialTransferFrom
    ///         2) FHE.adds the amount to the creator's aggregate earnings
    ///         3) FHE.compares (ge) against the tier price for public verification
    ///         4) Grants the subscriber ACL access to the creator's content key
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
        FHE.allow(amount, address(paymentToken));

        // Real encrypted payment: pull cUSDT subscriber → creator.
        // ~120k gas (ERC-7984 encrypted balance update).
        paymentToken.confidentialTransferFrom(msg.sender, creator, amount);

        // FHE-add to aggregate earnings. ~30k gas.
        _creatorEarnings[creator] = FHE.add(_creatorEarnings[creator], amount);
        FHE.allowThis(_creatorEarnings[creator]);
        FHE.allow(_creatorEarnings[creator], creator);

        // FHE-ge payment sufficiency: prove "paid enough" without revealing amount.
        // ~35k gas + ~25k for makePubliclyDecryptable.
        ebool sufficient = FHE.ge(amount, FHE.asEuint64(uint64(creatorTiers[creator][tierIndex].price)));
        _paymentSufficient[creator][msg.sender] = sufficient;
        FHE.makePubliclyDecryptable(sufficient);
        FHE.allowThis(sufficient);
        FHE.allow(sufficient, msg.sender);
        FHE.allow(sufficient, creator);

        // Grant subscriber access to the creator's FHE-encrypted content key.
        // ~10k gas.
        euint256 ck = _contentKeys[creator];
        if (!_isZero(ck)) {
            FHE.allow(ck, msg.sender);
        }

        uint256 expiry = block.timestamp + creatorTiers[creator][tierIndex].durationSecs;
        bool isRenewal = subscriptionExpiry[creator][msg.sender] > block.timestamp;
        subscriptionExpiry[creator][msg.sender] = expiry;
        subscriptionTier[creator][msg.sender] = tierIndex;
        if (!isRenewal) {
            totalSubscriptions++;
            activeSubscriberCount[creator]++;
            _subscriberList[creator].push(msg.sender);
        }

        emit Subscribed(creator, msg.sender, tierIndex, expiry);
        emit EarningsUpdated(creator);
        emit PaymentSufficiencyVerified(creator, msg.sender);
    }

    // ============ Publish content key (FHE-encrypted AES key) ============

    /// @notice Publish (or rotate) the FHE-encrypted AES-256 content key.
    ///         The creator encrypts a random 32-byte key as euint256 client-side
    ///         and stores the encrypted handle onchain. Only current subscribers
    ///         (granted via `subscribe`) can decrypt it via EIP-712.
    ///         ~10k gas per subscriber (FHE.allow).
    function publishContentKey(externalEuint256 encryptedKey, bytes calldata inputProof) external onlyRegistered {
        euint256 key = FHE.fromExternal(encryptedKey, inputProof);
        _contentKeys[msg.sender] = key;
        FHE.allowThis(key);
        FHE.allow(key, msg.sender);

        // Re-grant access to all existing subscribers.
        address[] storage subs = _subscriberList[msg.sender];
        for (uint256 i = 0; i < subs.length; i++) {
            if (subscriptionExpiry[msg.sender][subs[i]] > block.timestamp) {
                FHE.allow(key, subs[i]);
            }
        }

        emit ContentKeyPublished(msg.sender);
    }

    /// @notice Returns the FHE-encrypted content key handle. Only subscribers
    ///         (who were granted ACL via subscribe/publishContentKey) can
    ///         EIP-712 decrypt this.
    function getContentKey(address creator) external view returns (euint256) {
        return _contentKeys[creator];
    }

    // ============ Onchain aggregate == balance verification ============

    /// @notice Returns both the FHE-computed earnings aggregate AND the
    ///         creator's cUSDT confidential balance as encrypted handles.
    ///         The frontend decrypts both — if they match, the FHE proof holds:
    ///         the contract summed encrypted payments correctly.
    function verifyEarnings(address creator) external view returns (euint64 aggregate, euint64 tokenBalance) {
        require(creators[creator].registered, "Creator not registered");
        aggregate = _creatorEarnings[creator];
        tokenBalance = paymentToken.confidentialBalanceOf(creator);
    }

    // ============ Encrypted supporter poll ============

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

    /// @notice Vote on a poll. The contract uses FHE.select + FHE.eq to add
    ///         an encrypted 1 to the chosen option and 0 to others.
    ///         ~120k gas per option (eq ~32k + select ~40k + add ~30k + 2x allow ~20k).
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

    function getPollVotes(address creator, uint256 pollIndex, uint256 optionIndex) external view returns (euint64) {
        return _pollVotes[creator][pollIndex][optionIndex];
    }

    function closePoll(uint256 pollIndex) external onlyRegistered {
        require(pollIndex < polls[msg.sender].length, "Invalid poll");
        polls[msg.sender][pollIndex].active = false;
    }

    function getPollCount(address creator) external view returns (uint256) {
        return polls[creator].length;
    }

    /// @dev Explicit getters for poll fields — viem cannot decode string[] inside
    ///      a struct returned by the auto-generated `polls` public getter.
    function getPollQuestion(address creator, uint256 pollIndex) external view returns (string memory) {
        require(pollIndex < polls[creator].length, "Invalid poll");
        return polls[creator][pollIndex].question;
    }
    function getPollOptions(address creator, uint256 pollIndex) external view returns (string[] memory) {
        require(pollIndex < polls[creator].length, "Invalid poll");
        return polls[creator][pollIndex].options;
    }
    function getPollOptionCount(address creator, uint256 pollIndex) external view returns (uint256) {
        require(pollIndex < polls[creator].length, "Invalid poll");
        return polls[creator][pollIndex].options.length;
    }
    function getPollActive(address creator, uint256 pollIndex) external view returns (bool) {
        require(pollIndex < polls[creator].length, "Invalid poll");
        return polls[creator][pollIndex].active;
    }
    function getPollCreatedAt(address creator, uint256 pollIndex) external view returns (uint256) {
        require(pollIndex < polls[creator].length, "Invalid poll");
        return polls[creator][pollIndex].createdAt;
    }

    // ============ Views ============

    function isSubscribed(address creator, address subscriber) public view returns (bool) {
        return subscriptionExpiry[creator][subscriber] > block.timestamp;
    }

    function getSubscriptionTier(address creator, address subscriber) external view returns (uint256) {
        require(subscriptionExpiry[creator][subscriber] > block.timestamp, "Subscription expired or not found");
        return subscriptionTier[creator][subscriber];
    }

    function getCreatorEarnings(address creator) external view returns (euint64) {
        require(creators[creator].registered, "Creator not registered");
        return _creatorEarnings[creator];
    }

    function getPaymentSufficient(address creator, address subscriber) external view returns (ebool) {
        return _paymentSufficient[creator][subscriber];
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
            if (tiers[i].active) { count++; }
        }
        return count;
    }

    // ============ Internal helpers ============

    /// @dev Checks if an euint256 handle is the zero/empty handle.
    function _isZero(euint256 v) internal pure returns (bool) {
        return euint256.unwrap(v) == bytes32(0);
    }
}
