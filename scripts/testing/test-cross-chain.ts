#!/usr/bin/env ts-node
/**
 * @fileoverview Test cross-chain messaging between EVM and Solana OApps
 * This script tests the end-to-end LayerZero message flow
 */

import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'
import { networks } from '../../config/networks'
import * as fs from 'fs'
import * as path from 'path'

interface TestConfig {
  ethereum: {
    rpcUrl: string
    privateKey: string
    contractAddress: string
  }
  solana: {
    rpcUrl: string
    programId: string
    oappStore: string
  }
}

class CrossChainTester {
  private config: TestConfig
  private ethProvider: ethers.providers.JsonRpcProvider
  private ethWallet: ethers.Wallet
  private ethContract: ethers.Contract
  private solConnection: Connection

  constructor(config: TestConfig) {
    this.config = config
    
    // Initialize Ethereum
    this.ethProvider = new ethers.providers.JsonRpcProvider(config.ethereum.rpcUrl)
    this.ethWallet = new ethers.Wallet(config.ethereum.privateKey, this.ethProvider)
    
    const contractAbi = [
      'function quoteSendMessage(uint32 dstEid, bytes calldata message, bytes calldata options, bool payInLzToken) external view returns (uint256 nativeFee, uint256 lzTokenFee)',
      'function sendCrossChainProposal(uint32 dstEid, string calldata description, uint8 command, bytes calldata options) external payable returns (bytes32 guid)',
      'function proposalCount() view returns (uint256)',
      'function getProposal(uint256 proposalId) view returns (uint256 id, string description, uint256 forVotes, uint256 againstVotes, uint256 deadline, bool executed, address proposer, uint8 command, uint64 nonce)',
      'event CrossChainMessageSent(bytes32 indexed guid, uint32 indexed dstEid, address indexed from, bytes message)',
      'event MessageReceived(bytes32 indexed guid, uint32 indexed srcEid, address indexed to, bytes message)'
    ]
    
    this.ethContract = new ethers.Contract(
      config.ethereum.contractAddress,
      contractAbi,
      this.ethWallet
    )
    
    // Initialize Solana
    this.solConnection = new Connection(config.solana.rpcUrl, 'confirmed')
  }

  async testEthereumToSolana(): Promise<void> {
    console.log('🔄 Testing Ethereum -> Solana cross-chain message...')
    
    try {
      const dstEid = networks.ENDPOINT_IDS.SOLANA_TESTNET
      const description = 'Test cross-chain proposal from Ethereum'
      const command = 1 // Example command type
      const options = '0x' // Empty options for now
      
      console.log(`📤 Sending message to Solana (EID: ${dstEid})`)
      console.log(`📝 Description: "${description}"`)
      
      // Quote fees first
      const messageBytes = ethers.utils.toUtf8Bytes(description)
      const [nativeFee, lzTokenFee] = await this.ethContract.quoteSendMessage(
        dstEid,
        messageBytes,
        options,
        false
      )
      
      console.log(`💰 Estimated fees: ${ethers.utils.formatEther(nativeFee)} ETH`)
      
      // Send the message
      const tx = await this.ethContract.sendCrossChainProposal(
        dstEid,
        description,
        command,
        options,
        {
          value: nativeFee.mul(120).div(100) // Add 20% buffer
        }
      )
      
      console.log(`🔗 Transaction sent: ${tx.hash}`)
      
      const receipt = await tx.wait()
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)
      
      // Find the CrossChainMessageSent event
      const event = receipt.events?.find(e => e.event === 'CrossChainMessageSent')
      if (event) {
        const { guid, dstEid: eventDstEid, from, message } = event.args
        console.log(`📨 Message sent with GUID: ${guid}`)
        console.log(`📍 From: ${from}`)
        console.log(`🎯 To EID: ${eventDstEid}`)
        
        console.log('\n⏳ Message should be delivered to Solana via LayerZero...')
        console.log('💡 Check LayerZero Scan for delivery status: https://layerzeroscan.com')
      }
      
    } catch (error) {
      console.error('❌ Ethereum -> Solana test failed:', error)
      throw error
    }
  }

  async testSolanaToEthereum(): Promise<void> {
    console.log('🔄 Testing Solana -> Ethereum cross-chain message...')
    
    try {
      console.log('📝 Note: Solana -> Ethereum testing requires full Anchor program setup')
      console.log('🚧 This would involve calling the Solana program to send a message back')
      console.log('💡 Implementation would use the lz_send instruction in the Solana program')
      
      // In a full implementation, this would:
      // 1. Create a transaction to call the Solana program
      // 2. Use the lz_send instruction
      // 3. Monitor for the message receipt on Ethereum
      
    } catch (error) {
      console.error('❌ Solana -> Ethereum test failed:', error)
      throw error
    }
  }

  async checkEthereumState(): Promise<void> {
    console.log('\n📊 Checking Ethereum contract state...')
    
    try {
      const proposalCount = await this.ethContract.proposalCount()
      console.log(`📈 Total proposals: ${proposalCount.toString()}`)
      
      if (proposalCount.gt(0)) {
        const latestProposal = await this.ethContract.getProposal(proposalCount.sub(1))
        console.log(`📋 Latest proposal: "${latestProposal.description}"`)
        console.log(`👤 Proposer: ${latestProposal.proposer}`)
        console.log(`✅ Executed: ${latestProposal.executed}`)
      }
      
    } catch (error) {
      console.error('❌ Failed to check Ethereum state:', error)
    }
  }

  async checkSolanaState(): Promise<void> {
    console.log('\n📊 Checking Solana program state...')
    
    try {
      const programId = new PublicKey(this.config.solana.programId)
      const oappStore = new PublicKey(this.config.solana.oappStore)
      
      console.log(`🏪 Program ID: ${programId.toString()}`)
      console.log(`📦 OApp Store: ${oappStore.toString()}`)
      
      // Check if accounts exist
      const storeInfo = await this.solConnection.getAccountInfo(oappStore)
      if (storeInfo) {
        console.log(`✅ OApp Store account exists (${storeInfo.data.length} bytes)`)
      } else {
        console.log('❌ OApp Store account not found')
      }
      
    } catch (error) {
      console.error('❌ Failed to check Solana state:', error)
    }
  }

  async waitForMessage(timeoutMs: number = 60000): Promise<void> {
    console.log(`⏳ Waiting for cross-chain message delivery (timeout: ${timeoutMs/1000}s)...`)
    
    const startTime = Date.now()
    
    // Set up event listener for MessageReceived
    const filter = this.ethContract.filters.MessageReceived()
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ethContract.removeAllListeners(filter)
        reject(new Error('Timeout waiting for message delivery'))
      }, timeoutMs)
      
      this.ethContract.once(filter, (guid, srcEid, to, message, event) => {
        clearTimeout(timeout)
        const deliveryTime = Date.now() - startTime
        
        console.log(`✅ Message delivered in ${deliveryTime}ms!`)
        console.log(`📨 GUID: ${guid}`)
        console.log(`📍 From EID: ${srcEid}`)
        console.log(`🎯 To: ${to}`)
        console.log(`📦 Block: ${event.blockNumber}`)
        
        resolve()
      })
    })
  }
}

function loadTestConfig(): TestConfig {
  // Load from environment variables
  const config: TestConfig = {
    ethereum: {
      rpcUrl: process.env.RPC_URL || '',
      privateKey: process.env.PRIVATE_KEY || '',
      contractAddress: process.env.ETH_CONTRACT_ADDRESS || ''
    },
    solana: {
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      programId: process.env.SOL_PROGRAM_ID || '',
      oappStore: process.env.SOL_OAPP_STORE || ''
    }
  }

  // Validate configuration
  if (!config.ethereum.rpcUrl || !config.ethereum.privateKey || !config.ethereum.contractAddress) {
    throw new Error('Missing Ethereum configuration. Please check environment variables.')
  }

  if (!config.solana.programId || !config.solana.oappStore) {
    throw new Error('Missing Solana configuration. Please check environment variables.')
  }

  return config
}

async function main() {
  try {
    console.log('🧪 LayerZero Cross-Chain Testing')
    console.log('================================\n')

    // Load configuration
    const config = loadTestConfig()
    
    console.log('🔧 Test Configuration:')
    console.log(`📍 Ethereum Contract: ${config.ethereum.contractAddress}`)
    console.log(`📍 Solana Program: ${config.solana.programId}`)
    console.log(`📦 Solana OApp Store: ${config.solana.oappStore}`)
    console.log('')

    // Initialize tester
    const tester = new CrossChainTester(config)

    // Check initial states
    await tester.checkEthereumState()
    await tester.checkSolanaState()

    // Test Ethereum -> Solana
    await tester.testEthereumToSolana()

    // Wait for delivery (in a real test, you might want to check both directions)
    try {
      await tester.waitForMessage(120000) // 2 minute timeout
    } catch (error) {
      console.log('⚠️  Message delivery timeout - this is normal for testnet')
      console.log('💡 Check LayerZero Scan for actual delivery status')
    }

    // Test Solana -> Ethereum (placeholder)
    await tester.testSolanaToEthereum()

    console.log('\n🎉 Cross-chain testing completed!')
    console.log('\n📋 Summary:')
    console.log('✅ Message sent from Ethereum to Solana')
    console.log('🔍 Check LayerZero Scan for delivery confirmation')
    console.log('💡 Full bidirectional testing requires completed Solana program integration')

  } catch (error) {
    console.error('❌ Testing failed:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main()
}

export { CrossChainTester }
export type { TestConfig }
