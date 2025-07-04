"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Users,
  Zap,
  Globe,
  Shield,
  Clock,
  Layers
} from 'lucide-react'

export function DashboardMetrics() {
  const metrics = [
    {
      title: "Total cNFTs Managed",
      value: "1,247,832",
      change: "+12.3%",
      trend: "up",
      icon: Layers,
      description: "Active compressed NFTs across all collections"
    },
    {
      title: "Cross-Chain Operations",
      value: "2,847",
      change: "+8.7%",
      trend: "up",
      icon: Globe,
      description: "Successful LayerZero transactions this month"
    },
    {
      title: "Active DAO Members",
      value: "342",
      change: "+5.2%",
      trend: "up",
      icon: Users,
      description: "Governance participants across all DAOs"
    },
    {
      title: "Gas Efficiency",
      value: "99.2%",
      change: "+0.5%",
      trend: "up",
      icon: Zap,
      description: "Cost reduction vs traditional NFT management"
    },
    {
      title: "Network Uptime",
      value: "99.99%",
      change: "0%",
      trend: "stable",
      icon: Shield,
      description: "LayerZero bridge availability"
    },
    {
      title: "Avg. Transaction Time",
      value: "2.3s",
      change: "-0.2s",
      trend: "up",
      icon: Clock,
      description: "Cross-chain operation completion time"
    }
  ]

  const chainStats = [
    { name: "Ethereum", percentage: 65, color: "bg-blue-500" },
    { name: "Solana", percentage: 35, color: "bg-purple-500" },
  ]

  return (
    <section className="py-16 bg-muted/20">
      <div className="container px-4">
        <div className="text-center mb-12">
          <h2 className="section-title omnichain-text-gradient">
            Real-Time Analytics
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Monitor your omnichain operations with comprehensive metrics and insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {metrics.map((metric) => (
            <Card key={metric.title} className="glass-card card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{metric.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                  {metric.trend === "up" && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {metric.trend === "down" && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  {metric.trend === "stable" && (
                    <Activity className="h-3 w-3 text-gray-500" />
                  )}
                  <span className={
                    metric.trend === "up" ? "text-green-500" : 
                    metric.trend === "down" ? "text-red-500" : 
                    "text-gray-500"
                  }>
                    {metric.change}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chain Distribution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Chain Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chainStats.map((chain) => (
                <div key={chain.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{chain.name}</span>
                    <span className="font-medium">{chain.percentage}%</span>
                  </div>
                  <Progress value={chain.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm">Theme update executed</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    2m ago
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-sm">New proposal created</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    5m ago
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-sm">Collection mint completed</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    12m ago
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm">LayerZero bridge active</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    15m ago
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
