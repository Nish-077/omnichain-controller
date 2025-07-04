/**
 * @fileoverview Solana client for LayerZero OApp operations
 */

import { Connection, PublicKey, Transaction, Signer as SolanaSigner } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { 
  OAppClient, 
  BatchOperations, 
  AdminOperations,
  SolanaConfig,
  CrossChainMessage,
  MessagingFee,
  Origin,
  OAppError,
  OAppErrorCode,
  MessageCommand,
  TransactionOptions
} from '../types'
import { MessageCodec } from '../core/message-codec'
import { FeeCalculator, Logger } from '../utils'

// Import the generated IDL
import { OmnichainController } from '../../target/types/omnichain_controller'

interface SolanaClientOptions {
  rpcUrl: string
  programId: string
  wallet?: Wallet
  network: string
}

export class SolanaOAppClient implements OAppClient, BatchOperations, AdminOperations {
  private connection: Connection
  private provider: AnchorProvider
  private program: Program<OmnichainController>
  private wallet: Wallet
  private logger: Logger
  private messageCodec: MessageCodec
  private feeCalculator: FeeCalculator
  private config: SolanaConfig

  constructor(options: SolanaClientOptions) {
    this.connection = new Connection(options.rpcUrl, 'confirmed')
    this.wallet = options.wallet || new Wallet(PublicKey.default)
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    })
    
    this.program = new Program<OmnichainController>(
      // You'll need to import the IDL here
      {} as any, // placeholder
      new PublicKey(options.programId),
      this.provider
    )

    this.logger = new Logger('SolanaOAppClient')
    this.messageCodec = new MessageCodec()
    this.feeCalculator = new FeeCalculator()
    
    this.config = {
      rpcUrl: options.rpcUrl,
      programId: options.programId,
      network: options.network
    }
  }

  /**
   * Initialize the OApp store if not already initialized
   */
  async initOApp(): Promise<string> {
    try {
      const [oappStore] = PublicKey.findProgramAddressSync(
        [Buffer.from('Store')],
        this.program.programId
      )

      const tx = await this.program.methods
        .initOappStore()
        .accounts({
          store: oappStore,
          payer: this.wallet.publicKey,
          systemProgram: PublicKey.default
        })
        .rpc()

      this.logger.info('OApp store initialized', { txHash: tx })
      return tx
    } catch (error) {
      this.logger.error('Failed to initialize OApp store', error)
      throw new OAppError(
        OAppErrorCode.INITIALIZATION_FAILED,
        'Failed to initialize OApp store',
        error
      )
    }
  }

  /**
   * Send a cross-chain message
   */
  async sendMessage(
    message: CrossChainMessage,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const encodedMessage = this.messageCodec.encode(message)
      
      const [oappStore] = PublicKey.findProgramAddressSync(
        [Buffer.from('Store')],
        this.program.programId
      )

      // This is a placeholder - you'd need to implement the actual send logic
      // based on your Solana program's send instruction
      const tx = await this.program.methods
        .lzSend(
          message.dstEid,
          encodedMessage,
          options?.extraOptions || Buffer.alloc(0),
          message.composerMessage || Buffer.alloc(0)
        )
        .accounts({
          store: oappStore,
          payer: this.wallet.publicKey
        })
        .rpc()

      this.logger.info('Cross-chain message sent', { 
        txHash: tx,
        dstEid: message.dstEid,
        messageType: message.command
      })
      
      return tx
    } catch (error) {
      this.logger.error('Failed to send cross-chain message', error)
      throw new OAppError(
        OAppErrorCode.SEND_FAILED,
        'Failed to send cross-chain message',
        error
      )
    }
  }

  /**
   * Quote fees for sending a message
   */
  async quoteFees(
    message: CrossChainMessage,
    payInLzToken: boolean = false
  ): Promise<MessagingFee> {
    try {
      const encodedMessage = this.messageCodec.encode(message)
      
      // This is a placeholder - you'd need to implement the actual fee calculation
      // based on your Solana program's quote instruction
      const fee = await this.feeCalculator.calculateSolanaFee(
        message.dstEid,
        encodedMessage.length,
        payInLzToken
      )

      return {
        nativeFee: fee.nativeFee,
        lzTokenFee: fee.lzTokenFee
      }
    } catch (error) {
      this.logger.error('Failed to quote fees', error)
      throw new OAppError(
        OAppErrorCode.QUOTE_FAILED,
        'Failed to quote fees',
        error
      )
    }
  }

  /**
   * Set a peer for cross-chain communication
   */
  async setPeer(
    dstEid: number,
    peer: string,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const [oappStore] = PublicKey.findProgramAddressSync(
        [Buffer.from('Store')],
        this.program.programId
      )

      const [peerAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('Peer'), oappStore.toBuffer(), Buffer.from(dstEid.toString())],
        this.program.programId
      )

      const tx = await this.program.methods
        .setPeer(dstEid, Array.from(Buffer.from(peer, 'hex')))
        .accounts({
          store: oappStore,
          peer: peerAccount,
          admin: this.wallet.publicKey,
          systemProgram: PublicKey.default
        })
        .rpc()

      this.logger.info('Peer set successfully', { 
        txHash: tx,
        dstEid,
        peer
      })
      
      return tx
    } catch (error) {
      this.logger.error('Failed to set peer', error)
      throw new OAppError(
        OAppErrorCode.SET_PEER_FAILED,
        'Failed to set peer',
        error
      )
    }
  }

  /**
   * Get peer information
   */
  async getPeer(dstEid: number): Promise<string> {
    try {
      const [oappStore] = PublicKey.findProgramAddressSync(
        [Buffer.from('Store')],
        this.program.programId
      )

      const [peerAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('Peer'), oappStore.toBuffer(), Buffer.from(dstEid.toString())],
        this.program.programId
      )

      const peerData = await this.program.account.peer.fetch(peerAccount)
      return Buffer.from(peerData.address).toString('hex')
    } catch (error) {
      this.logger.error('Failed to get peer', error)
      throw new OAppError(
        OAppErrorCode.GET_PEER_FAILED,
        'Failed to get peer',
        error
      )
    }
  }

  /**
   * Handle received message (for testing/simulation)
   */
  async lzReceive(
    origin: Origin,
    message: Buffer,
    options?: TransactionOptions
  ): Promise<string> {
    try {
      const [oappStore] = PublicKey.findProgramAddressSync(
        [Buffer.from('Store')],
        this.program.programId
      )

      const tx = await this.program.methods
        .lzReceive(
          { srcEid: origin.srcEid, sender: Array.from(origin.sender), nonce: origin.nonce },
          Array.from(message)
        )
        .accounts({
          store: oappStore,
          payer: this.wallet.publicKey
        })
        .rpc()

      this.logger.info('Message received and processed', { 
        txHash: tx,
        srcEid: origin.srcEid,
        nonce: origin.nonce
      })
      
      return tx
    } catch (error) {
      this.logger.error('Failed to process received message', error)
      throw new OAppError(
        OAppErrorCode.RECEIVE_FAILED,
        'Failed to process received message',
        error
      )
    }
  }

  // BatchOperations implementation
  async batchSend(
    messages: CrossChainMessage[],
    options?: TransactionOptions
  ): Promise<string[]> {
    const results: string[] = []
    
    for (const message of messages) {
      try {
        const txHash = await this.sendMessage(message, options)
        results.push(txHash)
      } catch (error) {
        this.logger.error('Failed to send batch message', error)
        throw error
      }
    }
    
    return results
  }

  async quoteBatchFees(
    messages: CrossChainMessage[],
    payInLzToken: boolean = false
  ): Promise<MessagingFee[]> {
    const results: MessagingFee[] = []
    
    for (const message of messages) {
      try {
        const fee = await this.quoteFees(message, payInLzToken)
        results.push(fee)
      } catch (error) {
        this.logger.error('Failed to quote batch fees', error)
        throw error
      }
    }
    
    return results
  }

  // AdminOperations implementation
  async pause(options?: TransactionOptions): Promise<string> {
    // Implementation depends on your contract's pause mechanism
    throw new Error('Pause functionality not implemented')
  }

  async unpause(options?: TransactionOptions): Promise<string> {
    // Implementation depends on your contract's unpause mechanism
    throw new Error('Unpause functionality not implemented')
  }

  async setAdmin(newAdmin: string, options?: TransactionOptions): Promise<string> {
    // Implementation depends on your contract's admin management
    throw new Error('Set admin functionality not implemented')
  }

  async setDelegate(delegate: string, options?: TransactionOptions): Promise<string> {
    // Implementation depends on your contract's delegate management
    throw new Error('Set delegate functionality not implemented')
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection
  }

  /**
   * Get program instance
   */
  getProgram(): Program<OmnichainController> {
    return this.program
  }

  /**
   * Get wallet instance
   */
  getWallet(): Wallet {
    return this.wallet
  }

  /**
   * Get client configuration
   */
  getConfig(): SolanaConfig {
    return this.config
  }
}

// Export alias for consistency
export const SolanaClient = SolanaOAppClient
