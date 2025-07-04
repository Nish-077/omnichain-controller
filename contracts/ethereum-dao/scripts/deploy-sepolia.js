const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SolanaControllerDAOV2 to Sepolia testnet...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    throw new Error("❌ Insufficient ETH balance for deployment");
  }

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "| Chain ID:", network.chainId);

  // Deploy Mock LayerZero Endpoint for testing
  console.log("\n🔧 Deploying Mock LayerZero Endpoint...");
  const MockEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
  const mockEndpoint = await MockEndpoint.deploy();
  await mockEndpoint.deployed();
  console.log("✅ Mock LayerZero Endpoint deployed to:", mockEndpoint.address);

  // Deploy the DAO contract
  console.log("\n🔧 Deploying SolanaControllerDAOV2...");
  const DAOContract = await ethers.getContractFactory("SolanaControllerDAOV2");
  
  // Constructor parameters for testnet
  const endpointAddress = mockEndpoint.address;
  const owner = deployer.address;
  const solanaEid = 40161; // Solana Devnet EID
  const solanaController = "0x0000000000000000000000000000000000000001"; // Placeholder - will be updated later
  
  console.log("📋 Deployment parameters:");
  console.log("  - Endpoint:", endpointAddress);
  console.log("  - Owner:", owner);
  console.log("  - Solana EID:", solanaEid);
  console.log("  - Solana Controller:", solanaController);
  console.log("  - Solana Program ID:", "4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg");
  
  const daoContract = await DAOContract.deploy(
    endpointAddress,
    owner,
    solanaEid,
    solanaController
  );
  await daoContract.deployed();
  
  console.log("✅ SolanaControllerDAOV2 deployed to:", daoContract.address);

  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  const daoOwner = await daoContract.owner();
  const memberCount = await daoContract.memberCount();
  const isMember = await daoContract.members(deployer.address);
  
  console.log("✅ DAO Owner:", daoOwner);
  console.log("✅ Member Count:", memberCount.toString());
  console.log("✅ Deployer is member:", isMember);

  // Log deployment info for frontend
  console.log("\n🎉 Deployment Summary");
  console.log("=====================");
  console.log("📍 DAO Contract:", daoContract.address);
  console.log("📍 Mock Endpoint:", mockEndpoint.address);
  console.log("👤 Owner:", owner);
  console.log("🌐 Network:", network.name);
  console.log("⛓️  Chain ID:", network.chainId);
  console.log("🔗 Solana Program:", solanaController);
  
  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    daoContract: daoContract.address,
    mockEndpoint: mockEndpoint.address,
    owner: owner,
    solanaEid: solanaEid,
    solanaController: solanaController,
    solanaProgramId: "4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    transactionHash: daoContract.deployTransaction.hash
  };
  
  fs.writeFileSync(
    'deployments/sepolia-deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n💾 Deployment info saved to deployments/sepolia-deployment.json");
  console.log("🔧 Update your frontend config with the new contract address:");
  console.log(`   DAO Address: ${daoContract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
