const { ethers } = require('ethers');
const { Connection, PublicKey } = require('@solana/web3.js');

// Contract addresses from deployment
const ETHEREUM_CONTRACTS = {
  dao: '0xA27Afea147b934E91699a668E04ac4ff12005a89',
  mockEndpoint: '0x445d0031b065AC3Ba6e23d9A6D4a2843D52f8e4c'
};

const SOLANA_PROGRAM_ID = '4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg';

async function verifyEthereumContracts() {
  console.log('🔍 Verifying Ethereum contracts on Sepolia...');
  
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
  
  try {
    // Check if contracts exist
    const daoCode = await provider.getCode(ETHEREUM_CONTRACTS.dao);
    const endpointCode = await provider.getCode(ETHEREUM_CONTRACTS.mockEndpoint);
    
    console.log('✅ DAO Contract deployed:', daoCode !== '0x');
    console.log('✅ Mock Endpoint deployed:', endpointCode !== '0x');
    
    // Get contract balance
    const daoBalance = await provider.getBalance(ETHEREUM_CONTRACTS.dao);
    console.log('💰 DAO Contract Balance:', ethers.utils.formatEther(daoBalance), 'ETH');
    
  } catch (error) {
    console.error('❌ Error verifying Ethereum contracts:', error.message);
  }
}

async function verifySolanaProgram() {
  console.log('🔍 Verifying Solana program on Devnet...');
  
  const connection = new Connection('https://api.devnet.solana.com');
  
  try {
    const programId = new PublicKey(SOLANA_PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(programId);
    
    console.log('✅ Solana Program deployed:', accountInfo !== null);
    console.log('📊 Program executable:', accountInfo?.executable || false);
    
  } catch (error) {
    console.error('❌ Error verifying Solana program:', error.message);
  }
}

async function main() {
  console.log('🚀 Verifying Testnet Deployments...\n');
  
  await verifyEthereumContracts();
  console.log('');
  await verifySolanaProgram();
  
  console.log('\n✨ Verification complete!');
}

main().catch(console.error);
