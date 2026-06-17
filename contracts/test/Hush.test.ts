import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Hush } from "../types/contracts/Hush";
import type { MockConfidentialToken } from "../types/contracts/MockConfidentialToken";

describe("Hush", function () {
  let hush: Hush;
  let hushAddress: string;
  let token: MockConfidentialToken;
  let tokenAddress: string;
  let owner: ReturnType<typeof ethers.Wallet>;
  let creator: ReturnType<typeof ethers.Wallet>;
  let subscriber: ReturnType<typeof ethers.Wallet>;

  before(async function () {
    if (!fhevm.isMock) {
      console.warn("Skipping: not running against fhEVM mock environment");
      this.skip();
    }

    const signers = await ethers.getSigners();
    owner = signers[0];
    creator = signers[1];
    subscriber = signers[2];

    const Token = await ethers.getContractFactory("MockConfidentialToken");
    token = (await Token.deploy("Confidential USDT (Mock)", "cUSDTMock", 6, owner.address)) as unknown as MockConfidentialToken;
    tokenAddress = await token.getAddress();

    const Hush = await ethers.getContractFactory("Hush");
    hush = (await Hush.deploy(tokenAddress)) as unknown as Hush;
    hushAddress = await hush.getAddress();
    await hush.waitForDeployment();
  });

  it("should expose the configured payment token", async function () {
    expect(await hush.paymentToken()).to.equal(tokenAddress);
    expect(await token.symbol()).to.equal("cUSDTMock");
  });

  it("should reject zero-token constructor", async function () {
    const Hush = await ethers.getContractFactory("Hush");
    await expect(Hush.deploy(ethers.ZeroAddress)).to.be.revertedWith("Invalid token");
  });

  it("should register a creator", async function () {
    await hush.connect(creator).registerCreator("Alice", "Content creator");
    const c = await hush.creators(creator.address);
    expect(c.name).to.equal("Alice");
    expect(c.registered).to.be.true;
  });

  it("should reject duplicate registration", async function () {
    await expect(hush.connect(creator).registerCreator("Alice2", "bio2")).to.be.revertedWith(
      "Already registered"
    );
  });

  it("should reject empty name", async function () {
    await expect(hush.connect(owner).registerCreator("", "bio")).to.be.revertedWith("Empty name");
  });

  it("should add tiers", async function () {
    await hush.connect(creator).addTier("Supporter", 100n, 2592000n, "Basic access");
    await hush.connect(creator).addTier("Patron", 500n, 2592000n, "Premium access");

    const tiers = await hush.getTiers(creator.address);
    expect(tiers.length).to.equal(2);
    expect(tiers[0].name).to.equal("Supporter");
    expect(tiers[1].name).to.equal("Patron");
  });

  it("should deactivate a tier", async function () {
    await hush.connect(creator).removeTier(0);
    const tiers = await hush.getTiers(creator.address);
    expect(tiers[0].active).to.be.false;
    expect(tiers[1].active).to.be.true;
  });

  it("should track active tier count correctly", async function () {
    expect(await hush.getActiveTierCount(creator.address)).to.equal(1);
  });

  it("should subscribe with an encrypted payment that moves confidential tokens", async function () {
    // 1) Mint encrypted tokens to the subscriber.
    const mint = await fhevm
      .createEncryptedInput(tokenAddress, subscriber.address)
      .add64(1000n)
      .encrypt();
    await token.connect(subscriber).mintEncrypted(subscriber.address, mint.handles[0], mint.inputProof);

    // 2) Approve Hush as an operator for the subscriber's confidential tokens.
    await token.connect(subscriber).setOperator(hushAddress, 2 ** 48 - 1);

    expect(await token.isOperator(subscriber.address, hushAddress)).to.be.true;

    // 3) Encrypt the payment amount bound to the Hush contract.
    const payment = await fhevm
      .createEncryptedInput(hushAddress, subscriber.address)
      .add64(100n)
      .encrypt();

    // 4) Subscribe — Hush pulls encrypted tokens and accumulates encrypted earnings.
    await hush.connect(subscriber).subscribe(
      creator.address,
      1,
      payment.handles[0],
      payment.inputProof
    );

    const expiry = await hush.subscriptionExpiry(creator.address, subscriber.address);
    expect(expiry).to.be.gt(0);
    expect(await hush.isSubscribed(creator.address, subscriber.address)).to.be.true;
  });

  it("should let only the creator decrypt their aggregate earnings", async function () {
    const earnings = await hush.getCreatorEarnings(creator.address);
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      earnings,
      hushAddress,
      creator
    );
    expect(decrypted).to.equal(100n);
  });

  it("should let the creator decrypt their confidential token balance (real money)", async function () {
    const balHandle = await token.confidentialBalanceOf(creator.address);
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      balHandle,
      tokenAddress,
      creator
    );
    // creator received 100 from the subscription.
    expect(decrypted).to.equal(100n);
  });

  it("should decrement the subscriber's confidential balance", async function () {
    const balHandle = await token.confidentialBalanceOf(subscriber.address);
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      balHandle,
      tokenAddress,
      subscriber
    );
    // minted 1000, paid 100.
    expect(decrypted).to.equal(900n);
  });

  it("should track aggregate earnings == confidential balance (the FHE proof)", async function () {
    const aggHandle = await hush.getCreatorEarnings(creator.address);
    const agg = await fhevm.userDecryptEuint(FhevmType.euint64, aggHandle, hushAddress, creator);
    const balHandle = await token.confidentialBalanceOf(creator.address);
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balHandle, tokenAddress, creator);
    expect(agg).to.equal(bal);
  });

  it("should reject subscription from unregistered creator", async function () {
    const payment = await fhevm
      .createEncryptedInput(hushAddress, subscriber.address)
      .add64(100n)
      .encrypt();
    await expect(
      hush.connect(subscriber).subscribe(owner.address, 0, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Creator not registered");
  });

  it("should reject self-subscription", async function () {
    const payment = await fhevm
      .createEncryptedInput(hushAddress, creator.address)
      .add64(100n)
      .encrypt();
    await expect(
      hush.connect(creator).subscribe(creator.address, 1, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Cannot subscribe to yourself");
  });

  it("should reject inactive tier", async function () {
    const payment = await fhevm
      .createEncryptedInput(hushAddress, subscriber.address)
      .add64(100n)
      .encrypt();
    await expect(
      hush.connect(subscriber).subscribe(creator.address, 0, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Tier not active");
  });

  it("should reject when Hush is not an operator", async function () {
    const fresh = (await ethers.getSigners())[3];
    const mint = await fhevm
      .createEncryptedInput(tokenAddress, fresh.address)
      .add64(1000n)
      .encrypt();
    await token.connect(fresh).mintEncrypted(fresh.address, mint.handles[0], mint.inputProof);

    const payment = await fhevm
      .createEncryptedInput(hushAddress, fresh.address)
      .add64(100n)
      .encrypt();
    await expect(
      hush.connect(fresh).subscribe(creator.address, 1, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Not operator");
  });

  it("should track totals", async function () {
    expect(await hush.totalSubscriptions()).to.equal(1n);
    expect(await hush.totalCreators()).to.equal(1n);
    expect(await hush.activeSubscriberCount(creator.address)).to.equal(1n);
  });

  it("should track subscription tier", async function () {
    expect(await hush.subscriptionTier(creator.address, subscriber.address)).to.equal(1n);
    expect(await hush.getSubscriptionTier(creator.address, subscriber.address)).to.equal(1n);
  });

  it("should revert getSubscriptionTier for expired/non-existent subscription", async function () {
    await expect(hush.getSubscriptionTier(creator.address, owner.address)).to.be.revertedWith(
      "Subscription expired or not found"
    );
  });

  it("should support renewal (extend expiry without double-counting subscriber)", async function () {
    const beforeCount = await hush.activeSubscriberCount(creator.address);
    const beforeTotal = await hush.totalSubscriptions();

    const payment = await fhevm
      .createEncryptedInput(hushAddress, subscriber.address)
      .add64(200n)
      .encrypt();
    await hush.connect(subscriber).subscribe(creator.address, 1, payment.handles[0], payment.inputProof);

    // Same subscriber: count unchanged, total unchanged.
    expect(await hush.activeSubscriberCount(creator.address)).to.equal(beforeCount);
    expect(await hush.totalSubscriptions()).to.equal(beforeTotal);

    // Earnings aggregate now 100 + 200 = 300.
    const aggHandle = await hush.getCreatorEarnings(creator.address);
    const agg = await fhevm.userDecryptEuint(FhevmType.euint64, aggHandle, hushAddress, creator);
    expect(agg).to.equal(300n);
  });

  it("should accumulate earnings across multiple subscribers", async function () {
    const s3 = (await ethers.getSigners())[3];

    const mint = await fhevm.createEncryptedInput(tokenAddress, s3.address).add64(1000n).encrypt();
    await token.connect(s3).mintEncrypted(s3.address, mint.handles[0], mint.inputProof);
    await token.connect(s3).setOperator(hushAddress, 2 ** 48 - 1);

    const payment = await fhevm.createEncryptedInput(hushAddress, s3.address).add64(500n).encrypt();
    await hush.connect(s3).subscribe(creator.address, 1, payment.handles[0], payment.inputProof);

    // Total aggregate = 300 (previous) + 500 = 800.
    const aggHandle = await hush.getCreatorEarnings(creator.address);
    const agg = await fhevm.userDecryptEuint(FhevmType.euint64, aggHandle, hushAddress, creator);
    expect(agg).to.equal(800n);

    // Active subscribers now 2.
    expect(await hush.activeSubscriberCount(creator.address)).to.equal(2n);
    expect(await hush.totalSubscriptions()).to.equal(2n);
  });
});
