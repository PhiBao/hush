import { task } from "hardhat/config";

const CUSDT = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";

task("deploy", "Deploys the Hush contract with the Sepolia cUSDT payment token")
  .addOptionalParam("token", "Payment token address", CUSDT)
  .setAction(async ({ token }, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);
    console.log(`Payment token: ${token}`);

    const Hush = await hre.ethers.getContractFactory("Hush");
    const contract = await Hush.deploy(token);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`\nHush deployed to: ${address}`);
    console.log(`https://sepolia.etherscan.io/address/${address}`);
  });
