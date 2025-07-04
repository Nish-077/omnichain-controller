// Quick localhost demo script
const { ethers } = require('ethers');
const { Connection, clusterApiUrl } = require('@solana/web3.js');

async function runLocalDemo() {
  console.log('🎬 Running Localhost Demo...\n');
  
  try {
    // Test Ethereum connection
    console.log('🔗 Testing Ethereum localhost connection...');
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const network = await provider.getNetwork();
    console.log(`✅ Connected to Ethereum network: ${network.name} (Chain ID: ${network.chainId})\n`);
    
    // Test Solana connection
    console.log('🔗 Testing Solana localhost connection...');
    const connection = new Connection('http://localhost:8899', 'confirmed');
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana network: ${JSON.stringify(version)}\n`);
    
    // Check accounts
    console.log('👛 Checking accounts...');
    const accounts = await provider.listAccounts();
    console.log(`💰 Ethereum accounts available: ${accounts.length}`);
    if (accounts.length > 0) {
      const balance = await provider.getBalance(accounts[0]);
      console.log(`💰 First account balance: ${ethers.utils.formatEther(balance)} ETH`);
    }
    
    console.log('\n🎉 Localhost demo environment is ready!');
    console.log('📋 Next steps:');
    console.log('   1. Run anchor tests: anchor test --skip-local-validator');
    console.log('   2. Deploy contracts: npm run deploy:localhost');
    console.log('   3. Test cross-chain: npm run test:cross-chain');
    
  } catch (error) {
    console.error('❌ Demo setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure Solana test validator is running: solana-test-validator');
    console.log('   - Make sure Hardhat network is running: npx hardhat node');
    console.log('   - Check that ports 8545 and 8899 are not in use');
  }
}

runLocalDemo();
