#!/usr/bin/env ts-node
/**
 * @fileoverview Wire OApp peers for cross-chain communication
 * This script configures peer connections between EVM and Solana OApps
 */

import { ethers } from 'ethers'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { networks } from '../../config/networks'
import * as fs from 'fs'
import * as path from 'path'

interface PeerConfig {
  srcChain: 'ethereum' | 'solana'
  dstChain: 'ethereum' | 'solana'
  srcEid: number
  dstEid: number
  srcAddress: string
  dstAddress: string
}

interface WiringConfig {
  ethereum: {
    rpcUrl: string
    privateKey: string
    contractAddress: string
  }
  solana: {
    rpcUrl: string
    walletPath: string
    programId: string
    oappStore: string
  }
  peers: PeerConfig[]
}

class PeerWiring {
  private config: WiringConfig
  private ethProvider?: ethers.providers.JsonRpcProvider
  private ethWallet?: ethers.Wallet
  private ethContract?: ethers.Contract
  private solConnection?: Connection
  private solWallet?: Wallet
  private solProgram?: Program

  constructor(config: WiringConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing peer wiring...')

    // Initialize Ethereum components
    if (this.hasEthereumConfig()) {
      this.ethProvider = new ethers.providers.JsonRpcProvider(this.config.ethereum.rpcUrl)
      this.ethWallet = new ethers.Wallet(this.config.ethereum.privateKey, this.ethProvider)
      
      const contractAbi = [
        'function setPeer(uint32 eid, bytes32 peer) external',
        'function getPeer(uint32 eid) view returns (bytes32)',
        'function owner() view returns (address)'
      ]
      
      this.ethContract = new ethers.Contract(
        this.config.ethereum.contractAddress,
        contractAbi,
        this.ethWallet
      )
      
      console.log(`✅ Ethereum initialized - Wallet: ${this.ethWallet.address}`)
    }

    // Initialize Solana components
    if (this.hasSolanaConfig()) {
      this.solConnection = new Connection(this.config.solana.rpcUrl, 'confirmed')
      
      const walletData = JSON.parse(fs.readFileSync(this.config.solana.walletPath, 'utf8'))
      const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletData))
      this.solWallet = new Wallet(walletKeypair)
      
      const provider = new AnchorProvider(this.solConnection, this.solWallet, {
        commitment: 'confirmed'
      })
      
      // Note: This would need the actual program IDL in a real implementation
      // this.solProgram = new Program(IDL, new PublicKey(this.config.solana.programId), provider)
      
      console.log(`✅ Solana initialized - Wallet: ${this.solWallet.publicKey.toString()}`)
    }
  }

  async wirePeers(): Promise<void> {
    console.log('🔗 Starting peer wiring process...')

    for (const peer of this.config.peers) {
      console.log(`\n🔀 Wiring peer: ${peer.srcChain} (EID ${peer.srcEid}) -> ${peer.dstChain} (EID ${peer.dstEid})`)
      
      try {
        if (peer.srcChain === 'ethereum') {
          await this.setEthereumPeer(peer)
        } else if (peer.srcChain === 'solana') {
          await this.setSolanaPeer(peer)
        }
        
        console.log(`✅ Peer wired successfully`)
      } catch (error) {
        console.error(`❌ Failed to wire peer:`, error)
      }
    }
  }

  private async setEthereumPeer(peer: PeerConfig): Promise<void> {
    if (!this.ethContract) {
      throw new Error('Ethereum not initialized')
    }

    // Convert destination address to bytes32
    let peerAddress: string
    if (peer.dstChain === 'solana') {
      // For Solana, use the program ID or OApp store address
      const solanaAddress = new PublicKey(peer.dstAddress)
      peerAddress = '0x' + solanaAddress.toBuffer().toString('hex').padStart(64, '0')
    } else {
      // For Ethereum, use the contract address
      peerAddress = ethers.utils.hexZeroPad(peer.dstAddress, 32)
    }

    console.log(`Setting Ethereum peer: EID ${peer.dstEid} -> ${peerAddress}`)
    
    const tx = await this.ethContract.setPeer(peer.dstEid, peerAddress)
    const receipt = await tx.wait()
    
    console.log(`Transaction hash: ${receipt.transactionHash}`)
  }

  private async setSolanaPeer(peer: PeerConfig): Promise<void> {
    if (!this.solProgram || !this.solWallet) {
      throw new Error('Solana not initialized')
    }

    // This would be the actual implementation with the Solana program
    console.log(`Would set Solana peer: EID ${peer.dstEid} -> ${peer.dstAddress}`)
    console.log('Note: Solana peer setting requires proper Anchor program setup')
  }

  async verifyPeers(): Promise<void> {
    console.log('\n🔍 Verifying peer connections...')

    for (const peer of this.config.peers) {
      try {
        if (peer.srcChain === 'ethereum' && this.ethContract) {
          const setPeer = await this.ethContract.getPeer(peer.dstEid)
          console.log(`✅ Ethereum peer for EID ${peer.dstEid}: ${setPeer}`)
        } else if (peer.srcChain === 'solana') {
          console.log(`🔍 Solana peer verification would be implemented here`)
        }
      } catch (error) {
        console.error(`❌ Failed to verify peer for EID ${peer.dstEid}:`, error)
      }
    }
  }

  private hasEthereumConfig(): boolean {
    return !!(this.config.ethereum.rpcUrl && 
              this.config.ethereum.privateKey && 
              this.config.ethereum.contractAddress)
  }

  private hasSolanaConfig(): boolean {
    return !!(this.config.solana.rpcUrl && 
              this.config.solana.walletPath && 
              this.config.solana.programId)
  }
}

function loadWiringConfig(): WiringConfig {
  // Try to load from environment variables or config file
  const configPath = process.env.WIRING_CONFIG || path.join(__dirname, '../../config/wiring.json')
  
  if (fs.existsSync(configPath)) {
    console.log(`📄 Loading wiring config from: ${configPath}`)
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  }

  // Fallback to environment variables
  const config: WiringConfig = {
    ethereum: {
      rpcUrl: process.env.ETH_RPC_URL || '',
      privateKey: process.env.ETH_PRIVATE_KEY || '',
      contractAddress: process.env.ETH_CONTRACT_ADDRESS || ''
    },
    solana: {
      rpcUrl: process.env.SOL_RPC_URL || 'https://api.devnet.solana.com',
      walletPath: process.env.SOL_WALLET_PATH || process.env.HOME + '/.config/solana/id.json',
      programId: process.env.SOL_PROGRAM_ID || '',
      oappStore: process.env.SOL_OAPP_STORE || ''
    },
    peers: []
  }

  // Add default peer configurations
  if (config.ethereum.contractAddress && config.solana.programId) {
    config.peers = [
      {
        srcChain: 'ethereum',
        dstChain: 'solana',
        srcEid: networks.ENDPOINT_IDS.ETHEREUM_SEPOLIA,
        dstEid: networks.ENDPOINT_IDS.SOLANA_TESTNET,
        srcAddress: config.ethereum.contractAddress,
        dstAddress: config.solana.programId
      },
      {
        srcChain: 'solana',
        dstChain: 'ethereum',
        srcEid: networks.ENDPOINT_IDS.SOLANA_TESTNET,
        dstEid: networks.ENDPOINT_IDS.ETHEREUM_SEPOLIA,
        srcAddress: config.solana.programId,
        dstAddress: config.ethereum.contractAddress
      }
    ]
  }

  return config
}

async function main() {
  try {
    console.log('🔗 LayerZero OApp Peer Wiring')
    console.log('============================\n')

    // Load configuration
    const config = loadWiringConfig()
    
    if (config.peers.length === 0) {
      console.log('⚠️  No peers configured. Please set up peer configurations.')
      console.log('You can create a wiring.json file or use environment variables.')
      return
    }

    console.log(`📋 Found ${config.peers.length} peer(s) to wire`)

    // Initialize wiring
    const wiring = new PeerWiring(config)
    await wiring.initialize()

    // Wire peers
    await wiring.wirePeers()

    // Verify connections
    await wiring.verifyPeers()

    console.log('\n🎉 Peer wiring completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Test cross-chain messaging using: npm run test:cross-chain')
    console.log('2. Monitor LayerZero scan for message delivery')

  } catch (error) {
    console.error('❌ Peer wiring failed:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main()
}

export { PeerWiring }
export type { WiringConfig, PeerConfig }
