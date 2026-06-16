import { task } from "hardhat/config";

task("deploy", "Deploys the Hush contract")
  .setAction(async (_, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

    const Hush = await hre.ethers.getContractFactory("Hush");
    const contract = await Hush.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`\nHush deployed to: ${address}`);
    console.log(`https://sepolia.etherscan.io/address/${address}`);
  });
