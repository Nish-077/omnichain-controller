/**
 * @fileoverview React hooks for Ethereum DAO integration
 * Provides easy-to-use hooks for interacting with the Ethereum DAO contract
 */

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import { EthereumDAOClient, Proposal } from '@/lib/ethereum-dao-client'

// Hook to get DAO client instance
export function useEthereumDAO() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [daoClient, setDAOClient] = useState<EthereumDAOClient | null>(null)

  useEffect(() => {
    try {
      // Always use localhost for development, regardless of wagmi connection
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
      
      let signer: ethers.Signer | undefined
      if (walletClient && address) {
        // Create ethers signer from wagmi wallet client
        signer = new ethers.Wallet(walletClient.account.address, provider)
      }
      
      const client = new EthereumDAOClient(provider, signer)
      setDAOClient(client)
    } catch (error) {
      console.warn('Failed to initialize DAO client:', error)
      setDAOClient(null)
    }
  }, [publicClient, walletClient, address])

  return { daoClient, address, isConnected: !!address }
}

// Hook to fetch proposals
export function useProposals() {
  const { daoClient } = useEthereumDAO()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    if (!daoClient) {
      setLoading(false)
      setProposals([])
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const allProposals = await daoClient.getAllProposals()
      setProposals(allProposals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch proposals')
      console.error('Error fetching proposals:', err)
      setProposals([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [daoClient])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  return { proposals, loading, error, refetch: fetchProposals }
}

// Hook to check if user is DAO member
export function useDAOMembership() {
  const { daoClient, address } = useEthereumDAO()
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkMembership = async () => {
      if (!daoClient || !address) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        const memberStatus = await daoClient.isDAOMember(address)
        setIsMember(memberStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check membership')
        console.error('Error checking membership:', err)
      } finally {
        setLoading(false)
      }
    }

    checkMembership()
  }, [daoClient, address])

  return { isMember, loading, error }
}

// Hook to get all DAO members
export function useDAOMembers() {
  const { daoClient } = useEthereumDAO()
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!daoClient) {
      setMembers([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      // Since the contract doesn't have getDAOMembers, we'll return empty for now
      // In a real implementation, we'd query events or maintain an off-chain list
      setMembers([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members')
      console.error('Error fetching members:', err)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [daoClient])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refetch: fetchMembers }
}

// Hook for proposal actions
export function useProposalActions() {
  const { daoClient } = useEthereumDAO()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createUpdateMetadataProposal = useCallback(async (
    description: string,
    newUri: string,
    newName: string,
    newSymbol: string
  ) => {
    if (!daoClient) throw new Error('DAO client not available')
    
    try {
      setLoading(true)
      setError(null)
      const tx = await daoClient.createUpdateMetadataProposal(description, newUri, newName, newSymbol)
      await tx.wait()
      return tx.hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [daoClient])

  const createEmergencyPauseProposal = useCallback(async (description: string) => {
    if (!daoClient) throw new Error('DAO client not available')
    
    try {
      setLoading(true)
      setError(null)
      const tx = await daoClient.createEmergencyPauseProposal(description)
      await tx.wait()
      return tx.hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create emergency proposal'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [daoClient])

  const vote = useCallback(async (proposalId: number, support: boolean) => {
    if (!daoClient) throw new Error('DAO client not available')
    
    try {
      setLoading(true)
      setError(null)
      const tx = await daoClient.vote(proposalId, support)
      await tx.wait()
      return tx.hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [daoClient])

  const executeProposal = useCallback(async (proposalId: number, value: bigint = BigInt(0)) => {
    if (!daoClient) throw new Error('DAO client not available')
    
    try {
      setLoading(true)
      setError(null)
      const tx = await daoClient.executeProposal(proposalId, value)
      await tx.wait()
      return tx.hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute proposal'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [daoClient])

  return {
    createUpdateMetadataProposal,
    createEmergencyPauseProposal,
    vote,
    executeProposal,
    loading,
    error,
  }
}

// Hook for transaction events
export function useDAOEvents() {
  const { daoClient } = useEthereumDAO()
  const [events, setEvents] = useState<{
    type: string;
    proposalId?: number;
    description?: string;
    proposalType?: number;
    timestamp: number;
  }[]>([])

  useEffect(() => {
    if (!daoClient) return

    const handleProposalCreated = (proposalId: number, description: string, proposalType: number) => {
      const event = {
        type: 'ProposalCreated',
        proposalId,
        description,
        proposalType,
        timestamp: Date.now(),
      }
      setEvents(prev => [event, ...prev])
    }

    const handleProposalExecuted = (proposalId: number, success: boolean) => {
      const event = {
        type: 'ProposalExecuted',
        proposalId,
        success,
        timestamp: Date.now(),
      }
      setEvents(prev => [event, ...prev])
    }

    const handleVoteCast = (proposalId: number, voter: string, support: boolean) => {
      const event = {
        type: 'VoteCast',
        proposalId,
        voter,
        support,
        timestamp: Date.now(),
      }
      setEvents(prev => [event, ...prev])
    }

    const handleCrossChainMessageSent = (proposalId: number, messageHash: string) => {
      const event = {
        type: 'CrossChainMessageSent',
        proposalId,
        messageHash,
        timestamp: Date.now(),
      }
      setEvents(prev => [event, ...prev])
    }

    // Set up event listeners
    daoClient.onProposalCreated(handleProposalCreated)
    daoClient.onProposalExecuted(handleProposalExecuted)
    daoClient.onVoteCast(handleVoteCast)
    daoClient.onCrossChainMessageSent(handleCrossChainMessageSent)

    return () => {
      daoClient.removeAllListeners()
    }
  }, [daoClient])

  return { events }
}

// Hook for gas estimation
export function useGasEstimation() {
  const { daoClient } = useEthereumDAO()

  const quoteCommand = useCallback(async (command: number, payload: Uint8Array) => {
    if (!daoClient) throw new Error('DAO client not available')
    
    try {
      const fee = await daoClient.quoteCommand(command, payload)
      return fee
    } catch (err) {
      console.error('Error estimating gas:', err)
      throw err
    }
  }, [daoClient])

  return { quoteCommand }
}
