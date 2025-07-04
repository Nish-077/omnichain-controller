import { HardhatUserConfig } from 'hardhat/config'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import 'hardhat-deploy'
import 'dotenv/config'

// Ensure required environment variables are set
const ETHEREUM_SEPOLIA_RPC = process.env.ETHEREUM_SEPOLIA_RPC || 'https://rpc.sepolia.org'
const ETHEREUM_MAINNET_RPC = process.env.ETHEREUM_MAINNET_RPC || 'https://eth.llamarpc.com'
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x' + '0'.repeat(64)

// Account configuration
const accounts = PRIVATE_KEY !== '0x' + '0'.repeat(64) ? [PRIVATE_KEY] : []

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.22',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    // Ethereum Testnet
    'ethereum-sepolia': {
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      url: ETHEREUM_SEPOLIA_RPC,
      accounts,
      gasPrice: 'auto',
      gasMultiplier: 1.2,
    } as any,
    
    // Ethereum Mainnet
    'ethereum-mainnet': {
      eid: EndpointId.ETHEREUM_V2_MAINNET,
      url: ETHEREUM_MAINNET_RPC,
      accounts,
      gasPrice: 'auto',
      gasMultiplier: 1.1,
    } as any,
    
    // Hardhat local network
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    
    // Localhost for testing
    localhost: {
      url: 'http://127.0.0.1:8545',
      accounts,
    },
  },
  
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  
  // Mocha configuration
  mocha: {
    timeout: 60000,
  },
  
  // Paths configuration
  paths: {
    sources: './contracts/ethereum-dao/contracts',
    tests: './contracts/ethereum-dao/test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
