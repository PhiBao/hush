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
  let subscriber2: ReturnType<typeof ethers.Wallet>;

  before(async function () {
    if (!fhevm.isMock) {
      console.warn("Skipping: not running against fhEVM mock environment");
      this.skip();
    }

    const signers = await ethers.getSigners();
    owner = signers[0];
    creator = signers[1];
    subscriber = signers[2];
    subscriber2 = signers[3];

    const Token = await ethers.getContractFactory("MockConfidentialToken");
    token = (await Token.deploy("Confidential USDT (Mock)", "cUSDTMock", 6, owner.address)) as unknown as MockConfidentialToken;
    tokenAddress = await token.getAddress();

    const Hush = await ethers.getContractFactory("Hush");
    hush = (await Hush.deploy(tokenAddress)) as unknown as Hush;
    hushAddress = await hush.getAddress();
    await hush.waitForDeployment();
  });

  // ============ Setup ============

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

  it("should add tiers", async function () {
    await hush.connect(creator).addTier("Supporter", 100n, 2592000n, "Basic access");
    await hush.connect(creator).addTier("Patron", 500n, 2592000n, "Premium access");
    const tiers = await hush.getTiers(creator.address);
    expect(tiers.length).to.equal(2);
    expect(tiers[0].name).to.equal("Supporter");
    expect(tiers[1].name).to.equal("Patron");
  });

  // ============ Subscribe with encrypted payment ============

  it("should subscribe with an encrypted payment that moves confidential tokens", async function () {
    // Mint encrypted tokens to subscriber.
    const mint = await fhevm.createEncryptedInput(tokenAddress, subscriber.address).add64(1000n).encrypt();
    await token.connect(subscriber).mintEncrypted(subscriber.address, mint.handles[0], mint.inputProof);
    await token.connect(subscriber).setOperator(hushAddress, 2 ** 48 - 1);

    // Encrypt payment amount bound to Hush.
    const payment = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(100n).encrypt();
    await hush.connect(subscriber).subscribe(creator.address, 1, payment.handles[0], payment.inputProof);

    expect(await hush.isSubscribed(creator.address, subscriber.address)).to.be.true;
  });

  it("should let only the creator decrypt their aggregate earnings", async function () {
    const earnings = await hush.getCreatorEarnings(creator.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint64, earnings, hushAddress, creator);
    expect(decrypted).to.equal(100n);
  });

  it("should let the creator decrypt their confidential token balance", async function () {
    const balHandle = await token.confidentialBalanceOf(creator.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint64, balHandle, tokenAddress, creator);
    expect(decrypted).to.equal(100n);
  });

  it("should track aggregate earnings == confidential balance (the FHE proof)", async function () {
    const aggHandle = await hush.getCreatorEarnings(creator.address);
    const agg = await fhevm.userDecryptEuint(FhevmType.euint64, aggHandle, hushAddress, creator);
    const balHandle = await token.confidentialBalanceOf(creator.address);
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balHandle, tokenAddress, creator);
    expect(agg).to.equal(bal);
  });

  // ============ FHE.ge payment sufficiency proof ============

  it("should compute an encrypted payment-sufficiency flag (FHE.ge)", async function () {
    // Subscriber paid 100, tier price is 500 (Patron). 100 < 500 → sufficient = false.
    const suffHandle = await hush.getPaymentSufficient(creator.address, subscriber.address);
    const decrypted = await fhevm.userDecryptEbool(suffHandle, hushAddress, subscriber);
    // 100 < 500 → NOT sufficient
    expect(decrypted).to.equal(false);
  });

  it("should mark payment sufficient when amount >= tier price", async function () {
    // subscriber2 pays 500 (exact Patron price).
    const mint = await fhevm.createEncryptedInput(tokenAddress, subscriber2.address).add64(1000n).encrypt();
    await token.connect(subscriber2).mintEncrypted(subscriber2.address, mint.handles[0], mint.inputProof);
    await token.connect(subscriber2).setOperator(hushAddress, 2 ** 48 - 1);

    const payment = await fhevm.createEncryptedInput(hushAddress, subscriber2.address).add64(500n).encrypt();
    await hush.connect(subscriber2).subscribe(creator.address, 1, payment.handles[0], payment.inputProof);

    const suffHandle = await hush.getPaymentSufficient(creator.address, subscriber2.address);
    const decrypted = await fhevm.userDecryptEbool(suffHandle, hushAddress, subscriber2);
    // 500 >= 500 → sufficient
    expect(decrypted).to.equal(true);
  });

  it("should mark payment sufficient when amount exceeds tier price (private tip)", async function () {
    // subscriber pays 700 (500 tier + 200 private tip).
    const mint = await fhevm.createEncryptedInput(tokenAddress, subscriber.address).add64(700n).encrypt();
    await token.connect(subscriber).mintEncrypted(subscriber.address, mint.handles[0], mint.inputProof);

    const payment = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(700n).encrypt();
    await hush.connect(subscriber).subscribe(creator.address, 1, payment.handles[0], payment.inputProof);

    const suffHandle = await hush.getPaymentSufficient(creator.address, subscriber.address);
    const decrypted = await fhevm.userDecryptEbool(suffHandle, hushAddress, subscriber);
    // 700 >= 500 → sufficient
    expect(decrypted).to.equal(true);

    // Creator's aggregate is now 100 + 500 + 700 = 1300.
    const aggHandle = await hush.getCreatorEarnings(creator.address);
    const agg = await fhevm.userDecryptEuint(FhevmType.euint64, aggHandle, hushAddress, creator);
    expect(agg).to.equal(1300n);
  });

  // ============ Encrypted supporter poll ============

  it("should create a poll", async function () {
    await hush.connect(creator).createPoll("What should I write next?", ["Deep dive", "Tutorial", "Opinion"]);
    const count = await hush.getPollCount(creator.address);
    expect(count).to.equal(1n);
  });

  it("should reject poll with too few options", async function () {
    await expect(hush.connect(creator).createPoll("Bad", ["Only one"])).to.be.revertedWith(
      "Need 2-6 options"
    );
  });

  it("should allow subscribers to vote with encrypted choice (FHE.select)", async function () {
    // subscriber votes for option 1 (Tutorial).
    const vote = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(1n).encrypt();
    await hush.connect(subscriber).vote(creator.address, 0, 1, vote.handles[0], vote.inputProof);
  });

  it("should allow subscriber2 to vote with encrypted choice", async function () {
    // subscriber2 votes for option 0 (Deep dive).
    const vote = await fhevm.createEncryptedInput(hushAddress, subscriber2.address).add64(0n).encrypt();
    await hush.connect(subscriber2).vote(creator.address, 0, 0, vote.handles[0], vote.inputProof);
  });

  it("should reject double voting", async function () {
    const vote = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(2n).encrypt();
    await expect(
      hush.connect(subscriber).vote(creator.address, 0, 2, vote.handles[0], vote.inputProof)
    ).to.be.revertedWith("Already voted");
  });

  it("should reject vote from non-subscriber", async function () {
    const vote = await fhevm.createEncryptedInput(hushAddress, owner.address).add64(0n).encrypt();
    await expect(
      hush.connect(owner).vote(creator.address, 0, 0, vote.handles[0], vote.inputProof)
    ).to.be.revertedWith("Not subscribed");
  });

  it("should let only the creator decrypt poll results (FHE aggregate votes)", async function () {
    // Option 0 (Deep dive): 1 vote from subscriber2.
    const opt0Handle = await hush.getPollVotes(creator.address, 0, 0);
    const opt0 = await fhevm.userDecryptEuint(FhevmType.euint64, opt0Handle, hushAddress, creator);
    expect(opt0).to.equal(1n);

    // Option 1 (Tutorial): 1 vote from subscriber.
    const opt1Handle = await hush.getPollVotes(creator.address, 0, 1);
    const opt1 = await fhevm.userDecryptEuint(FhevmType.euint64, opt1Handle, hushAddress, creator);
    expect(opt1).to.equal(1n);

    // Option 2 (Opinion): 0 votes.
    const opt2Handle = await hush.getPollVotes(creator.address, 0, 2);
    const opt2 = await fhevm.userDecryptEuint(FhevmType.euint64, opt2Handle, hushAddress, creator);
    expect(opt2).to.equal(0n);
  });

  // ============ Edge cases ============

  it("should reject subscription from unregistered creator", async function () {
    const payment = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(100n).encrypt();
    await expect(
      hush.connect(subscriber).subscribe(owner.address, 0, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Creator not registered");
  });

  it("should reject self-subscription", async function () {
    const payment = await fhevm.createEncryptedInput(hushAddress, creator.address).add64(100n).encrypt();
    await expect(
      hush.connect(creator).subscribe(creator.address, 1, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Cannot subscribe to yourself");
  });

  it("should reject inactive tier", async function () {
    await hush.connect(creator).removeTier(0);
    const payment = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(100n).encrypt();
    await expect(
      hush.connect(subscriber).subscribe(creator.address, 0, payment.handles[0], payment.inputProof)
    ).to.be.revertedWith("Tier not active");
  });

  it("should support renewal without double-counting subscriber", async function () {
    const beforeCount = await hush.activeSubscriberCount(creator.address);
    const payment = await fhevm.createEncryptedInput(hushAddress, subscriber.address).add64(500n).encrypt();
    await hush.connect(subscriber).subscribe(creator.address, 1, payment.handles[0], payment.inputProof);
    expect(await hush.activeSubscriberCount(creator.address)).to.equal(beforeCount);
  });

  it("should track totals", async function () {
    expect(await hush.totalSubscriptions()).to.equal(2n);
    expect(await hush.totalCreators()).to.equal(1n);
    expect(await hush.activeSubscriberCount(creator.address)).to.equal(2n);
  });

  // ============ FHE-encrypted content access (euint256) ============

  it("should publish an FHE-encrypted content key (euint256)", async function () {
    // Creator encrypts a 256-bit AES key and stores it onchain.
    const keyInput = await fhevm.createEncryptedInput(hushAddress, creator.address).add256(1n).encrypt();
    await hush.connect(creator).publishContentKey(keyInput.handles[0], keyInput.inputProof);
    // Key stored — subscribers who were granted ACL can decrypt.
    const keyHandle = await hush.getContentKey(creator.address);
    // Verify it's non-zero.
    expect(keyHandle).to.not.equal(ethers.ZeroHash);
  });

  it("should let the creator decrypt their own content key", async function () {
    const keyHandle = await hush.getContentKey(creator.address);
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      keyHandle,
      hushAddress,
      creator
    );
    expect(decrypted).to.equal(1n);
  });

  it("should let subscribed wallets decrypt the content key (granted in subscribe)", async function () {
    // subscriber was already subscribed in earlier tests — they should have ACL on the key.
    const keyHandle = await hush.getContentKey(creator.address);
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      keyHandle,
      hushAddress,
      subscriber
    );
    expect(decrypted).to.equal(1n);
  });

  // ============ Onchain earnings verification ============

  it("should verify aggregate == confidential balance (view)", async function () {
    const [aggHandle, balHandle] = await hush.verifyEarnings(creator.address);
    const agg = await fhevm.userDecryptEuint(FhevmType.euint64, aggHandle, hushAddress, creator);
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balHandle, tokenAddress, creator);
    expect(agg).to.equal(bal);
  });
});
