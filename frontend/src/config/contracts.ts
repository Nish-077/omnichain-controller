/**
 * @fileoverview Configuration for contract addresses and network settings
 * This file contains the deployed contract addresses and network configurations
 * for connecting the frontend to the backend contracts.
 */

// Contract addresses (will be updated with actual deployment addresses)
export const CONTRACTS = {
  // Ethereum contracts
  ethereum: {
    // Localhost/Hardhat
    localhost: {
      dao: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      mockEndpoint: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      chainId: 31337,
    },
    // Sepolia testnet (deployed!)
    sepolia: {
      dao: '0xA27Afea147b934E91699a668E04ac4ff12005a89',
      endpoint: '0x445d0031b065AC3Ba6e23d9A6D4a2843D52F8e4c',
      chainId: 11155111,
    },
  },
  // Solana program
  solana: {
    // Devnet
    devnet: {
      programId: '4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg',
      cluster: 'devnet',
    },
    // Localhost
    localhost: {
      programId: '4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg',
      cluster: 'localhost',
    },
  },
} as const

// Network configurations
export const NETWORKS = {
  ethereum: {
    localhost: {
      name: 'Localhost',
      chainId: 31337,
      rpcUrl: 'http://127.0.0.1:8545',
      blockExplorer: 'http://localhost:8545',
    },
    sepolia: {
      name: 'Sepolia',
      chainId: 11155111,
      rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-api-key',
      blockExplorer: 'https://sepolia.etherscan.io',
    },
  },
  solana: {
    devnet: {
      name: 'Devnet',
      cluster: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      blockExplorer: 'https://solscan.io',
    },
    localhost: {
      name: 'Localhost',
      cluster: 'localhost',
      rpcUrl: 'http://127.0.0.1:8899',
      blockExplorer: 'http://localhost:8899',
    },
  },
} as const

// LayerZero endpoint IDs
export const LAYERZERO_ENDPOINTS = {
  ethereum: {
    mainnet: 30101,
    sepolia: 40161,
  },
  solana: {
    mainnet: 30168,
    devnet: 40168,
  },
} as const

// Default network (can be changed based on environment)
export const DEFAULT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'localhost'

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    ethereum: CONTRACTS.ethereum.localhost,
    solana: CONTRACTS.solana.localhost,
    layerzero: {
      ethereum: LAYERZERO_ENDPOINTS.ethereum.sepolia,
      solana: LAYERZERO_ENDPOINTS.solana.devnet,
    },
  },
  production: {
    ethereum: CONTRACTS.ethereum.sepolia,
    solana: CONTRACTS.solana.devnet,
    layerzero: {
      ethereum: LAYERZERO_ENDPOINTS.ethereum.sepolia,
      solana: LAYERZERO_ENDPOINTS.solana.devnet,
    },
  },
} as const

// Get current environment configuration
export function getConfig() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  return ENV_CONFIG[env]
}

// Export types for TypeScript
export type NetworkType = keyof typeof NETWORKS.ethereum
export type SolanaCluster = keyof typeof NETWORKS.solana
export type ContractConfig = typeof CONTRACTS.ethereum.localhost
export type SolanaConfig = typeof CONTRACTS.solana.devnet
