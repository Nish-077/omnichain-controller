/**
 * Cross-chain Message Types for LayerZero Communication
 * 
 * Defines the standardized message format for communication between
 * Ethereum DAO and Solana cNFT Controller
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Command types that the Ethereum DAO can send to Solana
 */
export enum SolanaCommand {
  UPDATE_COLLECTION_METADATA = 0,
  BATCH_UPDATE_CNFTS = 1,
  TRANSFER_AUTHORITY = 2,
  EMERGENCY_PAUSE = 3,
  EMERGENCY_UNPAUSE = 4,
}

/**
 * Base message structure for all cross-chain communications
 */
export interface BaseMessage {
  /** Command type identifier */
  command: SolanaCommand;
  /** Unique nonce to prevent replay attacks */
  nonce: number;
  /** Unix timestamp when message was created */
  timestamp: number;
  /** Message version for protocol upgrades */
  version: number;
}

/**
 * Update collection metadata command
 */
export interface UpdateCollectionMetadataPayload {
  /** New metadata URI for the collection */
  newUri: string;
  /** Optional new name for the collection */
  newName?: string;
  /** Optional new symbol for the collection */
  newSymbol?: string;
}

/**
 * Batch update individual cNFTs
 */
export interface BatchUpdatePayload {
  /** Array of updates to apply */
  updates: MetadataUpdate[];
  /** Maximum number of updates to process in this batch */
  batchSize: number;
}

/**
 * Individual cNFT metadata update
 */
export interface MetadataUpdate {
  /** Index of the cNFT in the Merkle tree */
  leafIndex: number;
  /** New metadata URI */
  newUri: string;
  /** New name (optional) */
  newName?: string;
  /** Current proof (for verification) */
  proof: Buffer[];
}

/**
 * Transfer collection authority command
 */
export interface TransferAuthorityPayload {
  /** New authority public key */
  newAuthority: string; // PublicKey as base58 string
  /** Authority type being transferred */
  authorityType: 'metadata' | 'tree' | 'collection';
}

/**
 * Complete cross-chain message structure
 */
export interface CrossChainMessage extends BaseMessage {
  payload: 
    | UpdateCollectionMetadataPayload 
    | BatchUpdatePayload 
    | TransferAuthorityPayload 
    | {}; // Empty payload for pause/unpause
}

/**
 * Message encoding/decoding utilities
 */
export class MessageCodec {
  /**
   * Encode a message for cross-chain transmission
   */
  static encode(message: CrossChainMessage): Buffer {
    const messageString = JSON.stringify(message);
    return Buffer.from(messageString, 'utf8');
  }

  /**
   * Decode a message from cross-chain transmission
   */
  static decode(data: Buffer): CrossChainMessage {
    const messageString = data.toString('utf8');
    return JSON.parse(messageString) as CrossChainMessage;
  }

  /**
   * Validate message structure and required fields
   */
  static validate(message: CrossChainMessage): boolean {
    // Basic structure validation
    if (!message.command && message.command !== 0) return false;
    if (!message.nonce) return false;
    if (!message.timestamp) return false;
    if (!message.version) return false;

    // Command-specific validation
    switch (message.command) {
      case SolanaCommand.UPDATE_COLLECTION_METADATA:
        const updatePayload = message.payload as UpdateCollectionMetadataPayload;
        return !!updatePayload.newUri;

      case SolanaCommand.BATCH_UPDATE_CNFTS:
        const batchPayload = message.payload as BatchUpdatePayload;
        return Array.isArray(batchPayload.updates) && batchPayload.updates.length > 0;

      case SolanaCommand.TRANSFER_AUTHORITY:
        const transferPayload = message.payload as TransferAuthorityPayload;
        return !!transferPayload.newAuthority && !!transferPayload.authorityType;

      case SolanaCommand.EMERGENCY_PAUSE:
      case SolanaCommand.EMERGENCY_UNPAUSE:
        return true; // No payload validation needed

      default:
        return false;
    }
  }

  /**
   * Create a new message with automatic timestamp and version
   */
  static createMessage(
    command: SolanaCommand,
    payload: any,
    nonce: number
  ): CrossChainMessage {
    return {
      command,
      payload,
      nonce,
      timestamp: Math.floor(Date.now() / 1000),
      version: 1
    };
  }
}
