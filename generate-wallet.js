const { ethers } = require('ethers');

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('🔑 NEW TESTNET WALLET GENERATED:');
console.log('===============================');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('');
console.log('⚠️  SAVE THESE DETAILS SECURELY');
console.log('📋 Copy the ADDRESS to get Sepolia ETH from faucets');
console.log('🔐 Copy the PRIVATE KEY (remove the 0x prefix) to your .env file');
console.log('');
console.log('Next steps:');
console.log('1. Go to https://sepoliafaucet.com/ and paste the address');
console.log('2. Get 0.5 ETH from the faucet');
console.log('3. Add the private key to .env file (without 0x prefix)');
