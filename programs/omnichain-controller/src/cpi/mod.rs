use anchor_lang::prelude::*;

/// CPI helper functions for LayerZero endpoint interactions
pub mod endpoint {
    use super::*;

    /// Clear a message from the endpoint - CRITICAL: Must be called FIRST in lz_receive
    pub fn clear(
        endpoint_program: &AccountInfo,
        accounts: &[AccountInfo],
        oapp_signer_seeds: &[&[u8]],
        params: &crate::instructions::lz_receive::ClearParams,
    ) -> Result<()> {
        // Create CPI instruction for endpoint clear
        let mut data = Vec::new();
        data.push(0u8); // clear instruction discriminator (LayerZero V2 endpoint)
        data.extend_from_slice(&params.receiver.to_bytes());
        data.extend_from_slice(&params.src_eid.to_le_bytes());
        data.extend_from_slice(&params.sender);
        data.extend_from_slice(&params.nonce.to_le_bytes());
        data.extend_from_slice(&params.guid);
        data.extend_from_slice(&(params.message.len() as u32).to_le_bytes());
        data.extend_from_slice(&params.message);
        
        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: *endpoint_program.key,
            accounts: accounts.iter().map(|acc| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }).collect(),
            data,
        };

        // Execute CPI with OApp signer seeds
        anchor_lang::solana_program::program::invoke_signed(
            &instruction,
            accounts,
            &[oapp_signer_seeds],
        ).map_err(|_| crate::error::ErrorCode::EndpointCpiFailed)?;

        Ok(())
    }

    /// Register OApp with LayerZero endpoint - REQUIRED during initialization
    pub fn register_oapp(
        endpoint_program: &AccountInfo,
        accounts: &[AccountInfo],
        oapp_signer_seeds: &[&[u8]],
        oapp_address: &Pubkey,
        delegate: &Pubkey,
    ) -> Result<()> {
        // Create CPI instruction for OApp registration
        let mut data = Vec::new();
        data.push(3u8); // register_oapp instruction discriminator
        data.extend_from_slice(&oapp_address.to_bytes());
        data.extend_from_slice(&delegate.to_bytes());
        
        let instruction = anchor_lang::solana_program::instruction::Instruction {
            program_id: *endpoint_program.key,
            accounts: accounts.iter().map(|acc| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }).collect(),
            data,
        };

        // Execute CPI with OApp signer seeds
        anchor_lang::solana_program::program::invoke_signed(
            &instruction,
            accounts,
            &[oapp_signer_seeds],
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
