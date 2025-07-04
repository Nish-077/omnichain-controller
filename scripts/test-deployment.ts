/**
 * @fileoverview Quick test script to verify local deployment
 */

import { ethers } from 'ethers'
import { Connection, PublicKey } from '@solana/web3.js'

// Test Ethereum contract
async function testEthereumContract() {
  console.log('🔗 Testing Ethereum Contract...')
  
  try {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
    const daoAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
    
    // Simple contract ABI for testing
    const abi = [
      'function proposalCount() external view returns (uint256)',
      'function members(address) external view returns (bool)',
      'function memberCount() external view returns (uint256)'
    ]
    
    const contract = new ethers.Contract(daoAddress, abi, provider)
    
    // Test contract calls
    const proposalCount = await contract.proposalCount()
    const memberCount = await contract.memberCount()
    
    console.log('✅ Ethereum contract is working!')
    console.log(`   📊 Proposal count: ${proposalCount}`)
    console.log(`   👥 Member count: ${memberCount}`)
    
    return true
  } catch (error) {
    console.error('❌ Ethereum contract test failed:', error.message)
    return false
  }
}

// Test Solana program
async function testSolanaProgram() {
  console.log('🔗 Testing Solana Program...')
  
  try {
    const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
    const programId = new PublicKey('4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg')
    
    // Test connection and program existence
    const programInfo = await connection.getAccountInfo(programId)
    
    if (programInfo) {
      console.log('✅ Solana program is deployed!')
      console.log(`   📍 Program ID: ${programId.toString()}`)
      console.log(`   💾 Data length: ${programInfo.data.length} bytes`)
    } else {
      throw new Error('Program not found')
    }
    
    return true
  } catch (error) {
    console.error('❌ Solana program test failed:', error.message)
    return false
  }
}

// Main test function
async function main() {
  console.log('🚀 Testing Local Deployment...')
  console.log('==============================')
  
  const ethereumOk = await testEthereumContract()
  const solanaOk = await testSolanaProgram()
  
  console.log('\n📋 Test Results:')
  console.log('================')
  console.log(`Ethereum Contract: ${ethereumOk ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Solana Program: ${solanaOk ? '✅ PASS' : '❌ FAIL'}`)
  
  if (ethereumOk && solanaOk) {
    console.log('\n🎉 All tests passed! Demo is ready! 🎉')
    console.log('🌐 Frontend: http://localhost:3001')
  } else {
    console.log('\n⚠️  Some tests failed. Check the deployment.')
  }
}

// Run tests
main().catch(console.error)
