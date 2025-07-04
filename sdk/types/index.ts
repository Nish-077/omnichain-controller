/**
 * @fileoverview Comprehensive TypeScript types for LayerZero OApp cross-chain operations
 */

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { PublicKey } from '@solana/web3.js'

// ============================================================================
// Core LayerZero Types
// ============================================================================

export interface LayerZeroConfig {
  endpoints: Record<string, {
    eid: EndpointId
    rpcUrl: string
    contractAddress?: string
    programId?: string
  }>
}

export interface MessagingFee {
  nativeFee: bigint
  lzTokenFee: bigint
}

export interface Origin {
  srcEid: number
  sender: Uint8Array
  nonce: bigint
}

// ============================================================================
// Cross-Chain Message Types
// ============================================================================

export enum MessageCommand {
  UPDATE_COLLECTION_METADATA = 0,
  BATCH_UPDATE_CNFTS = 1,
  TRANSFER_AUTHORITY = 2,
  EMERGENCY_PAUSE = 3,
  EMERGENCY_UNPAUSE = 4,
}

export interface CrossChainMessage {
  command: MessageCommand
  nonce: bigint
  timestamp: bigint
  version: number
  payload: Uint8Array
}

export interface EncodedMessage {
  message: Uint8Array
  options: Uint8Array
  fee: MessagingFee
}

// ============================================================================
// EVM-specific Types
// ============================================================================

export interface EvmConfig {
  chainId: number
  rpcUrl: string
  contractAddress: string
  privateKey?: string
  gasLimit?: bigint
  gasPrice?: bigint
}

export interface EvmProposal {
  id: bigint
  description: string
  forVotes: bigint
  againstVotes: bigint
  deadline: bigint
  executed: boolean
  proposer: string
  command: MessageCommand
  nonce: bigint
}

export interface EvmProposalParams {
  description: string
  command: MessageCommand
  payload: Uint8Array
}

// ============================================================================
// Solana-specific Types
// ============================================================================

export interface SolanaConfig {
  cluster: 'devnet' | 'testnet' | 'mainnet-beta'
  rpcUrl: string
  programId: PublicKey
  keypair?: Uint8Array
  commitment?: 'processed' | 'confirmed' | 'finalized'
}

export interface SolanaOAppStore {
  authority: PublicKey
  endpoint: PublicKey
  bump: number
  oapId: Uint8Array
  registered: boolean
}

export interface SolanaPeer {
  store: PublicKey
  srcEid: number
  peer: Uint8Array
  bump: number
}

export interface SolanaInstructionParams {
  store: PublicKey
  authority: PublicKey
  srcEid?: number
  peer?: Uint8Array
  message?: Uint8Array
}

// ============================================================================
// Utility Types
// ============================================================================

export interface NetworkConfig {
  name: string
  type: 'evm' | 'solana'
  eid: EndpointId
  rpcUrl: string
  faucetUrl?: string
  explorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export interface CrossChainOperation {
  srcNetwork: string
  dstNetwork: string
  message: CrossChainMessage
  txHash?: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: Date
}

export interface FeeEstimate {
  srcNetwork: string
  dstNetwork: string
  message: CrossChainMessage
  estimatedFee: MessagingFee
  gasEstimate?: bigint
}

// ============================================================================
// Error Types
// ============================================================================

export enum OAppErrorCode {
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  INVALID_PEER = 'INVALID_PEER',
  INSUFFICIENT_FEE = 'INSUFFICIENT_FEE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  EMERGENCY_PAUSED = 'EMERGENCY_PAUSED',
}

export class OAppError extends Error {
  constructor(
    public code: OAppErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'OAppError'
  }
}

// ============================================================================
// Event Types
// ============================================================================

export interface ProposalCreatedEvent {
  proposalId: bigint
  proposer: string
  description: string
  command: MessageCommand
  timestamp: Date
}

export interface ProposalExecutedEvent {
  proposalId: bigint
  success: boolean
  txHash: string
  timestamp: Date
}

export interface CrossChainMessageSentEvent {
  proposalId: bigint
  command: MessageCommand
  nonce: bigint
  dstEid: number
  txHash: string
  timestamp: Date
}

export interface MessageReceivedEvent {
  srcEid: number
  sender: Uint8Array
  message: Uint8Array
  txHash: string
  timestamp: Date
}

// ============================================================================
// Client Interface Types
// ============================================================================

export interface OAppClient {
  // Configuration
  getConfig(): any
  connect(): Promise<void>
  disconnect(): Promise<void>
  
  // Message operations
  sendMessage(dstEid: number, message: CrossChainMessage, options?: any): Promise<string>
  receiveMessage(message: Uint8Array, origin: Origin): Promise<boolean>
  estimateFee(dstEid: number, message: CrossChainMessage, options?: any): Promise<MessagingFee>
  
  // Peer management
  setPeer(eid: number, peer: Uint8Array): Promise<string>
  getPeer(eid: number): Promise<Uint8Array | null>
  
  // Event listening
  onProposalCreated(callback: (event: ProposalCreatedEvent) => void): void
  onProposalExecuted(callback: (event: ProposalExecutedEvent) => void): void
  onMessageSent(callback: (event: CrossChainMessageSentEvent) => void): void
  onMessageReceived(callback: (event: MessageReceivedEvent) => void): void
}

export interface BatchOperations {
  sendBatchMessages(operations: Array<{
    dstEid: number
    message: CrossChainMessage
  }>, options?: any): Promise<string[]>
  
  estimateBatchFee(operations: Array<{
    dstEid: number
    message: CrossChainMessage
  }>, options?: any): Promise<MessagingFee>
}

export interface AdminOperations {
  addMember(address: string): Promise<string>
  removeMember(address: string): Promise<string>
  setDelegate(address: string, status: boolean): Promise<string>
  setEmergencyPause(paused: boolean): Promise<string>
  emergencyUpdate(command: MessageCommand, payload: Uint8Array): Promise<string>
}

// ============================================================================
// Configuration and Setup Types
// ============================================================================

export interface OAppSDKConfig {
  networks: Record<string, NetworkConfig>
  defaultNetwork: string
  retryAttempts: number
  retryDelay: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export interface ConnectionOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface TransactionOptions {
  gasLimit?: bigint
  gasPrice?: bigint
  confirmations?: number
  timeout?: number
}

// ============================================================================
// Export all types
// ============================================================================

export * from '@layerzerolabs/lz-definitions'
