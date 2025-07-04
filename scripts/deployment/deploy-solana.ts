#!/usr/bin/env ts-node
/**
 * @fileoverview Deploy Solana OApp program to testnet/mainnet
 * This script deploys the omnichain-controller program and configures it for LayerZero
 */

import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, Wallet, setProvider, workspace } from '@coral-xyz/anchor'
import { networks } from '../../config/networks'
import * as fs from 'fs'
import * as path from 'path'

interface SolanaDeploymentConfig {
  network: 'devnet' | 'mainnet'
  rpcUrl: string
  walletPath: string
  programId?: string
  endpointId: number
  initialPeers?: Array<{
    eid: number
    address: string
  }>
}

class SolanaDeployer {
  private connection: Connection
  private wallet: Wallet
  private program: Program
  private config: SolanaDeploymentConfig

  constructor(config: SolanaDeploymentConfig) {
    this.config = config
    this.connection = new Connection(config.rpcUrl, 'confirmed')
    
    // Load wallet from file
    const walletData = JSON.parse(fs.readFileSync(config.walletPath, 'utf8'))
    const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletData))
    this.wallet = new Wallet(walletKeypair)

    // Set up Anchor provider
    const provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: 'confirmed'
    })
    setProvider(provider)

    // Load program (this requires the IDL to be available)
    this.program = workspace.OmnichainController
  }

  async deployProgram(): Promise<{
    programId: string
    oappStoreAddress: string
    txSignature: string
  }> {
    console.log('🚀 Starting Solana OApp deployment...')
    console.log(`Network: ${this.config.network}`)
    console.log(`RPC URL: ${this.config.rpcUrl}`)
    console.log(`Deployer: ${this.wallet.publicKey.toString()}`)

    // Get program ID
    const programId = this.program.programId.toString()
    console.log(`📍 Program ID: ${programId}`)

    // Calculate OApp Store PDA
    const [oappStore, oappStoreBump] = await PublicKey.findProgramAddress(
      [Buffer.from('Store')],
      this.program.programId
    )

    console.log(`📦 OApp Store PDA: ${oappStore.toString()}`)

    // Initialize OApp Store
    console.log('⚙️ Initializing OApp Store...')
    
    const endpointPublicKey = new PublicKey(this.getEndpointAddress())
    
    const tx = await this.program.methods
      .initOappStore({
        endpoint: endpointPublicKey
      })
      .accounts({
        oappStore,
        admin: this.wallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc()

    console.log('✅ OApp Store initialized successfully!')
    console.log(`🔗 Transaction signature: ${tx}`)

    return {
      programId,
      oappStoreAddress: oappStore.toString(),
      txSignature: tx
    }
  }

  async configurePeers(oappStoreAddress: string): Promise<void> {
    if (!this.config.initialPeers || this.config.initialPeers.length === 0) {
      console.log('⏭️ No initial peers to configure')
      return
    }

    console.log('🔗 Configuring initial peers...')
    const oappStore = new PublicKey(oappStoreAddress)

    for (const peer of this.config.initialPeers) {
      console.log(`Setting peer for EID ${peer.eid}: ${peer.address}`)

      // Calculate Peer PDA
      const [peerPda] = await PublicKey.findProgramAddress(
        [
          Buffer.from('Peer'),
          oappStore.toBuffer(),
          Buffer.from([peer.eid, 0, 0, 0]) // u32 little endian
        ],
        this.program.programId
      )

      try {
        const tx = await this.program.methods
          .setPeer({
            dstEid: peer.eid,
            peer: Array.from(Buffer.from(peer.address.replace('0x', ''), 'hex'))
          })
          .accounts({
            oappStore,
            peer: peerPda,
            admin: this.wallet.publicKey,
            systemProgram: SystemProgram.programId
          })
          .rpc()

        console.log(`✅ Peer set for EID ${peer.eid}, tx: ${tx}`)
      } catch (error) {
        console.error(`❌ Failed to set peer for EID ${peer.eid}:`, error)
      }
    }
  }

  async verifyDeployment(programId: string, oappStoreAddress: string): Promise<void> {
    console.log('🔍 Verifying deployment...')

    try {
      const oappStore = new PublicKey(oappStoreAddress)
      const storeData = await this.program.account.oappStore.fetch(oappStore)
      
      console.log('✅ OApp Store verification successful!')
      console.log(`👤 Admin: ${storeData.admin.toString()}`)
      console.log(`🔗 Endpoint: ${storeData.endpoint.toString()}`)
      console.log(`🏷️ Bump: ${storeData.bump}`)
    } catch (error) {
      console.error('❌ Deployment verification failed:', error)
      throw error
    }
  }

  async saveDeploymentInfo(deployment: {
    programId: string
    oappStoreAddress: string
    txSignature: string
    network: string
    timestamp: number
  }): Promise<void> {
    const deploymentInfo = {
      ...deployment,
      deployer: this.wallet.publicKey.toString(),
      endpointId: this.config.endpointId,
      rpcUrl: this.config.rpcUrl
    }

    const filePath = path.join(
      __dirname,
      `../../deployments/${this.config.network}-solana-deployment.json`
    )

    // Ensure deployments directory exists
    const deploymentDir = path.dirname(filePath)
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2))
    console.log(`💾 Deployment info saved to: ${filePath}`)
  }

  private getEndpointAddress(): string {
    // Get LayerZero endpoint address for Solana
    const endpoint = networks.ENDPOINT_ADDRESSES.solana[
      this.config.network === 'devnet' ? 'testnet' : 'mainnet'
    ]
    
    if (!endpoint) {
      throw new Error(`No endpoint address found for network: ${this.config.network}`)
    }
    
    return endpoint
  }
}

async function main() {
  try {
    // Get configuration from environment
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet'
    const rpcUrl = process.env.SOLANA_RPC_URL || 
      (network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com')
    const walletPath = process.env.WALLET_PATH || process.env.HOME + '/.config/solana/id.json'

    if (!fs.existsSync(walletPath)) {
      throw new Error(`Wallet file not found at: ${walletPath}. Please set WALLET_PATH environment variable.`)
    }

    const config: SolanaDeploymentConfig = {
      network,
      rpcUrl,
      walletPath,
      endpointId: network === 'devnet' ? networks.ENDPOINT_IDS.SOLANA_TESTNET : networks.ENDPOINT_IDS.SOLANA_MAINNET,
      initialPeers: process.env.INITIAL_PEERS ? JSON.parse(process.env.INITIAL_PEERS) : []
    }

    console.log('🔧 Deployment Configuration:')
    console.log(`- Network: ${config.network}`)
    console.log(`- RPC URL: ${config.rpcUrl}`)
    console.log(`- Wallet: ${walletPath}`)
    console.log(`- Endpoint ID: ${config.endpointId}`)
    console.log('')

    // Deploy program
    const deployer = new SolanaDeployer(config)
    const deployment = await deployer.deployProgram()

    // Configure peers
    await deployer.configurePeers(deployment.oappStoreAddress)

    // Verify deployment
    await deployer.verifyDeployment(deployment.programId, deployment.oappStoreAddress)

    // Save deployment info
    await deployer.saveDeploymentInfo({
      programId: deployment.programId,
      oappStoreAddress: deployment.oappStoreAddress,
      txSignature: deployment.txSignature,
      network: config.network,
      timestamp: Date.now()
    })

    console.log('')
    console.log('🎉 Solana OApp deployment completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Configure peer connections using: npm run wire:peers')
    console.log('2. Test cross-chain messaging using: npm run test:cross-chain')
    console.log('3. Monitor transactions using Solana explorer')

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  main()
}

export { SolanaDeployer }
export type { SolanaDeploymentConfig }
