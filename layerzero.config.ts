import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

// Contract definitions for cross-chain communication
const ethereumSepoliaContract = {
  eid: EndpointId.SEPOLIA_V2_TESTNET, // Ethereum Sepolia testnet
  contractName: 'SolanaControllerDAOV2',
}

const ethereumMainnetContract = {
  eid: EndpointId.ETHEREUM_V2_MAINNET, // Ethereum mainnet
  contractName: 'SolanaControllerDAOV2',
}

// Enforced options for cross-chain messaging
// These ensure minimum gas/compute is allocated for message execution
const EVM_ENFORCED_OPTIONS = [
  {
    msgType: 1, // Standard message type
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 200000, // Gas for lzReceive execution
    value: 0, // No ETH value transfer
  },
  {
    msgType: 2, // Governance message type  
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 300000, // Higher gas for governance operations
    value: 0,
  },
]

// Simplified configuration export for EVM-only for now
// We'll add Solana configuration in Phase 2
export default async function () {
  return {
    contracts: [
      { contract: ethereumSepoliaContract },
      // Note: Solana contract will be added in Phase 2 when we implement Solana OApp standard
    ],
    connections: [
      // Cross-chain connections will be configured once both EVM and Solana OApps are ready
    ],
  }
}

// Export individual components for use in scripts
export {
  ethereumSepoliaContract,
  ethereumMainnetContract,
  EVM_ENFORCED_OPTIONS,
}
