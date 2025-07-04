use anchor_lang::prelude::*;

/// CPI helper functions for LayerZero endpoint interactions
pub mod endpoint {
    use super::*;

    /// Clear a message from the endpoint
    pub fn clear(
        endpoint_program: &AccountInfo,
        accounts: &[AccountInfo],
        guid: &[u8; 32],
    ) -> Result<()> {
        // Create CPI instruction for endpoint clear
        let mut data = Vec::new();
        data.push(0u8); // clear instruction discriminator
        data.extend_from_slice(guid);
        
        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: *endpoint_program.key,
            accounts: accounts.iter().map(|acc| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }).collect(),
            data,
        };

        // Execute CPI
        anchor_lang::solana_program::program::invoke(
            &instruction,
            accounts,
        ).map_err(|_| crate::error::ErrorCode::EndpointCpiFailed)?;

        Ok(())
    }

    /// Send a composed message through the endpoint
    pub fn send_compose(
        endpoint_program: &AccountInfo,
        accounts: &[AccountInfo],
        to: &[u8; 32],
        guid: &[u8; 32],
        index: u16,
        message: &[u8],
    ) -> Result<()> {
        // Create compose message data
        let mut data = Vec::new();
        data.push(1u8); // send_compose instruction discriminator
        data.extend_from_slice(to);
        data.extend_from_slice(guid);
        data.extend_from_slice(&index.to_le_bytes());
        data.extend_from_slice(&(message.len() as u32).to_le_bytes());
        data.extend_from_slice(message);

        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: *endpoint_program.key,
            accounts: accounts.iter().map(|acc| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }).collect(),
            data,
        };

        anchor_lang::solana_program::program::invoke(
            &instruction,
            accounts,
        ).map_err(|_| crate::error::ErrorCode::EndpointCpiFailed)?;

        Ok(())
    }

    /// Quote message fee
    pub fn quote_send(
        endpoint_program: &AccountInfo,
        accounts: &[AccountInfo],
        dst_eid: u32,
        message: &[u8],
        options: &[u8],
    ) -> Result<u64> {
        // Create quote instruction data
        let mut data = Vec::new();
        data.push(2u8); // quote_send instruction discriminator
        data.extend_from_slice(&dst_eid.to_le_bytes());
        data.extend_from_slice(&(message.len() as u32).to_le_bytes());
        data.extend_from_slice(message);
        data.extend_from_slice(&(options.len() as u32).to_le_bytes());
        data.extend_from_slice(options);

        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: *endpoint_program.key,
            accounts: accounts.iter().map(|acc| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }).collect(),
            data,
        };

        // Execute CPI and return fee (simplified - actual implementation would parse return data)
        anchor_lang::solana_program::program::invoke(
            &instruction,
            accounts,
        ).map_err(|_| crate::error::ErrorCode::EndpointCpiFailed)?;

        // For now, return a placeholder fee (in practice, would parse from return data)
        Ok(1_000_000) // 0.001 SOL
    }
}
