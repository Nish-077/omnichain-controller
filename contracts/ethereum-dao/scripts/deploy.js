const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SolanaControllerDAOV2 to local network...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // Deploy Mock LayerZero Endpoint first (for local testing)
  console.log("\n🔧 Deploying Mock LayerZero Endpoint...");
  const MockEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
  const mockEndpoint = await MockEndpoint.deploy();
  await mockEndpoint.deployed();
  console.log("✅ Mock LayerZero Endpoint deployed to:", mockEndpoint.address);

  // Deploy the DAO contract
  console.log("\n🔧 Deploying SolanaControllerDAOV2...");
  const DAOContract = await ethers.getContractFactory("SolanaControllerDAOV2");
  
  // Constructor parameters
  const endpointAddress = mockEndpoint.address;
  const owner = deployer.address;
  const solanaEid = 40161; // Solana EID for testing
  const solanaController = "0x0000000000000000000000000000000000000000"; // Placeholder for testing
  
  const daoContract = await DAOContract.deploy(
    endpointAddress,
    owner,
    solanaEid,
    solanaController
  );
  await daoContract.deployed();
  
  console.log("✅ SolanaControllerDAOV2 deployed to:", daoContract.address);

  // Initialize the DAO (deployer is already added in constructor)
  console.log("\n🔧 Initializing DAO...");
  console.log("✅ Deployer already added as DAO member via constructor");

  // Log deployment info
  console.log("\n🎉 Deployment Summary");
  console.log("=====================");
  console.log("📍 DAO Contract:", daoContract.address);
  console.log("📍 Mock Endpoint:", mockEndpoint.address);
  console.log("👤 Owner:", owner);
  console.log("🌐 Network:", await ethers.provider.getNetwork());
  
  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    contracts: {
      dao: daoContract.address,
      mockEndpoint: mockEndpoint.address,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };
  
  const fs = require('fs');
  const path = require('path');
  
  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, '../../../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, 'localhost-ethereum-deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to deployments/localhost-ethereum-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
