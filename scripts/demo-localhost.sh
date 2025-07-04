#!/bin/bash

echo "🎬 Starting Complete Localhost Demo..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "solana-test-validator" 2>/dev/null || true
pkill -f "hardhat node" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

# Start fresh
echo "🧹 Cleaning up build artifacts..."
rm -rf ./deployments/localhost-* 2>/dev/null || true
rm -rf ./cache 2>/dev/null || true
rm -rf ./artifacts 2>/dev/null || true

# 1. Start Solana validator
echo "🚀 Starting Solana local validator..."
solana-test-validator --reset --quiet &
SOLANA_PID=$!
echo "Solana validator PID: $SOLANA_PID"
sleep 8

# 2. Set Solana config to localhost
echo "⚙️ Configuring Solana for localhost..."
solana config set --url localhost

# 3. Fund Solana wallet
echo "💰 Funding Solana wallet..."
solana airdrop 10 || echo "Airdrop failed, continuing..."

# 4. Start Hardhat network
echo "🚀 Starting Hardhat local network..."
npx hardhat node &
HARDHAT_PID=$!
echo "Hardhat network PID: $HARDHAT_PID"
sleep 5

# 5. Deploy Solana program
echo "🏗️ Building and deploying Solana program..."
anchor build
anchor deploy

# 6. Deploy EVM contracts (we'll create a simple version)
echo "🏗️ Deploying EVM contracts to localhost..."
npx hardhat run scripts/deploy-localhost-simple.js --network localhost

# 7. Run basic tests
echo "🧪 Running localhost tests..."
anchor test --skip-local-validator

echo "🎉 Demo is ready!"
echo "📱 Solana Local Validator: http://localhost:8899"
echo "🌐 Ethereum Local Network: http://localhost:8545"
echo ""
echo "✅ All services are running. Check the output above for any errors."
echo "🔍 Run 'solana logs' in another terminal to see Solana program logs"
echo "🔍 Check the Hardhat terminal for Ethereum transaction logs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
trap 'echo "🛑 Stopping services..."; kill $SOLANA_PID $HARDHAT_PID 2>/dev/null || true; echo "✅ All services stopped."; exit' INT
wait
