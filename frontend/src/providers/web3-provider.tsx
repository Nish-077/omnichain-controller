"use client"

import React, { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http } from 'wagmi'
import { sepolia, mainnet, localhost } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

// Import wallet adapter CSS with suppressed console warnings
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@solana/wallet-adapter-react-ui/styles.css')
}

// Wagmi config with local development endpoints
const config = createConfig({
  chains: [localhost, sepolia, mainnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Omnichain Controller',
        url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      },
    }),
  ],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth-sepolia.public.blastapi.io'),
    [mainnet.id]: http('https://eth-mainnet.public.blastapi.io'),
  },
  ssr: false,
  batch: {
    // Disable batch requests to avoid issues
    multicall: {
      batchSize: 1,
    },
  },
})

// Create a query client with reduced logging
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce console noise from react-query
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

interface Web3ProviderProps {
  children: React.ReactNode
}

// Ethereum Provider Component
function EthereumProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Solana Provider Component  
function SolanaProvider({ children }: { children: React.ReactNode }) {
  // Use environment variable to determine network
  const network = process.env.NEXT_PUBLIC_NETWORK === 'testnet' 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Devnet
  
  // Use environment variable for RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    }
    return process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:8899' 
      : clusterApiUrl(network)
  }, [network])
  
  // Only include essential wallets to reduce bundle size and warnings
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <EthereumProvider>
      <SolanaProvider>
        {children}
      </SolanaProvider>
    </EthereumProvider>
  )
}
