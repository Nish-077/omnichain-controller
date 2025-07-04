#!/usr/bin/env ts-node
/**
 * @fileoverview Deploy EVM OApp contract to testnet/mainnet
 * This script deploys the SolanaControllerDAOV2 contract and configures it for LayerZero
 */

import { ethers } from 'ethers'
import { networks } from '../../config/networks'
import * as fs from 'fs'
import * as path from 'path'

interface DeploymentConfig {
  network: 'sepolia' | 'mainnet'
  privateKey: string
  rpcUrl: string
  endpointAddress: string
  delegate: string
  initialPeers?: Array<{
    eid: number
    address: string
  }>
}

class EVMDeployer {
  private provider: ethers.providers.JsonRpcProvider
  private wallet: ethers.Wallet
  private config: DeploymentConfig

  constructor(config: DeploymentConfig) {
    this.config = config
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)
    this.wallet = new ethers.Wallet(config.privateKey, this.provider)
  }

  async deployContract(): Promise<{
    address: string
    txHash: string
    contractInstance: ethers.Contract
  }> {
    console.log('🚀 Starting EVM OApp deployment...')
    console.log(`Network: ${this.config.network}`)
    console.log(`Deployer: ${this.wallet.address}`)

    // Load contract artifacts - Note: This requires proper Hardhat setup
    // For now, we'll use a basic contract factory approach
    const contractAbi = [
      'constructor(address _endpoint, address _delegate)',
      'function owner() view returns (address)',
      'function endpoint() view returns (address)',
      'function setPeer(uint32 eid, bytes32 peer) external',
      'function setDelegate(address delegate) external'
    ]

    const contractBytecode = '0x' // This should be loaded from artifacts in a real deployment

    if (contractBytecode === '0x') {
      throw new Error('Contract bytecode not found. Please compile contracts first using: npm run compile')
    }

    const contractFactory = new ethers.ContractFactory(contractAbi, contractBytecode, this.wallet)

    // Constructor arguments
    const constructorArgs = [
      this.config.endpointAddress,
      this.config.delegate
    ]

    console.log('📄 Deploying contract with args:', constructorArgs)

    // Deploy contract
    const contract = await contractFactory.deploy(...constructorArgs)
    const receipt = await contract.deployTransaction.wait()

    console.log('✅ Contract deployed successfully!')
    console.log(`📍 Contract address: ${contract.address}`)
    console.log(`🔗 Transaction hash: ${receipt.transactionHash}`)
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`)

    return {
      address: contract.address,
      txHash: receipt.transactionHash,
      contractInstance: contract
    }
  }

  async configureOApp(contractAddress: string): Promise<void> {
    console.log('⚙️  Configuring OApp...')

    const contractAbi = [
      'function owner() view returns (address)',
      'function endpoint() view returns (address)',
      'function setPeer(uint32 eid, bytes32 peer) external',
      'function setDelegate(address delegate) external',
      'function setEnforcedOptions(uint32 eid, uint16 msgType, bytes calldata options) external'
    ]

    const contract = new ethers.Contract(contractAddress, contractAbi, this.wallet)

    // Verify deployment
    const owner = await contract.owner()
    const endpoint = await contract.endpoint()
    
    console.log(`👤 Contract owner: ${owner}`)
    console.log(`🔗 LayerZero endpoint: ${endpoint}`)

    // Set initial peers if provided
    if (this.config.initialPeers && this.config.initialPeers.length > 0) {
      console.log('🔗 Setting initial peers...')
      
      for (const peer of this.config.initialPeers) {
        console.log(`Setting peer for EID ${peer.eid}: ${peer.address}`)
        
        const tx = await contract.setPeer(
          peer.eid,
          ethers.utils.hexZeroPad(peer.address, 32)
        )
        await tx.wait()
        
        console.log(`✅ Peer set for EID ${peer.eid}`)
      }
    }

    console.log('✅ OApp configuration complete!')
  }

  async saveDeploymentInfo(deployment: {
    address: string
    txHash: string
    network: string
    timestamp: number
  }): Promise<void> {
    const deploymentInfo = {
      ...deployment,
      deployer: this.wallet.address,
      endpointAddress: this.config.endpointAddress,
      delegate: this.config.delegate
    }

    const filePath = path.join(
      __dirname,
      `../../deployments/${this.config.network}-evm-deployment.json`
    )

    // Ensure deployments directory exists
    const deploymentDir = path.dirname(filePath)
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2))
    console.log(`💾 Deployment info saved to: ${filePath}`)
  }
}

async function main() {
  try {
    // Get configuration from environment
    const network = (process.env.NETWORK || 'sepolia') as 'sepolia' | 'mainnet'
    const privateKey = process.env.PRIVATE_KEY
    const rpcUrl = process.env.RPC_URL

    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required')
    }

    if (!rpcUrl) {
      throw new Error('RPC_URL environment variable is required')
    }

    // Get network configuration
    const endpointAddress = networks.ENDPOINT_ADDRESSES.ethereum[
      network === 'sepolia' ? 'sepolia' : 'mainnet'
    ]

    const config: DeploymentConfig = {
      network,
      privateKey,
      rpcUrl,
      endpointAddress,
      delegate: process.env.DELEGATE_ADDRESS || '0x0000000000000000000000000000000000000000',
      initialPeers: process.env.INITIAL_PEERS ? JSON.parse(process.env.INITIAL_PEERS) : []
    }

    console.log('🔧 Deployment Configuration:')
    console.log(`- Network: ${config.network}`)
    console.log(`- RPC URL: ${config.rpcUrl}`)
    console.log(`- Endpoint: ${config.endpointAddress}`)
    console.log(`- Delegate: ${config.delegate}`)
    console.log('')

    // Deploy contract
    const deployer = new EVMDeployer(config)
    const deployment = await deployer.deployContract()

    // Configure OApp
    await deployer.configureOApp(deployment.address)

    // Save deployment info
    await deployer.saveDeploymentInfo({
      address: deployment.address,
      txHash: deployment.txHash,
      network: config.network,
      timestamp: Date.now()
    })

    console.log('')
    console.log('🎉 EVM OApp deployment completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Deploy Solana OApp program using: npm run deploy:solana')
    console.log('2. Configure peer connections using: npm run wire:peers')
    console.log('3. Test cross-chain messaging using: npm run test:cross-chain')

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

// Run deployment if this file is executed directly
if (require.main === module) {
  main()
}

export { EVMDeployer }
export type { DeploymentConfig }
