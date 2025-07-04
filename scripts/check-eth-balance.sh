#!/bin/bash

# Quick balance checker for your testnet wallet
echo "🔍 Checking Ethereum Sepolia Balance..."
echo "======================================="

node -e "
const { ethers } = require('ethers');
async function checkBalance() {
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.public.blastapi.io');
    const address = '0x9c2093457C7AB191fB3E0739Ca162F11Bec08153';
    
    try {
        console.log('Wallet Address:', address);
        
        // Check balance
        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.utils.formatEther(balance);
        console.log('Current Balance:', balanceInEth, 'ETH');
        
        // Check latest block to ensure connection
        const blockNumber = await provider.getBlockNumber();
        console.log('Latest Block:', blockNumber);
        
        // Status check
        if (parseFloat(balanceInEth) >= 0.1) {
            console.log('');
            console.log('✅ READY FOR DEPLOYMENT!');
            console.log('🚀 You can now deploy Ethereum contracts');
        } else if (parseFloat(balanceInEth) > 0) {
            console.log('');
            console.log('⚠️  PARTIAL FUNDING');
            console.log('💡 Need at least 0.1 ETH for deployment');
        } else {
            console.log('');
            console.log('❌ NO FUNDING YET');
            console.log('💡 Get ETH from: https://sepoliafaucet.com/');
        }
        
        console.log('');
        console.log('🔗 View on Etherscan: https://sepolia.etherscan.io/address/' + address);
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('💡 Check your internet connection');
    }
}
checkBalance();
"
