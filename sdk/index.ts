/**
 * @fileoverview LayerZero OApp SDK - Main export file
 * Provides unified interface for cross-chain operations on EVM and Solana
 * 
 * This is a basic working version of the SDK with core functionality.
 * Additional features and full type safety will be added in future iterations.
 */

// Core exports
export { MessageCodec } from './core/message-codec'

// Client exports
export { EvmOAppClient as EVMClient } from './clients/evm-client'

// Type exports
export * from './types'

// Utility exports
export * from './utils'

// Configuration exports
export { networks } from '../config/networks'

// Import classes for factory functions
import { EvmOAppClient } from './clients/evm-client'
import { MessageCodec } from './core/message-codec'
import { networks } from '../config/networks'

// Factory function for EVM client
export async function createEVMClient(config: any) {
  return new EvmOAppClient(config)
}

// Factory function for Solana client (dynamic import to avoid compilation issues)
export async function createSolanaClient(config: any) {
  try {
    const { SolanaOAppClient } = await import('./clients/solana-client')
    return new SolanaOAppClient(config)
  } catch (error) {
    console.warn('Solana client is not available due to compilation issues:', error)
    throw new Error('Solana client temporarily unavailable. Please use EVM client for now.')
  }
}

/**
 * Basic SDK class with essential functionality
 */
export class LayerZeroSDK {
  private evmClient?: EvmOAppClient
  private messageCodec: MessageCodec

  constructor() {
    this.messageCodec = new MessageCodec()
  }

  /**
   * Initialize EVM client
   */
  async initEVM(config: any) {
    this.evmClient = await createEVMClient(config)
    return this.evmClient
  }

  /**
   * Get EVM client instance
   */
  getEVMClient() {
    if (!this.evmClient) {
      throw new Error('EVM client not initialized. Call initEVM() first.')
    }
    return this.evmClient
  }

  /**
   * Get message codec instance
   */
  getMessageCodec() {
    return this.messageCodec
  }

  /**
   * Get network configurations
   */
  getNetworks() {
    return networks
  }
}

// Default export
export default {
  MessageCodec,
  EvmOAppClient,
  EVMClient: EvmOAppClient,
  LayerZeroSDK,
  createEVMClient,
  createSolanaClient,
  networks
}

// Export SDK for convenience
export { LayerZeroSDK as OAppSDK }
