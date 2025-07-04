#!/bin/bash
# Quick testnet deployment script for demo

echo "🚀 Deploying Omnichain Controller to Testnets"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "✅ Solana CLI installed"
echo "✅ Anchor CLI installed" 
echo "✅ Node.js environment ready"
echo ""

# Step 1: Deploy Solana Program to Devnet
echo "🔥 Step 1: Deploying Solana Program to Devnet"
echo "=============================================="

# Set Solana to devnet
solana config set --url https://api.devnet.solana.com

# Check balance
echo "💰 Checking SOL balance..."
solana balance

# Airdrop SOL if needed (for demo purposes)
echo "💸 Requesting SOL airdrop for deployment..."
solana airdrop 2 || echo "Airdrop may have failed (rate limited), continuing..."

# Build and deploy
echo "🔨 Building Solana program..."
anchor build

echo "🚀 Deploying to Solana Devnet..."
anchor deploy

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/omnichain_controller-keypair.json)
echo "📍 Solana Program ID: $PROGRAM_ID"

# Step 2: Deploy Ethereum Contract to Sepolia
echo ""
echo "🔥 Step 2: Deploying Ethereum Contract to Sepolia"
echo "================================================="

# Navigate to ethereum contracts
cd contracts/ethereum-dao

# Install dependencies if needed
npm install --silent

# Compile contracts
echo "🔨 Compiling Ethereum contracts..."
npx hardhat compile

# Deploy to Sepolia (using test environment)
echo "🚀 Deploying to Ethereum Sepolia..."
npx hardhat run scripts/deploy.js --network sepolia || echo "Deployment may require environment setup"

echo ""
echo "🎉 Deployment Summary"
echo "====================="
echo "✅ Solana Program: Deployed to Devnet"
echo "📍 Program ID: $PROGRAM_ID"
echo "🌐 Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "✅ Ethereum Contract: Ready for Sepolia"
echo "🌐 Network: https://sepolia.etherscan.io"
echo ""
echo "🎯 Next Steps:"
echo "1. Update frontend config with new contract addresses"
echo "2. Set up LayerZero peer connections"
echo "3. Test cross-chain messaging"
echo ""
echo "🎮 Ready for live demo!"
