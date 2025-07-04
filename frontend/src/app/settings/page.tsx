import { Navigation } from '@/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Wallet, 
  Network, 
  Shield, 
  Bell,
  Globe,
  Key,
  Settings as SettingsIcon,
  ExternalLink
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your omnichain controller configuration and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Connection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Connection
              </CardTitle>
              <CardDescription>
                Connect your wallets for cross-chain operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ethereum Wallet</Label>
                <div className="flex items-center gap-2">
                  <Badge className="chain-badge-ethereum">
                    Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    0x1234...5678
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Solana Wallet</Label>
                <div className="flex items-center gap-2">
                  <Badge className="chain-badge-solana">
                    Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    9WzD...Xy3k
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Reconnect Wallets
              </Button>
            </CardContent>
          </Card>

          {/* Network Configuration */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Settings
              </CardTitle>
              <CardDescription>
                Configure your preferred networks and endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ethereum Network</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Sepolia Testnet</Badge>
                  <Badge className="chain-badge-layerzero text-xs">
                    EID: 40161
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Solana Network</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Devnet</Badge>
                  <Badge className="chain-badge-layerzero text-xs">
                    EID: 40168
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>LayerZero Endpoint</Label>
                <Input 
                  placeholder="LayerZero endpoint URL" 
                  value="https://testnet.layerzero-api.com"
                  readOnly
                />
              </div>

              <Button variant="outline" className="w-full">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Configure Networks
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Security and authorization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Multi-sig Threshold</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">3 of 5</Badge>
                  <span className="text-xs text-muted-foreground">
                    Required signatures
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>API Access</Label>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Key className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Emergency Pause</Label>
                <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                  Emergency Stop
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Proposal Created</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vote Required</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Transaction Complete</span>
                  <Badge variant="outline">Disabled</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error Alerts</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </Badge>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Bell className="mr-2 h-4 w-4" />
                Configure Alerts
              </Button>
            </CardContent>
          </Card>

          {/* Cross-Chain Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Cross-Chain Options
              </CardTitle>
              <CardDescription>
                LayerZero and cross-chain configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gas Settings</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Gas Limit:</span>
                    <div className="font-medium">200,000</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Fee:</span>
                    <div className="font-medium">0.01 ETH</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Message Retry</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Auto-retry: 3x</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmation Time</Label>
                <Input 
                  placeholder="Block confirmations" 
                  value="12"
                  readOnly
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Advanced
              </CardTitle>
              <CardDescription>
                Developer and advanced configuration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Debug Mode</Label>
                <Badge variant="outline">Disabled</Badge>
              </div>
              
              <div className="space-y-2">
                <Label>API Rate Limit</Label>
                <div className="text-sm text-muted-foreground">
                  100 requests/minute
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cache TTL</Label>
                <Input 
                  placeholder="Cache time to live" 
                  value="300"
                  readOnly
                />
              </div>

              <Button variant="outline" className="w-full">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Advanced Config
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
