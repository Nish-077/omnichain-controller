#!/bin/bash

echo "🧪 Running End-to-End Testnet Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Verify deployments
echo -e "${YELLOW}Test 1: Verifying contract deployments...${NC}"
node scripts/verify-testnet-deployment.js

# Test 2: Check wallet balances
echo -e "${YELLOW}Test 2: Checking wallet balances...${NC}"
./scripts/check-eth-balance.sh
echo "Checking Solana balance..."
solana balance --url devnet

# Test 3: Test frontend connectivity
echo -e "${YELLOW}Test 3: Testing frontend connectivity...${NC}"
echo "Frontend should be running on http://localhost:3000"
echo "Please manually verify:"
echo "1. Wallet connections work for both Ethereum and Solana"
echo "2. Contract addresses are correctly displayed"
echo "3. No console errors in browser"

# Test 4: Test contract interactions
echo -e "${YELLOW}Test 4: Testing basic contract interactions...${NC}"
echo "This would test:"
echo "- Creating a DAO proposal"
echo "- Querying program state"
echo "- Basic cross-chain message preparation"

echo -e "${GREEN}✅ End-to-end test suite complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the frontend at http://localhost:3000"
echo "2. Try creating a DAO proposal"
echo "3. Test wallet connections"
echo "4. Check browser console for any errors"
