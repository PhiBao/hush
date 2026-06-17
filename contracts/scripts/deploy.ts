import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Sepolia cUSDT (Mock) — verified live ERC-7984 confidential token.
const SEPOLIA_CUSDT = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
const SEPOLIA_CUSDT_UNDERLYING = "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0";

async function main() {
  const rpcUrl =
    process.env.SEPOLIA_RPC_URL ||
    "https://sepolia.infura.io/v3/" + process.env.INFURA_API_KEY ||
    "https://ethereum-sepolia-rpc.publicnode.com";
  const pk = process.env.DEPLOYER_PK;
  if (!pk) {
    console.error("Set DEPLOYER_PK in env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "Hush.sol", "Hush.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log(`\nDeploying Hush (paymentToken=${SEPOLIA_CUSDT})...`);
  const contract = await factory.deploy(SEPOLIA_CUSDT);
  console.log(`Tx hash: ${contract.deploymentTransaction()?.hash}`);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nHush deployed to: ${address}`);
  console.log(`https://sepolia.etherscan.io/address/${address}`);

  // Seed a demo creator so the feed isn't empty.
  const hush = new ethers.Contract(address, artifact.abi, wallet);
  await (await hush.registerCreator("Alice Crypto", "Onchain researcher & FHE educator", { gasLimit: 500000 })).wait();
  console.log("Creator: Alice Crypto registered");

  await (
    await hush.addTier("Supporter", 100n, 30n * 86400n, "Early access to research notes", { gasLimit: 500000 })
  ).wait();
  await (
    await hush.addTier("Patron", 500n, 30n * 86400n, "Monthly deep dives + private Q&A", { gasLimit: 500000 })
  ).wait();
  console.log("2 tiers added (Supporter 100, Patron 500). Ready!");

  console.log(`\nSet in frontend/.env.local:`);
  console.log(`NEXT_PUBLIC_HUSH_CONTRACT=${address}`);
  console.log(`NEXT_PUBLIC_PAYMENT_TOKEN=${SEPOLIA_CUSDT}`);
  console.log(`NEXT_PUBLIC_PAYMENT_TOKEN_UNDERLYING=${SEPOLIA_CUSDT_UNDERLYING}`);
}

main().catch((e) => {
  console.error(e?.shortMessage || e?.message || e);
  process.exit(1);
});
