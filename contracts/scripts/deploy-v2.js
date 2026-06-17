const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PK, provider);

  console.log("Deployer:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const artifact = JSON.parse(
    fs.readFileSync("artifacts/contracts/Hush.sol/Hush.json", "utf8")
  );

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying...");
  const contract = await factory.deploy({ gasLimit: 5000000 });
  console.log("Tx hash:", contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nHush v2 deployed to:", address);
  console.log("https://sepolia.etherscan.io/address/" + address);

  const hush = new ethers.Contract(address, artifact.abi, wallet);
  await (
    await hush.registerCreator("Alice Crypto", "Onchain researcher and educator", {
      gasLimit: 500000,
    })
  ).wait();
  console.log("Creator: Alice Crypto registered");

  await (
    await hush.addTier("Supporter", 100n, 30n * 86400n, "Early access to research", {
      gasLimit: 500000,
    })
  ).wait();
  await (
    await hush.addTier("Patron", 500n, 30n * 86400n, "Monthly deep dives + Q&A", {
      gasLimit: 500000,
    })
  ).wait();
  console.log("2 tiers added. Ready!");
}

main().catch((e) => {
  console.error(e?.shortMessage || e?.message || e);
  process.exit(1);
});
