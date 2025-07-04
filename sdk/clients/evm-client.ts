/**
 * @fileoverview EVM client for LayerZero OApp operations
 */

import { ethers, Contract, Signer } from 'ethers'
import { 
  OAppClient, 
  BatchOperations, 
  AdminOperations,
  EvmConfig,
  CrossChainMessage,
  MessagingFee,
  Origin,
  ProposalCreatedEvent,
  ProposalExecutedEvent,
  CrossChainMessageSentEvent,
  MessageReceivedEvent,
  OAppError,
  OAppErrorCode,
  MessageCommand,
  TransactionOptions
} from '../types'
import { MessageCodec } from '../core/message-codec'
import { FeeCalculator, Logger } from '../utils'

// Contract ABI (essential functions only)
const CONTROLLER_DAO_ABI = [
  // Read functions
  'function proposalCount() view returns (uint256)',
  'function getProposal(uint256 proposalId) view returns (uint256 id, string description, uint256 forVotes, uint256 againstVotes, uint256 deadline, bool executed, address proposer, uint8 command, uint64 nonce)',
  'function members(address) view returns (bool)',
  'function memberCount() view returns (uint256)',
  'function peers(uint32) view returns (bytes32)',
  'function delegates(address) view returns (bool)',
  'function emergencyPaused() view returns (bool)',
  
  // Quote functions
  'function quoteCommand(uint8 command, bytes payload) view returns ((uint256 nativeFee, uint256 lzTokenFee))',
  'function quoteSendMessage(uint32 dstEid, bytes message, bytes options) view returns ((uint256 nativeFee, uint256 lzTokenFee))',
  'function quoteBatchSend(uint32[] dstEids, bytes[] messages, bytes options) view returns ((uint256 nativeFee, uint256 lzTokenFee))',
  
  // Write functions
  'function createUpdateMetadataProposal(string description, string newUri, string newName, string newSymbol) returns (uint256)',
  'function createEmergencyPauseProposal(string description) returns (uint256)',
  'function vote(uint256 proposalId, bool support)',
  'function executeProposal(uint256 proposalId) payable',
  'function emergencyUpdate(uint8 command, bytes payload) payable',
  'function sendBatchMessages(uint32[] dstEids, bytes[] messages, bytes options) payable',
  
  // Admin functions
  'function addMember(address member)',
  'function removeMember(address member)',
  'function setDelegate(address delegate, bool status)',
  'function setEmergencyPause(bool paused)',
  'function setPeer(uint32 eid, bytes32 peer)',
  'function setEnforcedOptions(uint32 eid, bytes options)',
  
  // Events
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)',
  'event ProposalExecuted(uint256 indexed proposalId, bool success)',
  'event CrossChainCommandSent(uint256 indexed proposalId, uint8 command, uint64 nonce)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, bool support)',
  'event MemberAdded(address indexed member)',
  'event MemberRemoved(address indexed member)',
  'event DelegateSet(address indexed delegate, bool status)',
  'event EmergencyPauseToggled(bool paused)',
  'event MessageReceived(uint32 indexed srcEid, bytes32 indexed sender, bytes message)',
  'event BatchMessageSent(uint32 indexed dstEid, uint256 messageCount)'
]

export class EvmOAppClient implements OAppClient, BatchOperations, AdminOperations {
  private provider: ethers.providers.Provider
  private signer?: Signer
  private contract: Contract
  private config: EvmConfig

  // Event listeners
  private proposalCreatedListeners: Array<(event: ProposalCreatedEvent) => void> = []
  private proposalExecutedListeners: Array<(event: ProposalExecutedEvent) => void> = []
  private messageSentListeners: Array<(event: CrossChainMessageSentEvent) => void> = []
  private messageReceivedListeners: Array<(event: MessageReceivedEvent) => void> = []

  constructor(config: EvmConfig) {
    this.config = config
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)
    
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider)
      this.contract = new Contract(config.contractAddress, CONTROLLER_DAO_ABI, this.signer)
    } else {
      this.contract = new Contract(config.contractAddress, CONTROLLER_DAO_ABI, this.provider)
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  getConfig(): EvmConfig {
    return { ...this.config }
  }

  async connect(): Promise<void> {
    try {
      Logger.info('Connecting to EVM network...', { chainId: this.config.chainId })
      
      // Verify network
      const network = await this.provider.getNetwork()
      if (Number(network.chainId) !== this.config.chainId) {
        throw new OAppError(
          OAppErrorCode.NETWORK_ERROR,
          `Chain ID mismatch: expected ${this.config.chainId}, got ${Number(network.chainId)}`
        )
      }

      // Verify contract exists
      const code = await this.provider.getCode(this.config.contractAddress)
      if (code === '0x') {
        throw new OAppError(
          OAppErrorCode.NETWORK_ERROR,
          `Contract not found at address: ${this.config.contractAddress}`
        )
      }

      Logger.info('Connected to EVM network successfully')
      this._setupEventListeners()
    } catch (error) {
      if (error instanceof OAppError) throw error
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async disconnect(): Promise<void> {
    Logger.info('Disconnecting from EVM network...')
    this._removeEventListeners()
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async sendMessage(
    dstEid: number, 
    message: CrossChainMessage, 
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    try {
      Logger.info('Sending cross-chain message...', { dstEid, command: message.command })

      // Encode message
      const encodedMessage = MessageCodec.encode(message)

      // Get fee estimate
      const fee = await this.estimateFee(dstEid, message, options)

      // Send transaction
      const tx = await this.contract.sendMessage(
        dstEid,
        encodedMessage,
        '0x', // options
        {
          value: fee.nativeFee,
          gasLimit: options?.gasLimit,
          gasPrice: options?.gasPrice
        }
      )

      Logger.info('Message sent, waiting for confirmation...', { txHash: tx.hash })
      const receipt = await tx.wait(options?.confirmations || 1)
      
      Logger.info('Message confirmed', { txHash: receipt.hash, blockNumber: receipt.blockNumber })
      return receipt.hash
    } catch (error) {
      Logger.error('Failed to send message', error)
      if (error instanceof OAppError) throw error
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async receiveMessage(message: Uint8Array, origin: Origin): Promise<boolean> {
    try {
      Logger.info('Processing received message...', { srcEid: origin.srcEid })
      
      // Decode and validate message
      const decoded = MessageCodec.decode(message)
      MessageCodec.validate(decoded)

      // In EVM implementation, this might trigger events or update state
      // For now, we just log and return success
      Logger.info('Message received and processed', { 
        command: decoded.command, 
        nonce: decoded.nonce.toString() 
      })
      
      return true
    } catch (error) {
      Logger.error('Failed to process received message', error)
      return false
    }
  }

  async estimateFee(
    dstEid: number, 
    message: CrossChainMessage, 
    options?: any
  ): Promise<MessagingFee> {
    try {
      const encodedMessage = MessageCodec.encode(message)
      const result = await this.contract.quoteSendMessage(
        dstEid,
        encodedMessage,
        options?.lzOptions || '0x'
      )
      
      return {
        nativeFee: BigInt(result.nativeFee.toString()),
        lzTokenFee: BigInt(result.lzTokenFee.toString())
      }
    } catch (error) {
      Logger.warn('Failed to get on-chain fee estimate, using fallback', error)
      
      // Fallback to SDK calculation
      const srcNetwork = 'ethereum-sepolia' // Should be dynamic based on config
      const dstNetwork = dstEid === 30168 ? 'solana-testnet' : 'solana-mainnet'
      const estimate = FeeCalculator.estimateMessageFee(srcNetwork, dstNetwork, message)
      return estimate.estimatedFee
    }
  }

  // ============================================================================
  // Peer Management
  // ============================================================================

  async setPeer(eid: number, peer: Uint8Array): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    try {
      const peerBytes32 = ethers.zeroPadValue(peer, 32)
      const tx = await this.contract.setPeer(eid, peerBytes32)
      const receipt = await tx.wait()
      
      Logger.info('Peer set successfully', { eid, peer: ethers.hexlify(peer), txHash: receipt.hash })
      return receipt.hash
    } catch (error) {
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `Failed to set peer: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getPeer(eid: number): Promise<Uint8Array | null> {
    try {
      const peerBytes32 = await this.contract.peers(eid)
      if (peerBytes32 === ethers.ZeroHash) {
        return null
      }
      return ethers.getBytes(peerBytes32)
    } catch (error) {
      Logger.error('Failed to get peer', error)
      return null
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async sendBatchMessages(
    operations: Array<{ dstEid: number; message: CrossChainMessage }>,
    options?: any
  ): Promise<string[]> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    try {
      Logger.info('Sending batch messages...', { count: operations.length })

      const dstEids = operations.map(op => op.dstEid)
      const messages = operations.map(op => MessageCodec.encode(op.message))
      
      // Get fee estimate
      const fee = await this.estimateBatchFee(operations, options)

      const tx = await this.contract.sendBatchMessages(
        dstEids,
        messages,
        options?.lzOptions || '0x',
        { value: fee.nativeFee }
      )

      const receipt = await tx.wait()
      Logger.info('Batch messages sent', { txHash: receipt.hash, count: operations.length })
      
      // Return array with single tx hash (could be enhanced to return multiple if needed)
      return [receipt.hash]
    } catch (error) {
      throw new OAppError(
        OAppErrorCode.NETWORK_ERROR,
        `Failed to send batch messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async estimateBatchFee(
    operations: Array<{ dstEid: number; message: CrossChainMessage }>,
    options?: any
  ): Promise<MessagingFee> {
    try {
      const dstEids = operations.map(op => op.dstEid)
      const messages = operations.map(op => MessageCodec.encode(op.message))
      
      const result = await this.contract.quoteBatchSend(
        dstEids,
        messages,
        options?.lzOptions || '0x'
      )
      
      return {
        nativeFee: BigInt(result.nativeFee.toString()),
        lzTokenFee: BigInt(result.lzTokenFee.toString())
      }
    } catch (error) {
      Logger.warn('Failed to get on-chain batch fee estimate, using fallback', error)
      
      // Fallback calculation
      const srcNetwork = 'ethereum-sepolia'
      return FeeCalculator.estimateBatchFee(srcNetwork, operations.map(op => ({
        dstNetwork: op.dstEid === 30168 ? 'solana-testnet' : 'solana-mainnet',
        message: op.message
      })))
    }
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  async addMember(address: string): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    const tx = await this.contract.addMember(address)
    const receipt = await tx.wait()
    return receipt.hash
  }

  async removeMember(address: string): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    const tx = await this.contract.removeMember(address)
    const receipt = await tx.wait()
    return receipt.hash
  }

  async setDelegate(address: string, status: boolean): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    const tx = await this.contract.setDelegate(address, status)
    const receipt = await tx.wait()
    return receipt.hash
  }

  async setEmergencyPause(paused: boolean): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    const tx = await this.contract.setEmergencyPause(paused)
    const receipt = await tx.wait()
    return receipt.hash
  }

  async emergencyUpdate(command: MessageCommand, payload: Uint8Array): Promise<string> {
    if (!this.signer) {
      throw new OAppError(OAppErrorCode.UNAUTHORIZED, 'No signer configured')
    }

    // Estimate fee for emergency update
    const message: CrossChainMessage = {
      command,
      nonce: BigInt(Date.now()), // Temporary nonce
      timestamp: BigInt(Date.now()),
      version: 1,
      payload
    }

    const fee = await this.estimateFee(30168, message) // Assuming Solana destination

    const tx = await this.contract.emergencyUpdate(command, payload, { value: fee.nativeFee })
    const receipt = await tx.wait()
    return receipt.hash
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  onProposalCreated(callback: (event: ProposalCreatedEvent) => void): void {
    this.proposalCreatedListeners.push(callback)
  }

  onProposalExecuted(callback: (event: ProposalExecutedEvent) => void): void {
    this.proposalExecutedListeners.push(callback)
  }

  onMessageSent(callback: (event: CrossChainMessageSentEvent) => void): void {
    this.messageSentListeners.push(callback)
  }

  onMessageReceived(callback: (event: MessageReceivedEvent) => void): void {
    this.messageReceivedListeners.push(callback)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private _setupEventListeners(): void {
    // Proposal Created
    this.contract.on('ProposalCreated', (proposalId, proposer, description, event) => {
      const proposalEvent: ProposalCreatedEvent = {
        proposalId: BigInt(proposalId.toString()),
        proposer,
        description,
        command: MessageCommand.UPDATE_COLLECTION_METADATA, // Default, should be enhanced
        timestamp: new Date()
      }
      this.proposalCreatedListeners.forEach(listener => listener(proposalEvent))
    })

    // Proposal Executed
    this.contract.on('ProposalExecuted', (proposalId, success, event) => {
      const executedEvent: ProposalExecutedEvent = {
        proposalId: BigInt(proposalId.toString()),
        success,
        txHash: event.transactionHash,
        timestamp: new Date()
      }
      this.proposalExecutedListeners.forEach(listener => listener(executedEvent))
    })

    // Cross Chain Command Sent
    this.contract.on('CrossChainCommandSent', (proposalId, command, nonce, event) => {
      const sentEvent: CrossChainMessageSentEvent = {
        proposalId: BigInt(proposalId.toString()),
        command,
        nonce: BigInt(nonce.toString()),
        dstEid: 30168, // Should be dynamic
        txHash: event.transactionHash,
        timestamp: new Date()
      }
      this.messageSentListeners.forEach(listener => listener(sentEvent))
    })

    // Message Received
    this.contract.on('MessageReceived', (srcEid, sender, message, event) => {
      const receivedEvent: MessageReceivedEvent = {
        srcEid: Number(srcEid),
        sender: ethers.getBytes(sender),
        message: ethers.getBytes(message),
        txHash: event.transactionHash,
        timestamp: new Date()
      }
      this.messageReceivedListeners.forEach(listener => listener(receivedEvent))
    })
  }

  private _removeEventListeners(): void {
    this.contract.removeAllListeners()
  }

  // ============================================================================
  // Additional Utility Methods
  // ============================================================================

  async getProposal(proposalId: bigint) {
    return await this.contract.getProposal(proposalId)
  }

  async getProposalCount(): Promise<bigint> {
    const count = await this.contract.proposalCount()
    return BigInt(count.toString())
  }

  async isMember(address: string): Promise<boolean> {
    return await this.contract.members(address)
  }

  async getMemberCount(): Promise<bigint> {
    const count = await this.contract.memberCount()
    return BigInt(count.toString())
  }

  async isDelegate(address: string): Promise<boolean> {
    return await this.contract.delegates(address)
  }

  async isEmergencyPaused(): Promise<boolean> {
    return await this.contract.emergencyPaused()
  }
}

// Export alias for consistency
export const EVMClient = EvmOAppClient
