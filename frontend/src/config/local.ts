/**
 * Local development configuration
 * Updated automatically by deploy script
 */

export const LOCAL_CONFIG = {
  solana: {
    programId: '4GYSuwncERwCAM1C8yb1WUekYVzTPs17RA2NC1DLFgfg',
    cluster: 'http://127.0.0.1:8899',
    commitment: 'processed',
  },
  ethereum: {
    // Contract address will be updated after deployment
    dao: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // Default first Hardhat address
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
  },
  demo: {
    enabled: true,
    autoConnect: true,
  },
} as const

export default LOCAL_CONFIG
