/**
 * @fileoverview Utility functions for LayerZero OApp operations
 */

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { 
  MessagingFee, 
  CrossChainMessage, 
  NetworkConfig, 
  FeeEstimate,
  OAppError,
  OAppErrorCode 
} from '../types'
import { MessageCodec } from '../core/message-codec'

// ============================================================================
// Network Configuration Utilities
// ============================================================================

export class NetworkUtils {
  private static readonly NETWORK_CONFIGS: Record<string, NetworkConfig> = {
    'ethereum-sepolia': {
      name: 'Ethereum Sepolia',
      type: 'evm',
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      rpcUrl: 'https://rpc.sepolia.org',
      explorerUrl: 'https://sepolia.etherscan.io',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    },
    'ethereum-mainnet': {
      name: 'Ethereum Mainnet',
      type: 'evm',
      eid: EndpointId.ETHEREUM_V2_MAINNET,
      rpcUrl: 'https://eth.llamarpc.com',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    },
    'solana-testnet': {
      name: 'Solana Testnet',
      type: 'solana',
      eid: EndpointId.SOLANA_V2_TESTNET,
      rpcUrl: 'https://api.testnet.solana.com',
      faucetUrl: 'https://faucet.solana.com',
      explorerUrl: 'https://explorer.solana.com',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9
      }
    },
    'solana-mainnet': {
      name: 'Solana Mainnet',
      type: 'solana',
      eid: EndpointId.SOLANA_V2_MAINNET,
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://explorer.solana.com',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9
      }
    }
  }

  /**
   * Get network configuration by name
   */
  static getNetworkConfig(networkName: string): NetworkConfig {
    const config = this.NETWORK_CONFIGS[networkName]
    if (!config) {
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `Unknown network: ${networkName}`
      )
    }
    return config
  }

  /**
   * Get network configuration by endpoint ID
   */
  static getNetworkByEid(eid: EndpointId): NetworkConfig {
    const config = Object.values(this.NETWORK_CONFIGS).find(c => c.eid === eid)
    if (!config) {
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `Unknown endpoint ID: ${eid}`
      )
    }
    return config
  }

  /**
   * Get all available networks
   */
  static getAllNetworks(): Record<string, NetworkConfig> {
    return { ...this.NETWORK_CONFIGS }
  }

  /**
   * Get testnet networks only
   */
  static getTestnetNetworks(): Record<string, NetworkConfig> {
    return Object.fromEntries(
      Object.entries(this.NETWORK_CONFIGS).filter(([name]) => 
        name.includes('sepolia') || name.includes('testnet')
      )
    )
  }

  /**
   * Get mainnet networks only
   */
  static getMainnetNetworks(): Record<string, NetworkConfig> {
    return Object.fromEntries(
      Object.entries(this.NETWORK_CONFIGS).filter(([name]) => 
        name.includes('mainnet')
      )
    )
  }

  /**
   * Check if two networks are compatible for cross-chain communication
   */
  static areNetworksCompatible(srcNetwork: string, dstNetwork: string): boolean {
    const srcConfig = this.getNetworkConfig(srcNetwork)
    const dstConfig = this.getNetworkConfig(dstNetwork)
    
    // Same network type is not cross-chain
    if (srcConfig.type === dstConfig.type) {
      return false
    }
    
    // Both must be testnet or both mainnet
    const srcIsTestnet = srcNetwork.includes('sepolia') || srcNetwork.includes('testnet')
    const dstIsTestnet = dstNetwork.includes('sepolia') || dstNetwork.includes('testnet')
    
    return srcIsTestnet === dstIsTestnet
  }
}

// ============================================================================
// Fee Calculation Utilities
// ============================================================================

export class FeeCalculator {
  private static readonly BASE_FEE_ESTIMATES = {
    // EVM -> Solana fees (in wei)
    'ethereum-sepolia->solana-testnet': {
      base: BigInt('50000000000000000'), // 0.05 ETH
      perByte: BigInt('1000000000000'), // 0.001 ETH per KB
    },
    'ethereum-mainnet->solana-mainnet': {
      base: BigInt('20000000000000000'), // 0.02 ETH
      perByte: BigInt('500000000000'), // 0.0005 ETH per KB
    },
    // Solana -> EVM fees (in lamports)
    'solana-testnet->ethereum-sepolia': {
      base: BigInt('50000000'), // 0.05 SOL
      perByte: BigInt('10000'), // 0.01 SOL per KB
    },
    'solana-mainnet->ethereum-mainnet': {
      base: BigInt('20000000'), // 0.02 SOL
      perByte: BigInt('5000'), // 0.005 SOL per KB
    }
  }

  /**
   * Estimate fee for sending a message
   */
  static estimateMessageFee(
    srcNetwork: string,
    dstNetwork: string,
    message: CrossChainMessage
  ): FeeEstimate {
    const route = `${srcNetwork}->${dstNetwork}`
    const feeConfig = this.BASE_FEE_ESTIMATES[route as keyof typeof this.BASE_FEE_ESTIMATES]
    
    if (!feeConfig) {
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `No fee configuration for route: ${route}`
      )
    }

    const messageSize = MessageCodec.getMessageSize(message)
    const sizeInKB = Math.ceil(messageSize / 1024)
    
    const nativeFee = feeConfig.base + (feeConfig.perByte * BigInt(sizeInKB))
    
    return {
      srcNetwork,
      dstNetwork,
      message,
      estimatedFee: {
        nativeFee,
        lzTokenFee: 0n // Currently not using LZ tokens
      }
    }
  }

  /**
   * Estimate fee for batch operations
   */
  static estimateBatchFee(
    srcNetwork: string,
    operations: Array<{ dstNetwork: string; message: CrossChainMessage }>
  ): MessagingFee {
    let totalNativeFee = 0n
    let totalLzTokenFee = 0n

    for (const op of operations) {
      const estimate = this.estimateMessageFee(srcNetwork, op.dstNetwork, op.message)
      totalNativeFee += estimate.estimatedFee.nativeFee
      totalLzTokenFee += estimate.estimatedFee.lzTokenFee
    }

    // Apply batch discount (5% off for 3+ operations)
    if (operations.length >= 3) {
      totalNativeFee = (totalNativeFee * 95n) / 100n
    }

    return {
      nativeFee: totalNativeFee,
      lzTokenFee: totalLzTokenFee
    }
  }

  /**
   * Add buffer to fee estimate for volatility
   */
  static addFeeBuffer(fee: MessagingFee, bufferPercent: number = 10): MessagingFee {
    const multiplier = BigInt(100 + bufferPercent)
    return {
      nativeFee: (fee.nativeFee * multiplier) / 100n,
      lzTokenFee: (fee.lzTokenFee * multiplier) / 100n
    }
  }

  /**
   * Convert fee to human-readable format
   */
  static formatFee(fee: MessagingFee, networkName: string): string {
    const config = NetworkUtils.getNetworkConfig(networkName)
    const decimals = config.nativeCurrency.decimals
    const symbol = config.nativeCurrency.symbol
    
    const nativeAmount = Number(fee.nativeFee) / Math.pow(10, decimals)
    
    if (fee.lzTokenFee > 0n) {
      const lzAmount = Number(fee.lzTokenFee) / Math.pow(10, decimals)
      return `${nativeAmount.toFixed(6)} ${symbol} + ${lzAmount.toFixed(6)} LZ`
    }
    
    return `${nativeAmount.toFixed(6)} ${symbol}`
  }
}

// ============================================================================
// Message Validation Utilities
// ============================================================================

export class ValidationUtils {
  /**
   * Validate cross-chain route
   */
  static validateRoute(srcNetwork: string, dstNetwork: string): boolean {
    try {
      if (!NetworkUtils.areNetworksCompatible(srcNetwork, dstNetwork)) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Invalid route: ${srcNetwork} -> ${dstNetwork}`
        )
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate message for specific route
   */
  static validateMessageForRoute(
    message: CrossChainMessage,
    srcNetwork: string,
    dstNetwork: string
  ): boolean {
    try {
      // Validate route
      this.validateRoute(srcNetwork, dstNetwork)
      
      // Validate message structure
      MessageCodec.validate(message)
      
      // Route-specific validations
      const dstConfig = NetworkUtils.getNetworkConfig(dstNetwork)
      
      // Check message size limits for specific networks
      const messageSize = MessageCodec.getMessageSize(message)
      if (dstConfig.type === 'solana' && messageSize > 1232) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Message too large for Solana: ${messageSize} bytes (max 1232)`
        )
      }
      
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate Ethereum address
   */
  static isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  /**
   * Validate Solana public key
   */
  static isValidSolanaPublicKey(pubkey: string): boolean {
    try {
      // Basic base58 validation
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)
    } catch {
      return false
    }
  }

  /**
   * Validate endpoint ID
   */
  static isValidEndpointId(eid: number): boolean {
    return Object.values(EndpointId).includes(eid as EndpointId)
  }
}

// ============================================================================
// Retry and Connection Utilities
// ============================================================================

export class RetryUtils {
  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === maxAttempts) {
          throw new OAppError(
            OAppErrorCode.NETWORK_ERROR,
            `Failed after ${maxAttempts} attempts: ${lastError.message}`,
            { attempts: maxAttempts, lastError }
          )
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  /**
   * Create timeout promise
   */
  static timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    })

    return Promise.race([promise, timeoutPromise])
  }
}

// ============================================================================
// Logging Utilities
// ============================================================================

export class Logger {
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'

  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level
  }

  static debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(`[OApp SDK Debug] ${message}`, ...args)
    }
  }

  static info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`[OApp SDK Info] ${message}`, ...args)
    }
  }

  static warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[OApp SDK Warn] ${message}`, ...args)
    }
  }

  static error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[OApp SDK Error] ${message}`, ...args)
    }
  }

  private static shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }
}
