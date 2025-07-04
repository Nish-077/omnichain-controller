"use client"

import React, { useState } from 'react'
import { useAccount, useConnect, useDisconnect, type Connector } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Wallet, CheckCircle, AlertCircle } from 'lucide-react'

interface WalletConnectionProps {
  className?: string
}

export function WalletConnection({ className }: WalletConnectionProps) {
  // Ethereum wallet state
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect: disconnectEth } = useDisconnect()

  // Solana wallet state
  const { 
    publicKey: solPublicKey, 
    connected: isSolConnected,
    disconnect: disconnectSol 
  } = useWallet()

  const handleEthConnect = (connector: Connector) => {
    connect({ connector })
  }

  const handleDisconnectAll = () => {
    disconnectEth()
    disconnectSol()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Connections
        </CardTitle>
        <CardDescription>
          Connect your Ethereum and Solana wallets to interact with the DAO and cNFTs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ethereum Wallet */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">ETH</span>
            </div>
            <div>
              <h3 className="font-medium">Ethereum</h3>
              <p className="text-sm text-muted-foreground">
                {isEthConnected ? `${ethAddress?.slice(0, 6)}...${ethAddress?.slice(-4)}` : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEthConnected ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
            <EthereumWalletButton 
              isConnected={isEthConnected} 
              connectors={connectors} 
              onConnect={handleEthConnect} 
              onDisconnect={() => disconnectEth()} 
            />
          </div>
        </div>

        {/* Solana Wallet */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">SOL</span>
            </div>
            <div>
              <h3 className="font-medium">Solana</h3>
              <p className="text-sm text-muted-foreground">
                {isSolConnected ? `${solPublicKey?.toBase58().slice(0, 6)}...${solPublicKey?.toBase58().slice(-4)}` : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSolConnected ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
            <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !border-0 !rounded-md !h-9 !px-3 !text-sm" />
          </div>
        </div>

        {/* Connection Status Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status</span>
            {isEthConnected && isSolConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready for Cross-Chain Demo
                </Badge>
                <Button variant="outline" size="sm" onClick={handleDisconnectAll}>
                  Disconnect All
                </Button>
              </div>
            ) : (
              <Badge variant="secondary">
                Connect both wallets to proceed
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Ethereum Wallet Button Component
interface EthereumWalletButtonProps {
  isConnected: boolean
  connectors: readonly Connector[]
  onConnect: (connector: Connector) => void
  onDisconnect: () => void
}

function EthereumWalletButton({ isConnected, connectors, onConnect, onDisconnect }: EthereumWalletButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isConnected) {
    return (
      <Button variant="outline" size="sm" onClick={onDisconnect}>
        Disconnect
      </Button>
    )
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !border-0 !rounded-md !h-9 !px-3 !text-sm">
          Select Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a wallet on Ethereum to continue</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                onConnect(connector)
                setIsOpen(false)
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {connector.name.slice(0, 2)}
                  </span>
                </div>
                <span>{connector.name}</span>
                <Badge variant="secondary" className="ml-auto">
                  Detected
                </Badge>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to check if both wallets are connected
export function useWalletsConnected() {
  const { isConnected: isEthConnected } = useAccount()
  const { connected: isSolConnected } = useWallet()
  
  return {
    ethConnected: isEthConnected,
    solConnected: isSolConnected,
    bothConnected: isEthConnected && isSolConnected,
  }
}
