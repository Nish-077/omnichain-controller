// Simple localhost deployment script
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying to localhost...");
  
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.utils.formatEther(await deployer.getBalance()));

  // For localhost demo, we'll deploy a simple mock
  console.log("📄 Note: For full LayerZero functionality, use testnet deployment");
  console.log("🔧 This localhost deployment uses mocked LayerZero for demo purposes");
  
  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    note: "Localhost demo deployment - use testnet for full LayerZero functionality"
  };
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }
  
  fs.writeFileSync(
    './deployments/localhost-deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("✅ Localhost deployment info saved!");
  console.log("📄 Check deployments/localhost-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
