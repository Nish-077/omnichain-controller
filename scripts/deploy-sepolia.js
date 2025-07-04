async function main() {
  console.log("🚀 Deploying Ethereum contracts to Sepolia...")
  
  const [deployer] = await ethers.getSigners()
  console.log("Deploying contracts with account:", deployer.address)
  console.log("Account balance:", (await deployer.getBalance()).toString())

  // Deploy the DAO contract
  console.log("\n📋 Deploying SolanaControllerDAOV2...")
  const SolanaControllerDAO = await ethers.getContractFactory("SolanaControllerDAOV2")
  
  // Constructor parameters - adjust as needed
  const daoContract = await SolanaControllerDAO.deploy()
  await daoContract.deployed()
  
  console.log("✅ SolanaControllerDAOV2 deployed to:", daoContract.address)
  
  // Add the deployer as a DAO member
  console.log("\n👥 Adding deployer as DAO member...")
  const addMemberTx = await daoContract.addDAOMember(deployer.address)
  await addMemberTx.wait()
  console.log("✅ Deployer added as DAO member")
  
  // Log deployment info
  console.log("\n📝 Deployment Summary:")
  console.log("======================")
  console.log("Network: Sepolia")
  console.log("DAO Contract:", daoContract.address)
  console.log("Deployer:", deployer.address)
  console.log("Transaction Hash:", daoContract.deployTransaction.hash)
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    daoAddress: daoContract.address,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: daoContract.deployTransaction.hash
  }
  
  require('fs').writeFileSync(
    'deployments/sepolia-deployment.json', 
    JSON.stringify(deploymentInfo, null, 2)
  )
  
  console.log("✅ Deployment info saved to deployments/sepolia-deployment.json")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
