/**
 * @fileoverview React hooks for Solana Controller integration
 * Provides easy-to-use hooks for interacting with the Solana program
 */

import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { 
  SolanaControllerClient, 
  Collection, 
  cNFTMetadata, 
  OperationStatus
} from '@/lib/solana-controller-client'

// Hook to get Solana client instance
export function useSolanaController() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [controllerClient, setControllerClient] = useState<SolanaControllerClient | null>(null)

  useEffect(() => {
    if (connection) {
      // Create client without wallet for now (wallet integration will be added later)
      const client = new SolanaControllerClient(connection, undefined)
      setControllerClient(client)
    }
  }, [connection, wallet])

  return { 
    controllerClient, 
    wallet, 
    isConnected: wallet.connected && !!wallet.publicKey 
  }
}

// Hook to fetch collection data
export function useCollection(collectionAddress?: string) {
  const { controllerClient } = useSolanaController()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCollection = useCallback(async () => {
    if (!controllerClient || !collectionAddress) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const collectionPDA = new PublicKey(collectionAddress)
      const collectionData = await controllerClient.getCollection(collectionPDA)
      setCollection(collectionData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch collection')
      console.error('Error fetching collection:', err)
    } finally {
      setLoading(false)
    }
  }, [controllerClient, collectionAddress])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  return { collection, loading, error, refetch: fetchCollection }
}

// Hook to fetch cNFTs from a collection
export function useCNFTs(collectionAddress?: string, limit: number = 100) {
  const { controllerClient } = useSolanaController()
  const [cNFTs, setcNFTs] = useState<cNFTMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchcNFTs = useCallback(async () => {
    if (!controllerClient || !collectionAddress) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const collectionPDA = new PublicKey(collectionAddress)
      const allcNFTs = await controllerClient.getAllcNFTs(collectionPDA, limit)
      setcNFTs(allcNFTs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cNFTs')
      console.error('Error fetching cNFTs:', err)
    } finally {
      setLoading(false)
    }
  }, [controllerClient, collectionAddress, limit])

  useEffect(() => {
    fetchcNFTs()
  }, [fetchcNFTs])

  return { cNFTs, loading, error, refetch: fetchcNFTs }
}

// Hook for collection operations
export function useCollectionActions() {
  const { controllerClient, wallet } = useSolanaController()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initializeMassiveCollection = useCallback(async () => {
    if (!controllerClient || !wallet.publicKey) {
      throw new Error('Wallet not connected')
    }
    
    try {
      setLoading(true)
      setError(null)
      const result = await controllerClient.initializeMassiveCollection(
        wallet.publicKey
      )
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize collection'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [controllerClient, wallet.publicKey])

  const massMint = useCallback(async (
    collectionAddress: string,
    count: number,
    baseUri: string
  ) => {
    if (!controllerClient) throw new Error('Controller client not available')
    
    try {
      setLoading(true)
      setError(null)
      const collectionPDA = new PublicKey(collectionAddress)
      const result = await controllerClient.massMint(collectionPDA, {
        count,
        startIndex: 0,
        baseUri,
        operationId: `mass_mint_${Date.now()}`,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mass mint'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [controllerClient])

  const batchThemeUpdate = useCallback(async (
    collectionAddress: string,
    newTheme: string,
    targetRange?: [number, number]
  ) => {
    if (!controllerClient) throw new Error('Controller client not available')
    
    try {
      setLoading(true)
      setError(null)
      const collectionPDA = new PublicKey(collectionAddress)
      const result = await controllerClient.batchThemeUpdate(collectionPDA, {
        newTheme,
        targetRange,
        operationId: `theme_update_${Date.now()}`,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update theme'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [controllerClient])

  return {
    initializeMassiveCollection,
    massMint,
    batchThemeUpdate,
    loading,
    error,
  }
}

// Hook to track operation status
export function useOperationStatus(operationId?: string) {
  const { controllerClient } = useSolanaController()
  const [status, setStatus] = useState<OperationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!controllerClient || !operationId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const operationStatus = await controllerClient.getOperationStatus(operationId)
      setStatus(operationStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch operation status')
      console.error('Error fetching operation status:', err)
    } finally {
      setLoading(false)
    }
  }, [controllerClient, operationId])

  useEffect(() => {
    if (operationId) {
      fetchStatus()
      
      // Poll for updates if operation is in progress
      const interval = setInterval(() => {
        if (status?.status === 'pending' || status?.status === 'processing') {
          fetchStatus()
        }
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [fetchStatus, operationId, status?.status])

  return { status, loading, error, refetch: fetchStatus }
}

// Hook for wallet balance
export function useSolanaBalance() {
  const { controllerClient, wallet } = useSolanaController()
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!controllerClient || !wallet.publicKey) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      const walletBalance = await controllerClient.getBalance(wallet.publicKey)
      setBalance(walletBalance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
      console.error('Error fetching balance:', err)
    } finally {
      setLoading(false)
    }
  }, [controllerClient, wallet.publicKey])

  const requestAirdrop = useCallback(async (amount: number = 1) => {
    if (!controllerClient || !wallet.publicKey) {
      throw new Error('Wallet not connected')
    }
    
    try {
      const signature = await controllerClient.requestAirdrop(wallet.publicKey, amount)
      await fetchBalance() // Refresh balance after airdrop
      return signature
    } catch (err) {
      console.error('Error requesting airdrop:', err)
      throw err
    }
  }, [controllerClient, wallet.publicKey, fetchBalance])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  return { balance, loading, error, requestAirdrop, refetch: fetchBalance }
}

// Hook for Solana events
export function useSolanaEvents() {
  const { controllerClient } = useSolanaController()
  const [events] = useState<{
    type: string;
    collection?: string;
    operationId?: string;
    update?: Record<string, unknown>;
    result?: Record<string, unknown>;
    timestamp: number;
  }[]>([])

  useEffect(() => {
    if (!controllerClient) return

    // Set up event listeners
    controllerClient.onCollectionUpdate()
    controllerClient.onBatchUpdateComplete()

    return () => {
      controllerClient.removeAllListeners()
    }
  }, [controllerClient])

  return { events }
}

// Custom hook for demo data
export function useDemoData() {
  const [demoCollection] = useState<Collection>({
    authority: new PublicKey('11111111111111111111111111111111'),
    merkleTree: new PublicKey('11111111111111111111111111111111'),
    maxItems: 1000000,
    currentItems: 500000,
    name: 'Demo Omnichain Collection',
    symbol: 'DOC',
    uri: 'https://example.com/demo-metadata.json',
    isPaused: false,
    layerzeroEndpoint: new PublicKey('11111111111111111111111111111111'),
    trustedRemote: new PublicKey('11111111111111111111111111111111'),
    bump: 255,
  })

  const [democNFTs] = useState<cNFTMetadata[]>(
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Dynamic Loyalty Pass #${i}`,
      symbol: 'DLP',
      uri: `https://example.com/metadata/${i}.json`,
      theme: i % 3 === 0 ? 'Golden' : i % 3 === 1 ? 'Premium' : 'Standard',
      tier: i < 10 ? 'Gold' : i < 25 ? 'Silver' : 'Bronze',
      attributes: {
        'Theme': i % 3 === 0 ? 'Golden' : i % 3 === 1 ? 'Premium' : 'Standard',
        'Tier': i < 10 ? 'Gold' : i < 25 ? 'Silver' : 'Bronze',
        'Controlled By': 'DAO',
        'Chain': 'Solana',
        'Rarity': i < 5 ? 'Legendary' : i < 15 ? 'Epic' : i < 30 ? 'Rare' : 'Common',
      },
    }))
  )

  return { demoCollection, democNFTs }
}
