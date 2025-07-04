use anchor_lang::prelude::*;

/// Message codec for cross-chain communication
/// Provides standardized encoding/decoding for LayerZero messages
pub struct MessageCodec;

impl MessageCodec {
    /// Message type constants
    pub const MSG_TYPE_REGULAR: u8 = 0;
    pub const MSG_TYPE_COMPOSE: u8 = 1;
    
    /// Command type constants (matching EVM side)
    pub const COMMAND_UPDATE_COLLECTION_METADATA: u8 = 0;
    pub const COMMAND_BATCH_UPDATE_CNFTS: u8 = 1;
    pub const COMMAND_TRANSFER_AUTHORITY: u8 = 2;
    pub const COMMAND_EMERGENCY_PAUSE: u8 = 3;
    pub const COMMAND_EMERGENCY_UNPAUSE: u8 = 4;
    
    /// Message version
    pub const MESSAGE_VERSION: u8 = 1;

    /// Encode a cross-chain message
    pub fn encode_message(
        command: u8,
        nonce: u64,
        timestamp: i64,
        payload: &[u8],
    ) -> Result<Vec<u8>> {
        let mut encoded = Vec::new();
        
        // Message format: [version][command][nonce][timestamp][payload_length][payload]
        encoded.push(Self::MESSAGE_VERSION);
        encoded.push(command);
        encoded.extend_from_slice(&nonce.to_le_bytes());
        encoded.extend_from_slice(&timestamp.to_le_bytes());
        encoded.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        encoded.extend_from_slice(payload);
        
        Ok(encoded)
    }

    /// Decode a cross-chain message
    pub fn decode_message(data: &[u8]) -> Result<DecodedMessage> {
        if data.len() < 22 { // minimum: version(1) + command(1) + nonce(8) + timestamp(8) + payload_length(4)
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }

        let version = data[0];
        if version != Self::MESSAGE_VERSION {
            return Err(crate::error::ErrorCode::UnsupportedVersion.into());
        }

        let command = data[1];
        let nonce = u64::from_le_bytes(data[2..10].try_into().unwrap());
        let timestamp = i64::from_le_bytes(data[10..18].try_into().unwrap());
        let payload_length = u32::from_le_bytes(data[18..22].try_into().unwrap()) as usize;
        
        if data.len() < 22 + payload_length {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }

        let payload = data[22..22 + payload_length].to_vec();

        Ok(DecodedMessage {
            version,
            command,
            nonce,
            timestamp,
            payload,
        })
    }

    /// Encode update collection metadata payload
    pub fn encode_update_metadata_payload(
        new_uri: &str,
        new_name: &str,
        new_symbol: &str,
    ) -> Result<Vec<u8>> {
        let mut payload = Vec::new();
        
        // Encode strings with length prefixes
        payload.extend_from_slice(&(new_uri.len() as u32).to_le_bytes());
        payload.extend_from_slice(new_uri.as_bytes());
        
        payload.extend_from_slice(&(new_name.len() as u32).to_le_bytes());
        payload.extend_from_slice(new_name.as_bytes());
        
        payload.extend_from_slice(&(new_symbol.len() as u32).to_le_bytes());
        payload.extend_from_slice(new_symbol.as_bytes());
        
        Ok(payload)
    }

    /// Decode update collection metadata payload
    pub fn decode_update_metadata_payload(payload: &[u8]) -> Result<UpdateMetadataPayload> {
        let mut offset = 0;
        
        // Decode URI
        if offset + 4 > payload.len() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        let uri_len = u32::from_le_bytes(payload[offset..offset + 4].try_into().unwrap()) as usize;
        offset += 4;
        
        if offset + uri_len > payload.len() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        let uri = String::from_utf8(payload[offset..offset + uri_len].to_vec())
            .map_err(|_| crate::error::ErrorCode::InvalidLzMessage)?;
        offset += uri_len;
        
        // Decode name
        if offset + 4 > payload.len() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        let name_len = u32::from_le_bytes(payload[offset..offset + 4].try_into().unwrap()) as usize;
        offset += 4;
        
        if offset + name_len > payload.len() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        let name = String::from_utf8(payload[offset..offset + name_len].to_vec())
            .map_err(|_| crate::error::ErrorCode::InvalidLzMessage)?;
        offset += name_len;
        
        // Decode symbol
        if offset + 4 > payload.len() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        let symbol_len = u32::from_le_bytes(payload[offset..offset + 4].try_into().unwrap()) as usize;
        offset += 4;
        
        if offset + symbol_len > payload.len() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        let symbol = String::from_utf8(payload[offset..offset + symbol_len].to_vec())
            .map_err(|_| crate::error::ErrorCode::InvalidLzMessage)?;
        
        Ok(UpdateMetadataPayload {
            uri,
            name,
            symbol,
        })
    }

    /// Determine message type from encoded data
    pub fn get_message_type(data: &[u8]) -> Result<u8> {
        if data.is_empty() {
            return Err(crate::error::ErrorCode::InvalidLzMessage.into());
        }
        
        // Check for compose message marker
        if data.len() >= 2 && data[0] == 0xFF {
            return Ok(Self::MSG_TYPE_COMPOSE);
        }
        
        Ok(Self::MSG_TYPE_REGULAR)
    }

    /// Validate message command
    pub fn validate_command(command: u8) -> bool {
        matches!(command, 
            Self::COMMAND_UPDATE_COLLECTION_METADATA |
            Self::COMMAND_BATCH_UPDATE_CNFTS |
            Self::COMMAND_TRANSFER_AUTHORITY |
            Self::COMMAND_EMERGENCY_PAUSE |
            Self::COMMAND_EMERGENCY_UNPAUSE
        )
    }
}

/// Decoded message structure
#[derive(Debug, Clone)]
pub struct DecodedMessage {
    pub version: u8,
    pub command: u8,
    pub nonce: u64,
    pub timestamp: i64,
    pub payload: Vec<u8>,
}

/// Update metadata payload structure
#[derive(Debug, Clone)]
pub struct UpdateMetadataPayload {
    pub uri: String,
    pub name: String,
    pub symbol: String,
}

/// Message validation helper
pub struct MessageValidator;

impl MessageValidator {
    /// Validate message timestamp (within reasonable bounds)
    pub fn validate_timestamp(timestamp: i64) -> bool {
        let now = Clock::get().unwrap().unix_timestamp;
        let diff = (now - timestamp).abs();
        
        // Allow 1 hour tolerance for clock drift
        diff <= 3600
    }

    /// Validate message nonce (should be sequential)
    pub fn validate_nonce(current_nonce: u64, message_nonce: u64) -> bool {
        message_nonce > current_nonce
    }

    /// Validate message size
    pub fn validate_message_size(data: &[u8]) -> bool {
        // Max message size: 64KB
        data.len() <= 65536
    }
}
