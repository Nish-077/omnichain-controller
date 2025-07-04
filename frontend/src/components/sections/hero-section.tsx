"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  Zap, 
  Globe, 
  Shield, 
  TrendingUp,
  Users,
  Activity,
  Layers
} from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  const stats = [
    { label: 'cNFTs Managed', value: '1M+', icon: Layers },
    { label: 'Gas Efficiency', value: '99%', icon: TrendingUp },
    { label: 'Active DAOs', value: '50+', icon: Users },
    { label: 'Cross-Chain Ops', value: '24/7', icon: Activity },
  ]

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="container relative z-10 px-4 py-20 md:py-32">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="chain-badge-layerzero text-sm px-4 py-2">
              <Zap className="mr-2 h-4 w-4" />
              LayerZero V2 Compliant • Enterprise Ready
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="hero-text omnichain-text-gradient">
              Control 1M+ cNFTs
              <br />
              Across Chains
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The world&apos;s first enterprise-grade omnichain controller that enables Ethereum DAOs 
              to govern massive-scale cNFT collections on Solana in real-time through LayerZero.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/dao">
              <Button size="lg" className="omnichain-gradient text-white hover:opacity-90 transition-all duration-200">
                Launch DAO Governance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/collections">
              <Button size="lg" variant="outline" className="glow-effect">
                <Globe className="mr-2 h-4 w-4" />
                View Collections
              </Button>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Audited & Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span>LayerZero V2</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-500" />
              <span>Cross-Chain Native</span>
            </div>
          </motion.div>
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card p-6 text-center space-y-2 card-hover"
            >
              <stat.icon className="h-8 w-8 mx-auto text-primary" />
              <div className="text-2xl font-bold omnichain-text-gradient">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
