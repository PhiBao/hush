import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/" + process.env.INFURA_API_KEY;
  const mnemonic = process.env.MNEMONIC || "test test test test test test test test test test test junk";

  if (!rpcUrl || rpcUrl.includes("undefined")) {
    console.error("Set SEPOLIA_RPC_URL or INFURA_API_KEY in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/0").connect(provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "Hush.sol", "Hush.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nHush deployed to: ${address}`);
  console.log(`https://sepolia.etherscan.io/address/${address}`);
}

main().catch(console.error);
