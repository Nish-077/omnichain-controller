#!/bin/bash

# Deploy to Testnet (Solana Devnet + Ethereum Sepolia)
echo "🚀 Deploying Omnichain Controller to Testnet..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Node.js/NPM not found. Please install it first.${NC}"
    exit 1
fi

# Step 1: Configure Solana for devnet
echo -e "${YELLOW}📡 Configuring Solana for devnet...${NC}"
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Check balance and request airdrop if needed
echo -e "${YELLOW}💰 Checking Solana balance...${NC}"
BALANCE=$(solana balance --output json | jq '.value')
if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${YELLOW}🎯 Requesting SOL airdrop...${NC}"
    solana airdrop 2
    sleep 5
    solana airdrop 2
    echo -e "${GREEN}✅ Airdrop completed${NC}"
else
    echo -e "${GREEN}✅ Sufficient balance: $BALANCE SOL${NC}"
fi

# Step 2: Deploy Solana program
echo -e "${YELLOW}🔨 Building and deploying Solana program...${NC}"
anchor build

# Deploy to devnet
echo -e "${YELLOW}🚀 Deploying to Solana devnet...${NC}"
anchor deploy

# Get program ID
PROGRAM_ID=$(solana-keygen pubkey target/deploy/omnichain_controller-keypair.json)
echo -e "${GREEN}✅ Solana program deployed: $PROGRAM_ID${NC}"

# Step 3: Deploy Ethereum contracts to Sepolia
echo -e "${YELLOW}🔨 Deploying Ethereum contracts to Sepolia...${NC}"
cd contracts/ethereum-dao

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found in contracts/ethereum-dao${NC}"
    echo -e "${YELLOW}Please create .env with:${NC}"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io"
    echo "ETHERSCAN_API_KEY=your_etherscan_api_key"
    exit 1
fi

# Deploy to Sepolia
echo -e "${YELLOW}🚀 Deploying to Ethereum Sepolia...${NC}"
npx hardhat run scripts/deploy.js --network sepolia

echo -e "${GREEN}✅ Testnet deployment setup complete!${NC}"
echo -e "${YELLOW}📖 Check TESTNET_FUNDING_GUIDE.md for funding instructions${NC}"
echo -e "${YELLOW}🔗 Solana Program ID: $PROGRAM_ID${NC}"
echo -e "${YELLOW}🌐 Update frontend/.env with testnet configuration${NC}"
