/**
 * @fileoverview Ethereum DAO Client
 * Handles interactions with the Ethereum DAO contract
 */

import { ethers } from 'ethers'
import { getConfig } from '@/config/contracts'

// DAO contract ABI (simplified for demo)
const DAO_ABI = [
  // Core DAO functions
  'function createUpdateMetadataProposal(string memory description, string memory newUri, string memory newName, string memory newSymbol) external',
  'function createEmergencyPauseProposal(string memory description) external',
  'function vote(uint256 proposalId, bool support) external',
  'function executeProposal(uint256 proposalId) external payable',
  'function getProposal(uint256 proposalId) external view returns (tuple(string description, uint256 votesFor, uint256 votesAgainst, uint256 deadline, bool executed, uint8 proposalType, bytes data))',
  'function proposalCount() external view returns (uint256)',
  'function members(address) external view returns (bool)',
  'function memberCount() external view returns (uint256)',
  'function quoteCommand(uint8 command, bytes memory payload) external view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
  
  // Member management
  'function addMember(address member) external',
  'function removeMember(address member) external',
  
  // Events
  'event ProposalCreated(uint256 indexed proposalId, string description, uint8 proposalType)',
  'event ProposalExecuted(uint256 indexed proposalId, bool success)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, bool support)',
  'event MemberAdded(address indexed member)',
  'event MemberRemoved(address indexed member)',
  'event CrossChainMessageSent(uint256 indexed proposalId, bytes32 indexed messageHash)',
]

export interface Proposal {
  id: number
  description: string
  votesFor: number
  votesAgainst: number
  deadline: number
  executed: boolean
  proposalType: number
  data: string
}

export interface MessagingFee {
  nativeFee: bigint
  lzTokenFee: bigint
}

export class EthereumDAOClient {
  private contract: ethers.Contract
  private provider: ethers.Provider
  private signer?: ethers.Signer
  private isConnected: boolean = false

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider
    this.signer = signer
    
    const config = getConfig()
    this.contract = new ethers.Contract(
      config.ethereum.dao,
      DAO_ABI,
      signer || provider
    )
    
    // Check if provider is properly connected
    this.checkConnection()
  }

  private async checkConnection() {
    try {
      await this.provider.getNetwork()
      this.isConnected = true
    } catch (error) {
      console.warn('Provider not connected:', error)
      this.isConnected = false
    }
  }

  private ensureConnection() {
    if (!this.isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet to interact with the DAO.')
    }
  }

  // Proposal management
  async createUpdateMetadataProposal(
    description: string,
    newUri: string,
    newName: string,
    newSymbol: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }
    
    return await this.contract.createUpdateMetadataProposal(
      description,
      newUri,
      newName,
      newSymbol
    )
  }

  async createEmergencyPauseProposal(
    description: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }
    
    return await this.contract.createEmergencyPauseProposal(description)
  }

  async vote(proposalId: number, support: boolean): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }
    
    return await this.contract.vote(proposalId, support)
  }

  async executeProposal(proposalId: number, value: bigint = BigInt(0)): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }
    
    return await this.contract.executeProposal(proposalId, { value })
  }

  // Data fetching
  async getProposal(proposalId: number): Promise<Proposal> {
    const proposal = await this.contract.getProposal(proposalId)
    return {
      id: proposalId,
      description: proposal.description,
      votesFor: Number(proposal.votesFor),
      votesAgainst: Number(proposal.votesAgainst),
      deadline: Number(proposal.deadline),
      executed: proposal.executed,
      proposalType: proposal.proposalType,
      data: proposal.data,
    }
  }

  async getProposalCount(): Promise<number> {
    try {
      // Check if we have a valid provider and contract
      if (!this.provider || !this.contract) {
        return 0
      }

      // For read-only operations, we don't need to check connection
      // Just check if we can make the call
      const count = await this.contract.proposalCount()
      return Number(count)
    } catch (error) {
      console.warn('Failed to get proposal count:', error)
      // If wallet is not connected or wrong network, return 0
      return 0
    }
  }

  async getAllProposals(): Promise<Proposal[]> {
    try {
      // Check if we have a valid provider and contract
      if (!this.provider || !this.contract) {
        return []
      }

      const count = await this.getProposalCount()
      const proposals: Proposal[] = []
      
      for (let i = 0; i < count; i++) {
        try {
          const proposal = await this.getProposal(i)
          proposals.push(proposal)
        } catch (error) {
          console.warn(`Failed to fetch proposal ${i}:`, error)
        }
      }
      
      return proposals
    } catch (error) {
      console.warn('Failed to get proposals:', error)
      return [] // Return empty array if not connected
    }
  }

  // Member management
  async isDAOMember(address: string): Promise<boolean> {
    try {
      if (!this.provider || !this.contract) {
        return false
      }
      return await this.contract.members(address)
    } catch (error) {
      console.warn('Failed to check DAO membership:', error)
      return false
    }
  }

  async getDAOMemberCount(): Promise<number> {
    try {
      if (!this.provider || !this.contract) {
        return 0
      }
      const count = await this.contract.memberCount()
      return Number(count)
    } catch (error) {
      console.warn('Failed to get member count:', error)
      return 0
    }
  }

  async addMember(address: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }
    
    return await this.contract.addMember(address)
  }

  async removeMember(address: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for this operation')
    }
    
    return await this.contract.removeMember(address)
  }

  // Utility functions
  async quoteCommand(command: number, payload: Uint8Array): Promise<MessagingFee> {
    const fee = await this.contract.quoteCommand(command, payload)
    return {
      nativeFee: fee.nativeFee,
      lzTokenFee: fee.lzTokenFee,
    }
  }

  // Event listeners
  onProposalCreated(callback: (proposalId: number, description: string, proposalType: number) => void) {
    this.contract.on('ProposalCreated', callback)
  }

  onProposalExecuted(callback: (proposalId: number, success: boolean) => void) {
    this.contract.on('ProposalExecuted', callback)
  }

  onVoteCast(callback: (proposalId: number, voter: string, support: boolean) => void) {
    this.contract.on('VoteCast', callback)
  }

  onCrossChainMessageSent(callback: (proposalId: number, messageHash: string) => void) {
    this.contract.on('CrossChainMessageSent', callback)
  }

  // Cleanup
  removeAllListeners() {
    this.contract.removeAllListeners()
  }
}

// Factory function for easier instantiation
export function createEthereumDAOClient(provider: ethers.Provider, signer?: ethers.Signer) {
  return new EthereumDAOClient(provider, signer)
}
