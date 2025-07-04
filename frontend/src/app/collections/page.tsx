import { Navigation } from '@/components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Image as ImageIcon, 
  Layers, 
  TrendingUp,
  Users,
  Settings,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'

export default function CollectionsPage() {
  const collections = [
    {
      id: 1,
      name: "Omnichain State-Compression Collection",
      description: "Massive collection of 1M+ state-compressed NFTs controlled by cross-chain DAO governance",
      totalNFTs: 1000000,
      theme: "Standard",
      chain: "Solana",
      status: "Active",
      lastUpdate: "Live",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=collection&backgroundColor=0284c7",
      stats: {
        holders: 25847,
        volume: "847K SOL",
        floorPrice: "0.001 SOL"
      },
      governance: {
        ethereumDAO: "0x742d35Cc6634C0532925a3b8D091d1a5643Ccc00",
        solanaProgram: "GNkuaJZASsQSS1C5eU5x8mB63Lhty3MgpiK6tsg8dchf"
      }
    },
    {
      id: 2,
      name: "Premium Loyalty Pass",
      description: "Dynamic NFT collection with cross-chain utility",
      totalNFTs: 1247832,
      theme: "Golden",
      chain: "Solana",
      status: "Active",
      lastUpdate: "2 hours ago",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=premium&backgroundColor=f59e0b",
      stats: {
        holders: 98234,
        volume: "2.4M SOL",
        floorPrice: "0.05 SOL"
      }
    },
    {
      id: 3,
      name: "Enterprise Membership",
      description: "Corporate governance tokens with voting rights",
      totalNFTs: 25000,
      theme: "Platinum",
      chain: "Solana",
      status: "Active", 
      lastUpdate: "1 day ago",
      image: "https://api.dicebear.com/7.x/shapes/svg?seed=enterprise&backgroundColor=6b7280",
      stats: {
        holders: 892,
        volume: "156K SOL",
        floorPrice: "5.2 SOL"
      }
    },
    {
      id: 4,
      name: "Community Access",
      description: "Basic tier with community benefits",
      totalNFTs: 500000,
      theme: "Silver",
      chain: "Solana",
      status: "Paused",
      lastUpdate: "3 days ago",
      image: "/api/placeholder/400/400",
      stats: {
        holders: 45123,
        volume: "890K SOL",
        floorPrice: "0.01 SOL"
      }
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Inactive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'Solana': return 'chain-badge-solana'
      case 'Ethereum': return 'chain-badge-ethereum'
      default: return 'chain-badge-layerzero'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Collections</h1>
          <p className="text-muted-foreground">
            Manage your omnichain cNFT collections across multiple networks
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">
                Across all chains
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total cNFTs</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.77M</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Holders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">144K</div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.4M</div>
              <p className="text-xs text-muted-foreground">
                SOL traded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button className="omnichain-gradient text-white">
            <Layers className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card key={collection.id} className="glass-card card-hover overflow-hidden">
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  <div className="absolute top-4 right-4">
                    <Badge className={getStatusColor(collection.status)}>
                      {collection.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg mb-1">{collection.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-2">
                      {collection.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={`chain-badge ${getChainColor(collection.chain)}`}>
                        {collection.chain}
                      </Badge>
                      <Badge variant="outline">
                        {collection.theme}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* NFT Count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total cNFTs</span>
                    <span className="font-semibold">
                      {collection.totalNFTs.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress bar showing utilization */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity Used</span>
                      <span className="font-medium">
                        {((collection.totalNFTs / 2000000) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={(collection.totalNFTs / 2000000) * 100} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold">{collection.stats.holders.toLocaleString()}</div>
                      <div className="text-muted-foreground">Holders</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{collection.stats.volume}</div>
                      <div className="text-muted-foreground">Volume</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{collection.stats.floorPrice}</div>
                      <div className="text-muted-foreground">Floor</div>
                    </div>
                  </div>

                  {/* Last Update */}
                  <div className="text-xs text-muted-foreground">
                    Last updated: {collection.lastUpdate}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Settings className="mr-1 h-3 w-3" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
