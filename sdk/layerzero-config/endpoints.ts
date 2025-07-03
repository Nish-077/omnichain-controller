/**
 * LayerZero V2 Endpoint Configuration
 * 
 * Official LayerZero V2 Endpoint IDs for testnet networks
 * Source: https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
 */

export interface EndpointConfig {
  name: string;
  chainId: number;
  endpointId: number;
  rpcUrl: string;
  endpointAddress: string;
  currency: string;
}

// LayerZero V2 Testnet Endpoints
export const LAYERZERO_ENDPOINTS = {
  // Ethereum Sepolia
  ETHEREUM_SEPOLIA: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    endpointId: 40161, // LayerZero V2 Sepolia EID
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    endpointAddress: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero V2 Sepolia Endpoint
    currency: "ETH"
  },

  // Solana Devnet
  SOLANA_DEVNET: {
    name: "Solana Devnet", 
    chainId: 901,
    endpointId: 40168, // LayerZero V2 Solana Devnet EID
    rpcUrl: "https://api.devnet.solana.com",
    endpointAddress: "7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH", // LayerZero V2 Solana Devnet Endpoint
    currency: "SOL"
  }
} as const;

// Helper functions
export function getEndpointByChainId(chainId: number): EndpointConfig | undefined {
  return Object.values(LAYERZERO_ENDPOINTS).find(endpoint => endpoint.chainId === chainId);
}

export function getEndpointByEid(endpointId: number): EndpointConfig | undefined {
  return Object.values(LAYERZERO_ENDPOINTS).find(endpoint => endpoint.endpointId === endpointId);
}

// Export commonly used endpoint IDs
export const ETHEREUM_SEPOLIA_EID = LAYERZERO_ENDPOINTS.ETHEREUM_SEPOLIA.endpointId;
export const SOLANA_DEVNET_EID = LAYERZERO_ENDPOINTS.SOLANA_DEVNET.endpointId;
