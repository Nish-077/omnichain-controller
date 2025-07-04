/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress external module warnings in development
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Experimental features for better performance
  experimental: {
    // Reduce bundle size by tree shaking unused wallet adapters
    optimizePackageImports: [
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-wallets",
      "lucide-react"
    ],
  },
  
  // Webpack configuration for suppressing warnings and optimizations
  webpack: (config, { dev, isServer }) => {
    // Suppress pino-pretty warnings in development
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    
    // Ignore specific warnings from wallet adapter packages
    config.infrastructureLogging = {
      level: "error",
    };
    
    // Suppress pino-pretty warnings in client-side development builds
    if (dev && !isServer) {
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (
          typeof args[0] === 'string' && 
          args[0].includes('pino-pretty')
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
