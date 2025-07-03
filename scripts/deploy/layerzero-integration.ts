import { ethers } from 'hardhat';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { LAYERZERO_ENDPOINTS, ETHEREUM_SEPOLIA_EID, SOLANA_DEVNET_EID } from '../../sdk/layerzero-config/endpoints';

/**
 * Comprehensive deployment script for LayerZero V2 integration
 * 
 * This script:
 * 1. Deploys Ethereum DAO contract with real LayerZero endpoint
 * 2. Deploys Solana program with LayerZero configuration
 * 3. Sets up peer connections between both chains
 * 4. Configures proper authority and security settings
 */

async function main() {
  console.log("🚀 Starting LayerZero V2 Integration Deployment");
  console.log("=================================================");

  // ========================================
  // 1. ETHEREUM DEPLOYMENT
  // ========================================
  console.log("\n📘 1. Deploying Ethereum DAO Contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // Deploy the DAO contract with real LayerZero endpoint
  const DAOFactory = await ethers.getContractFactory("SolanaControllerDAOV2");
  
  // Use real LayerZero V2 Sepolia endpoint
  const layerZeroEndpoint = LAYERZERO_ENDPOINTS.ETHEREUM_SEPOLIA.endpointAddress;
  const solanaEid = SOLANA_DEVNET_EID;
  
  // For now, use a placeholder Solana controller address (will be updated after Solana deployment)
  const placeholderSolanaController = "11111111111111111111111111111111";
  
  console.log(`LayerZero Endpoint: ${layerZeroEndpoint}`);
  console.log(`Solana EID: ${solanaEid}`);
  
  const dao = await DAOFactory.deploy(
    layerZeroEndpoint,
    deployer.address,
    solanaEid,
    placeholderSolanaController
  );
  
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  
  console.log(`✅ DAO deployed to: ${daoAddress}`);

  // ========================================
  // 2. SOLANA DEPLOYMENT  
  // ========================================
  console.log("\n🔵 2. Setting up Solana Program...");
  
  // Connect to Solana devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Set up Anchor provider (you'll need to configure your wallet)
  const wallet = new anchor.Wallet(Keypair.generate()); // Replace with actual wallet
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);
  
  console.log(`Solana wallet: ${wallet.publicKey.toString()}`);
  
  // Load the Solana program (assuming it's already deployed)
  // In a real scenario, you'd deploy it here or load existing deployment
  const programId = new PublicKey("YourSolanaProgramIdHere"); // Replace with actual program ID
  
  console.log(`✅ Solana program: ${programId.toString()}`);

  // ========================================
  // 3. LAYERZERO PEER SETUP
  // ========================================
  console.log("\n🌉 3. Setting up LayerZero Peer Connections...");
  
  // Convert Solana program ID to bytes32 format for Ethereum
  const solanaProgramBytes32 = ethers.zeroPadValue(
    `0x${programId.toBuffer().toString('hex')}`, 
    32
  );
  
  console.log(`Solana program as bytes32: ${solanaProgramBytes32}`);
  
  // Set peer on Ethereum side
  console.log("Setting Ethereum -> Solana peer...");
  const setPeerTx = await dao.setPeer(solanaEid, solanaProgramBytes32);
  await setPeerTx.wait();
  console.log(`✅ Peer set with transaction: ${setPeerTx.hash}`);
  
  // TODO: Set peer on Solana side (requires Solana program update)
  // This would involve calling a Solana instruction to set the Ethereum DAO as trusted peer
  
  // ========================================
  // 4. INITIAL CONFIGURATION
  // ========================================
  console.log("\n⚙️  4. Initial Configuration...");
  
  // Add some initial DAO members for testing
  const testMember1 = "0x742d35Cc6636C0532925A3b8D0AC6D1ddf4b5f42"; // Replace with actual address
  const testMember2 = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // Replace with actual address
  
  console.log("Adding initial DAO members...");
  if (testMember1 !== deployer.address) {
    const addMemberTx1 = await dao.addMember(testMember1);
    await addMemberTx1.wait();
    console.log(`✅ Added member: ${testMember1}`);
  }
  
  if (testMember2 !== deployer.address) {
    const addMemberTx2 = await dao.addMember(testMember2);
    await addMemberTx2.wait();
    console.log(`✅ Added member: ${testMember2}`);
  }

  // ========================================
  // 5. VERIFICATION
  // ========================================
  console.log("\n✅ 5. Deployment Verification...");
  
  const owner = await dao.owner();
  const memberCount = await dao.memberCount();
  const solanaEidCheck = await dao.SOLANA_EID();
  
  console.log(`DAO Owner: ${owner}`);
  console.log(`Member Count: ${memberCount}`);
  console.log(`Configured Solana EID: ${solanaEidCheck}`);
  
  // Test quote function
  const testMessage = ethers.toUtf8Bytes("test message");
  const quote = await dao.quote(testMessage);
  console.log(`Message quote - Native fee: ${ethers.formatEther(quote.nativeFee)} ETH`);

  // ========================================
  // 6. DEPLOYMENT SUMMARY
  // ========================================
  console.log("\n🎉 Deployment Complete!");
  console.log("========================");
  console.log(`Ethereum DAO: ${daoAddress}`);
  console.log(`Solana Program: ${programId.toString()}`);
  console.log(`Network: ${LAYERZERO_ENDPOINTS.ETHEREUM_SEPOLIA.name} <-> ${LAYERZERO_ENDPOINTS.SOLANA_DEVNET.name}`);
  console.log(`LayerZero Endpoint IDs: ${ETHEREUM_SEPOLIA_EID} <-> ${SOLANA_DEVNET_EID}`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update Solana program to set Ethereum DAO as trusted peer");
  console.log("2. Fund DAO contract with ETH for LayerZero fees");
  console.log("3. Create test proposal and verify cross-chain messaging");
  console.log("4. Set up cNFT collection on Solana for real updates");
  
  return {
    daoAddress,
    programId: programId.toString(),
    layerZeroEndpoint,
    solanaEid,
    ethereumEid: ETHEREUM_SEPOLIA_EID
  };
}

// Execute deployment
main()
  .then((result) => {
    console.log("\n✅ Deployment successful:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
