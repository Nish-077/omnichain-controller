#!/bin/bash

# Generate Demo Accounts with Funding
echo "🎯 Generating Pre-funded Demo Accounts..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create demo accounts directory
mkdir -p demo-accounts

# Generate Solana accounts
echo -e "${YELLOW}🔑 Generating Solana demo accounts...${NC}"
for i in {1..5}; do
    echo "Generating Solana account $i..."
    solana-keygen new --outfile demo-accounts/solana-demo-$i.json --no-passphrase --force
    
    # Get public key
    PUBKEY=$(solana-keygen pubkey demo-accounts/solana-demo-$i.json)
    echo "Account $i: $PUBKEY"
    
    # Try to airdrop (may hit rate limits)
    echo "Requesting airdrop for account $i..."
    solana airdrop 2 $PUBKEY --url devnet || echo "Airdrop failed for account $i (rate limit)"
    
    sleep 2
done

# Generate Ethereum accounts (using Node.js)
echo -e "${YELLOW}🔑 Generating Ethereum demo accounts...${NC}"
cat > demo-accounts/generate-eth-accounts.js << 'EOF'
const { ethers } = require('ethers');
const fs = require('fs');

async function generateAccounts() {
    const accounts = [];
    
    for (let i = 1; i <= 5; i++) {
        const wallet = ethers.Wallet.createRandom();
        const account = {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic.phrase
        };
        
        accounts.push(account);
        
        // Save individual account
        fs.writeFileSync(`demo-accounts/ethereum-demo-${i}.json`, JSON.stringify(account, null, 2));
        console.log(`Generated Ethereum account ${i}: ${wallet.address}`);
    }
    
    // Save all accounts summary
    fs.writeFileSync('demo-accounts/ethereum-accounts-summary.json', JSON.stringify(accounts, null, 2));
    
    console.log('\n📋 Ethereum Demo Accounts Generated:');
    accounts.forEach((account, index) => {
        console.log(`Account ${index + 1}: ${account.address}`);
    });
    
    console.log('\n⚠️  IMPORTANT: Fund these accounts with Sepolia ETH from faucets:');
    console.log('   - https://sepolia-faucet.pk910.de/');
    console.log('   - https://sepoliafaucet.com/');
    console.log('   - https://faucets.chain.link/sepolia');
}

generateAccounts().catch(console.error);
EOF

# Install ethers if not present
if [ ! -d "node_modules/ethers" ]; then
    echo "Installing ethers..."
    npm install ethers
fi

# Run the Ethereum account generation
node demo-accounts/generate-eth-accounts.js

# Create accounts summary
echo -e "${YELLOW}📋 Creating accounts summary...${NC}"
cat > demo-accounts/README.md << 'EOF'
# Demo Accounts

## Solana Devnet Accounts
EOF

echo "| Account | Public Key | Private Key File |" >> demo-accounts/README.md
echo "|---------|------------|------------------|" >> demo-accounts/README.md

for i in {1..5}; do
    if [ -f "demo-accounts/solana-demo-$i.json" ]; then
        PUBKEY=$(solana-keygen pubkey demo-accounts/solana-demo-$i.json)
        echo "| Demo $i | $PUBKEY | solana-demo-$i.json |" >> demo-accounts/README.md
    fi
done

cat >> demo-accounts/README.md << 'EOF'

## Ethereum Sepolia Accounts
See `ethereum-accounts-summary.json` for details.

## Usage Instructions

### For Solana:
1. Import the private key JSON file into your wallet
2. Switch to Solana Devnet
3. Check balance and request more SOL if needed: `solana airdrop 2 <pubkey>`

### For Ethereum:
1. Import the private key into MetaMask
2. Switch to Sepolia testnet
3. Get testnet ETH from faucets listed in TESTNET_FUNDING_GUIDE.md

## Security Notice
⚠️ These are demo accounts with public keys. Never use these for mainnet or store real funds!

## Funding Status
Check balances with:
- Solana: `solana balance <pubkey> --url devnet`
- Ethereum: Use a block explorer like https://sepolia.etherscan.io/

## Auto-funding Script
Run `./scripts/fund-demo-accounts.sh` to automatically fund all accounts.
EOF

echo -e "${GREEN}✅ Demo accounts generated successfully!${NC}"
echo -e "${YELLOW}📁 Check demo-accounts/ directory for account details${NC}"
echo -e "${YELLOW}📖 Read demo-accounts/README.md for usage instructions${NC}"
echo -e "${RED}⚠️  Remember to fund Ethereum accounts from faucets!${NC}"
