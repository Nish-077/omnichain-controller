import { EndpointId } from '@layerzerolabs/lz-definitions'

// LayerZero Endpoint IDs - These are official LayerZero constants
export const ENDPOINT_IDS = {
  // Ethereum
  ETHEREUM_MAINNET: EndpointId.ETHEREUM_V2_MAINNET,     // 30101
  ETHEREUM_SEPOLIA: EndpointId.SEPOLIA_V2_TESTNET,     // 40161
  
  // Solana
  SOLANA_MAINNET: EndpointId.SOLANA_V2_MAINNET,        // 30168
  SOLANA_TESTNET: EndpointId.SOLANA_V2_TESTNET,        // 40168
  
  // Other popular chains (for future expansion)
  ARBITRUM_MAINNET: EndpointId.ARBITRUM_V2_MAINNET,    // 30110
  ARBITRUM_SEPOLIA: EndpointId.ARBSEP_V2_TESTNET,      // 40231
  OPTIMISM_MAINNET: EndpointId.OPTIMISM_V2_MAINNET,    // 30111
  OPTIMISM_SEPOLIA: EndpointId.OPTSEP_V2_TESTNET,      // 40232
  POLYGON_MAINNET: EndpointId.POLYGON_V2_MAINNET,      // 30109
  POLYGON_AMOY: EndpointId.AMOY_V2_TESTNET,            // 40267
  BSC_MAINNET: EndpointId.BSC_V2_MAINNET,              // 30102
  BSC_TESTNET: EndpointId.BSC_V2_TESTNET,              // 40102
  AVALANCHE_MAINNET: EndpointId.AVALANCHE_V2_MAINNET,  // 30106
  AVALANCHE_FUJI: EndpointId.AVALANCHE_V2_TESTNET,     // 40106
}

// Network configurations for different environments
export const NETWORK_CONFIGS = {
  testnet: {
    ethereum: {
      name: 'ethereum-sepolia',
      eid: ENDPOINT_IDS.ETHEREUM_SEPOLIA,
      rpc: process.env.ETHEREUM_SEPOLIA_RPC || 'https://rpc.sepolia.org',
      chainId: 11155111,
      explorer: 'https://sepolia.etherscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    solana: {
      name: 'solana-testnet',
      eid: ENDPOINT_IDS.SOLANA_TESTNET,
      rpc: process.env.SOLANA_TESTNET_RPC || 'https://api.testnet.solana.com',
      cluster: 'testnet',
      explorer: 'https://explorer.solana.com',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      },
    },
  },
  mainnet: {
    ethereum: {
      name: 'ethereum-mainnet',
      eid: ENDPOINT_IDS.ETHEREUM_MAINNET,
      rpc: process.env.ETHEREUM_MAINNET_RPC || 'https://eth.llamarpc.com',
      chainId: 1,
      explorer: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    solana: {
      name: 'solana-mainnet',
      eid: ENDPOINT_IDS.SOLANA_MAINNET,
      rpc: process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
      cluster: 'mainnet-beta',
      explorer: 'https://explorer.solana.com',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      },
    },
  },
}

// LayerZero DVN addresses for different networks
export const DVN_ADDRESSES = {
  ethereum: {
    mainnet: '0x589dEDbD617e0CBcB916A9223F4d1300c294236b',
    sepolia: '0x8eebf8b423B73bFCa51a1Db4B7354AA0bFCA9193',
  },
  solana: {
    mainnet: 'DVNhZXMudvw3Y8j8kGpLCUQQWfJPCCQhCvtGx4FmHrF',
    testnet: 'DVNhZXMudvw3Y8j8kGpLCUQQWfJPCCQhCvtGx4FmHrF',
  },
}

// LayerZero Endpoint contract addresses
export const ENDPOINT_ADDRESSES = {
  ethereum: {
    mainnet: '0x1a44076050125825900e736c501f859c50fE728c',
    sepolia: '0x6EDCE65403992e310A62460808c4b910D972f10f',
  },
  solana: {
    mainnet: 'LayerZeroEndpointV2Address', // Will be updated with actual address
    testnet: 'LayerZeroEndpointV2Address', // Will be updated with actual address
  },
}

// Gas/compute configurations
export const GAS_CONFIGS = {
  ethereum: {
    // Gas limits for different operations
    deployment: 3000000,
    setPeer: 100000,
    setConfig: 150000,
    sendMessage: 200000,
    lzReceive: 300000,
    // Gas prices (in gwei)
    testnet: {
      gasPrice: 20,
      maxFeePerGas: 50,
      maxPriorityFeePerGas: 2,
    },
    mainnet: {
      gasPrice: 30,
      maxFeePerGas: 100,
      maxPriorityFeePerGas: 5,
    },
  },
  solana: {
    // Compute unit limits
    deployment: 1000000,
    setPeer: 200000,
    setConfig: 300000,
    sendMessage: 400000,
    lzReceive: 600000,
    // Priority fees (in lamports)
    testnet: {
      computeUnitPrice: 1000,
    },
    mainnet: {
      computeUnitPrice: 5000,
    },
  },
}

// Configuration validation
export function validateNetworkConfig(env: 'testnet' | 'mainnet') {
  const config = NETWORK_CONFIGS[env]
  
  if (!config) {
    throw new Error(`Invalid environment: ${env}`)
  }
  
  // Check required environment variables
  const requiredVars = [
    'ETHEREUM_SEPOLIA_RPC',
    'ETHEREUM_MAINNET_RPC',
    'SOLANA_TESTNET_RPC',
    'SOLANA_MAINNET_RPC',
    'PRIVATE_KEY',
    'SOLANA_PRIVATE_KEY',
  ]
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`)
    console.warn('Please check your .env file and ensure all required variables are set.')
  }
  
  return config
}

// Get network config for a specific environment
export function getNetworkConfig(env: 'testnet' | 'mainnet' = 'testnet') {
  return validateNetworkConfig(env)
}

// Get endpoint ID for a specific network
export function getEndpointId(network: 'ethereum' | 'solana', env: 'testnet' | 'mainnet' = 'testnet') {
  const config = getNetworkConfig(env)
  return config[network].eid
}

// Get RPC URL for a specific network
export function getRpcUrl(network: 'ethereum' | 'solana', env: 'testnet' | 'mainnet' = 'testnet') {
  const config = getNetworkConfig(env)
  return config[network].rpc
}

// Get explorer URL for a specific network
export function getExplorerUrl(network: 'ethereum' | 'solana', env: 'testnet' | 'mainnet' = 'testnet') {
  const config = getNetworkConfig(env)
  return config[network].explorer
}

// Export all network configurations
export const networks = {
  ENDPOINT_IDS,
  NETWORK_CONFIGS,
  DVN_ADDRESSES,
  ENDPOINT_ADDRESSES,
  GAS_CONFIGS,
  getNetworkConfig,
  getEndpointId,
  getRpcUrl,
  getExplorerUrl
}
