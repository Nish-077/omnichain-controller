import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // For deployment, you would use real LayerZero endpoint addresses:
  // Ethereum Mainnet: 0x1a44076050125825900e736c501f859c50fE728c
  // Ethereum Sepolia: 0x6EDCE65403992e310A62460808c4b910D972f10f
  
  const LAYERZERO_ENDPOINT = "0x6EDCE65403992e310A62460808c4b910D972f10f"; // Sepolia
  const SOLANA_EID = 30168; // Solana mainnet endpoint ID
  const SOLANA_CONTROLLER = "YOUR_SOLANA_PROGRAM_ADDRESS"; // Replace with actual program address

  // Deploy the DAO contract
  const DAOFactory = await ethers.getContractFactory("SolanaControllerDAOV2");
  const dao = await DAOFactory.deploy(
    LAYERZERO_ENDPOINT,
    deployer.address,
    SOLANA_EID,
    SOLANA_CONTROLLER
  );

  await dao.waitForDeployment();

  console.log("SolanaControllerDAOV2 deployed to:", await dao.getAddress());
  console.log("Owner:", await dao.owner());
  console.log("Member count:", await dao.memberCount());

  // Verify the deployment
  console.log("\n=== Deployment Verification ===");
  console.log("Solana EID:", await dao.SOLANA_EID());
  console.log("Solana Controller:", await dao.SOLANA_CONTROLLER());
  console.log("Is deployer a member?", await dao.members(deployer.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
