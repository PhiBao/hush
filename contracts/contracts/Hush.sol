// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

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

    mapping(address => Creator) public creators;
    mapping(address => Tier[]) public creatorTiers;
    mapping(address => mapping(address => uint256)) public subscriptionExpiry;
    mapping(address => mapping(address => uint256)) public subscriptionTier;
    mapping(address => euint64) private _creatorEarnings;

    uint256 public totalCreators;
    uint256 public totalSubscriptions;

    event CreatorRegistered(address indexed creator, string name);
    event TierAdded(address indexed creator, uint256 tierIndex, string name, uint256 price);
    event Subscribed(
        address indexed creator,
        address indexed subscriber,
        uint256 tierIndex,
        uint256 expiry
    );
    event EarningsUpdated(address indexed creator);

    function registerCreator(string calldata name, string calldata bio) external {
        require(!creators[msg.sender].registered, "Already registered");
        creators[msg.sender] = Creator({name: name, bio: bio, registered: true});
        totalCreators++;
        emit CreatorRegistered(msg.sender, name);
    }

    function updateCreator(string calldata name, string calldata bio) external {
        require(creators[msg.sender].registered, "Not registered");
        creators[msg.sender].name = name;
        creators[msg.sender].bio = bio;
    }

    function addTier(
        string calldata name,
        uint256 price,
        uint256 durationSecs,
        string calldata description
    ) external {
        require(creators[msg.sender].registered, "Not registered");
        require(price > 0, "Price must be greater than 0");
        require(durationSecs > 0, "Duration must be greater than 0");

        creatorTiers[msg.sender].push(
            Tier({name: name, price: price, durationSecs: durationSecs, description: description, active: true})
        );
        emit TierAdded(msg.sender, creatorTiers[msg.sender].length - 1, name, price);
    }

    function removeTier(uint256 tierIndex) external {
        require(creators[msg.sender].registered, "Not registered");
        require(tierIndex < creatorTiers[msg.sender].length, "Invalid tier");
        creatorTiers[msg.sender][tierIndex].active = false;
    }

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

        euint64 paymentAmount = FHE.fromExternal(encryptedAmount, inputProof);

        _creatorEarnings[creator] = FHE.add(_creatorEarnings[creator], paymentAmount);

        FHE.allowThis(_creatorEarnings[creator]);
        FHE.allow(_creatorEarnings[creator], creator);

        uint256 expiry = block.timestamp + creatorTiers[creator][tierIndex].durationSecs;
        subscriptionExpiry[creator][msg.sender] = expiry;
        subscriptionTier[creator][msg.sender] = tierIndex;
        totalSubscriptions++;

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

    function getSubscriberCount(address creator) external view returns (uint256) {
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
