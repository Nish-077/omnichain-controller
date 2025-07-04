"use client"

import React from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { 
  Moon, 
  Sun, 
  Zap, 
  Settings, 
  Users,
  Image as ImageIcon,
  Activity,
  Menu
} from 'lucide-react'
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const { theme, setTheme } = useTheme()
  const { isConnected: isEthConnected } = useAccount()
  const { connected: isSolConnected } = useWallet()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Activity },
    { href: '/dao', label: 'DAO Governance', icon: Users },
    { href: '/collections', label: 'Collections', icon: ImageIcon },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const NavContent = () => (
    <>
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="relative">
            <Zap className="h-8 w-8 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xl font-bold omnichain-text-gradient">
            Omnichain Controller
          </span>
        </Link>
        
        <Badge variant="outline" className="chain-badge-layerzero">
          LayerZero V2
        </Badge>
      </div>

      <nav className="hidden md:flex items-center space-x-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <div className="flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className={`chain-badge-ethereum ${isEthConnected ? 'bg-green-100 border-green-500 text-green-800' : ''}`}
          >
            Ethereum {isEthConnected && '✓'}
          </Badge>
          <Badge 
            variant="outline" 
            className={`chain-badge-solana ${isSolConnected ? 'bg-green-100 border-green-500 text-green-800' : ''}`}
          >
            Solana {isSolConnected && '✓'}
          </Badge>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )

  return (
    <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}>
      <div className="container flex h-16 items-center justify-between px-4">
        <NavContent />
      </div>
    </header>
  )
}
