import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Hush } from "../types/contracts/Hush";

describe("Hush", function () {
  let hush: Hush;
  let hushAddress: string;
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

    const factory = await ethers.getContractFactory("Hush");
    hush = (await factory.deploy()) as unknown as Hush;
    hushAddress = await hush.getAddress();
    await hush.waitForDeployment();
  });

  it("should register a creator", async function () {
    await hush.connect(creator).registerCreator("Alice", "Content creator");
    const c = await hush.creators(creator.address);
    expect(c.name).to.equal("Alice");
    expect(c.registered).to.be.true;
  });

  it("should reject duplicate registration", async function () {
    await expect(
      hush.connect(creator).registerCreator("Alice2", "bio2")
    ).to.be.revertedWith("Already registered");
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

  it("should allow subscription with encrypted amount", async function () {
    const encryptedPayment = await fhevm
      .createEncryptedInput(hushAddress, subscriber.address)
      .add64(100n)
      .encrypt();

    await hush.connect(subscriber).subscribe(
      creator.address,
      1,
      encryptedPayment.handles[0],
      encryptedPayment.inputProof
    );

    const expiry = await hush.subscriptionExpiry(creator.address, subscriber.address);
    expect(expiry).to.be.gt(0);

    const isSubbed = await hush.isSubscribed(creator.address, subscriber.address);
    expect(isSubbed).to.be.true;
  });

  it("should track encrypted earnings", async function () {
    const earnings = await hush.getCreatorEarnings(creator.address);

    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      earnings,
      hushAddress,
      creator
    );
    expect(decrypted).to.equal(100n);
  });

  it("should reject subscription from unregistered creator", async function () {
    const encryptedPayment = await fhevm
      .createEncryptedInput(hushAddress, subscriber.address)
      .add64(100n)
      .encrypt();

    await expect(
      hush.connect(subscriber).subscribe(
        owner.address,
        0,
        encryptedPayment.handles[0],
        encryptedPayment.inputProof
      )
    ).to.be.revertedWith("Creator not registered");
  });

  it("should reject self-subscription", async function () {
    const encryptedPayment = await fhevm
      .createEncryptedInput(hushAddress, creator.address)
      .add64(100n)
      .encrypt();

    await expect(
      hush.connect(creator).subscribe(
        creator.address,
        1,
        encryptedPayment.handles[0],
        encryptedPayment.inputProof
      )
    ).to.be.revertedWith("Cannot subscribe to yourself");
  });

  it("should track total subscriptions", async function () {
    expect(await hush.totalSubscriptions()).to.equal(1n);
  });

  it("should track total creators", async function () {
    expect(await hush.totalCreators()).to.equal(1n);
  });
});
