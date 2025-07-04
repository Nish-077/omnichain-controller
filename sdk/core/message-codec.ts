/**
 * @fileoverview Cross-VM message codec for LayerZero OApp communication
 * Handles encoding/decoding messages between EVM and Solana
 */

import { CrossChainMessage, MessageCommand, OAppError, OAppErrorCode } from '../types'

// ============================================================================
// Constants
// ============================================================================

export const MESSAGE_VERSION = 1
export const MAX_MESSAGE_SIZE = 65535
export const COMMAND_BYTE_SIZE = 1
export const NONCE_BYTE_SIZE = 8
export const TIMESTAMP_BYTE_SIZE = 8
export const VERSION_BYTE_SIZE = 1

// ============================================================================
// Message Codec Class
// ============================================================================

export class MessageCodec {
  /**
   * Encode a cross-chain message for LayerZero transmission
   */
  static encode(message: CrossChainMessage): Uint8Array {
    try {
      // Calculate total size
      const headerSize = COMMAND_BYTE_SIZE + NONCE_BYTE_SIZE + TIMESTAMP_BYTE_SIZE + VERSION_BYTE_SIZE
      const totalSize = headerSize + message.payload.length
      
      if (totalSize > MAX_MESSAGE_SIZE) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Message too large: ${totalSize} bytes (max ${MAX_MESSAGE_SIZE})`
        )
      }

      // Create buffer
      const buffer = new ArrayBuffer(totalSize)
      const view = new DataView(buffer)
      let offset = 0

      // Write command (1 byte)
      view.setUint8(offset, message.command)
      offset += COMMAND_BYTE_SIZE

      // Write nonce (8 bytes, big-endian)
      view.setBigUint64(offset, message.nonce, false)
      offset += NONCE_BYTE_SIZE

      // Write timestamp (8 bytes, big-endian)
      view.setBigUint64(offset, message.timestamp, false)
      offset += TIMESTAMP_BYTE_SIZE

      // Write version (1 byte)
      view.setUint8(offset, message.version)
      offset += VERSION_BYTE_SIZE

      // Write payload
      const uint8Array = new Uint8Array(buffer)
      uint8Array.set(message.payload, offset)

      return uint8Array
    } catch (error) {
      if (error instanceof OAppError) throw error
      throw new OAppError(
        OAppErrorCode.INVALID_MESSAGE,
        `Failed to encode message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Decode a LayerZero message
   */
  static decode(encodedMessage: Uint8Array): CrossChainMessage {
    try {
      if (encodedMessage.length < COMMAND_BYTE_SIZE + NONCE_BYTE_SIZE + TIMESTAMP_BYTE_SIZE + VERSION_BYTE_SIZE) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Message too short: ${encodedMessage.length} bytes`
        )
      }

      const view = new DataView(encodedMessage.buffer, encodedMessage.byteOffset, encodedMessage.byteLength)
      let offset = 0

      // Read command
      const command = view.getUint8(offset)
      if (!Object.values(MessageCommand).includes(command)) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Invalid command: ${command}`
        )
      }
      offset += COMMAND_BYTE_SIZE

      // Read nonce
      const nonce = view.getBigUint64(offset, false)
      offset += NONCE_BYTE_SIZE

      // Read timestamp
      const timestamp = view.getBigUint64(offset, false)
      offset += TIMESTAMP_BYTE_SIZE

      // Read version
      const version = view.getUint8(offset)
      if (version !== MESSAGE_VERSION) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Unsupported version: ${version} (expected ${MESSAGE_VERSION})`
        )
      }
      offset += VERSION_BYTE_SIZE

      // Read payload
      const payload = encodedMessage.slice(offset)

      return {
        command: command as MessageCommand,
        nonce,
        timestamp,
        version,
        payload
      }
    } catch (error) {
      if (error instanceof OAppError) throw error
      throw new OAppError(
        OAppErrorCode.INVALID_MESSAGE,
        `Failed to decode message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Validate message structure and content
   */
  static validate(message: CrossChainMessage): boolean {
    try {
      // Check version
      if (message.version !== MESSAGE_VERSION) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Invalid version: ${message.version}`
        )
      }

      // Check command
      if (!Object.values(MessageCommand).includes(message.command)) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Invalid command: ${message.command}`
        )
      }

      // Check nonce
      if (message.nonce <= 0n) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Invalid nonce: ${message.nonce}`
        )
      }

      // Check timestamp (should be reasonable)
      const now = BigInt(Date.now())
      const dayInMs = 24n * 60n * 60n * 1000n
      if (message.timestamp < now - dayInMs || message.timestamp > now + dayInMs) {
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Invalid timestamp: ${message.timestamp}`
        )
      }

      // Check payload size
      if (message.payload.length > MAX_MESSAGE_SIZE - 18) { // 18 = header size
        throw new OAppError(
          OAppErrorCode.INVALID_MESSAGE,
          `Payload too large: ${message.payload.length} bytes`
        )
      }

      return true
    } catch (error) {
      if (error instanceof OAppError) throw error
      return false
    }
  }

  /**
   * Get message size for fee estimation
   */
  static getMessageSize(message: CrossChainMessage): number {
    return COMMAND_BYTE_SIZE + NONCE_BYTE_SIZE + TIMESTAMP_BYTE_SIZE + VERSION_BYTE_SIZE + message.payload.length
  }
}

// ============================================================================
// Payload Encoders for Specific Commands
// ============================================================================

export class PayloadEncoder {
  /**
   * Encode UPDATE_COLLECTION_METADATA payload
   */
  static encodeUpdateMetadata(uri: string, name: string, symbol: string): Uint8Array {
    const encoder = new TextEncoder()
    const uriBytes = encoder.encode(uri)
    const nameBytes = encoder.encode(name)
    const symbolBytes = encoder.encode(symbol)

    const totalSize = 4 + uriBytes.length + 4 + nameBytes.length + 4 + symbolBytes.length
    const buffer = new ArrayBuffer(totalSize)
    const view = new DataView(buffer)
    const uint8Array = new Uint8Array(buffer)
    
    let offset = 0

    // URI
    view.setUint32(offset, uriBytes.length, false)
    offset += 4
    uint8Array.set(uriBytes, offset)
    offset += uriBytes.length

    // Name
    view.setUint32(offset, nameBytes.length, false)
    offset += 4
    uint8Array.set(nameBytes, offset)
    offset += nameBytes.length

    // Symbol
    view.setUint32(offset, symbolBytes.length, false)
    offset += 4
    uint8Array.set(symbolBytes, offset)

    return uint8Array
  }

  /**
   * Decode UPDATE_COLLECTION_METADATA payload
   */
  static decodeUpdateMetadata(payload: Uint8Array): { uri: string; name: string; symbol: string } {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
    const decoder = new TextDecoder()
    let offset = 0

    // URI
    const uriLength = view.getUint32(offset, false)
    offset += 4
    const uri = decoder.decode(payload.slice(offset, offset + uriLength))
    offset += uriLength

    // Name
    const nameLength = view.getUint32(offset, false)
    offset += 4
    const name = decoder.decode(payload.slice(offset, offset + nameLength))
    offset += nameLength

    // Symbol
    const symbolLength = view.getUint32(offset, false)
    offset += 4
    const symbol = decoder.decode(payload.slice(offset, offset + symbolLength))

    return { uri, name, symbol }
  }

  /**
   * Encode BATCH_UPDATE_CNFTS payload
   */
  static encodeBatchUpdate(updates: Array<{ id: string; uri: string }>): Uint8Array {
    const encoder = new TextEncoder()
    
    // Calculate total size
    let totalSize = 4 // count
    for (const update of updates) {
      const idBytes = encoder.encode(update.id)
      const uriBytes = encoder.encode(update.uri)
      totalSize += 4 + idBytes.length + 4 + uriBytes.length
    }

    const buffer = new ArrayBuffer(totalSize)
    const view = new DataView(buffer)
    const uint8Array = new Uint8Array(buffer)
    let offset = 0

    // Count
    view.setUint32(offset, updates.length, false)
    offset += 4

    // Updates
    for (const update of updates) {
      const idBytes = encoder.encode(update.id)
      const uriBytes = encoder.encode(update.uri)

      // ID
      view.setUint32(offset, idBytes.length, false)
      offset += 4
      uint8Array.set(idBytes, offset)
      offset += idBytes.length

      // URI
      view.setUint32(offset, uriBytes.length, false)
      offset += 4
      uint8Array.set(uriBytes, offset)
      offset += uriBytes.length
    }

    return uint8Array
  }

  /**
   * Decode BATCH_UPDATE_CNFTS payload
   */
  static decodeBatchUpdate(payload: Uint8Array): Array<{ id: string; uri: string }> {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
    const decoder = new TextDecoder()
    let offset = 0

    // Count
    const count = view.getUint32(offset, false)
    offset += 4

    const updates: Array<{ id: string; uri: string }> = []

    for (let i = 0; i < count; i++) {
      // ID
      const idLength = view.getUint32(offset, false)
      offset += 4
      const id = decoder.decode(payload.slice(offset, offset + idLength))
      offset += idLength

      // URI
      const uriLength = view.getUint32(offset, false)
      offset += 4
      const uri = decoder.decode(payload.slice(offset, offset + uriLength))
      offset += uriLength

      updates.push({ id, uri })
    }

    return updates
  }

  /**
   * Encode TRANSFER_AUTHORITY payload
   */
  static encodeTransferAuthority(newAuthority: Uint8Array): Uint8Array {
    if (newAuthority.length !== 32) {
      throw new OAppError(
        OAppErrorCode.INVALID_MESSAGE,
        `Invalid authority length: ${newAuthority.length} (expected 32)`
      )
    }
    return new Uint8Array(newAuthority)
  }

  /**
   * Decode TRANSFER_AUTHORITY payload
   */
  static decodeTransferAuthority(payload: Uint8Array): Uint8Array {
    if (payload.length !== 32) {
      throw new OAppError(
        OAppErrorCode.INVALID_MESSAGE,
        `Invalid authority payload length: ${payload.length} (expected 32)`
      )
    }
    return new Uint8Array(payload)
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createMessage(
  command: MessageCommand,
  nonce: bigint,
  payload: Uint8Array,
  timestamp?: bigint
): CrossChainMessage {
  return {
    command,
    nonce,
    timestamp: timestamp || BigInt(Date.now()),
    version: MESSAGE_VERSION,
    payload
  }
}

export function isValidCommand(command: number): command is MessageCommand {
  return Object.values(MessageCommand).includes(command)
}

export function getCommandName(command: MessageCommand): string {
  switch (command) {
    case MessageCommand.UPDATE_COLLECTION_METADATA:
      return 'UPDATE_COLLECTION_METADATA'
    case MessageCommand.BATCH_UPDATE_CNFTS:
      return 'BATCH_UPDATE_CNFTS'
    case MessageCommand.TRANSFER_AUTHORITY:
      return 'TRANSFER_AUTHORITY'
    case MessageCommand.EMERGENCY_PAUSE:
      return 'EMERGENCY_PAUSE'
    case MessageCommand.EMERGENCY_UNPAUSE:
      return 'EMERGENCY_UNPAUSE'
    default:
      return 'UNKNOWN'
  }
}
