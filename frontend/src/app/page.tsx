import { Navigation } from '@/components'
import { HeroSection } from '@/components/sections/hero-section'
import { DashboardMetrics } from '@/components/sections/dashboard-metrics'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <DashboardMetrics />
      </main>
      <footer className="border-t bg-muted/20">
        <div className="container px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-muted-foreground">
              © 2025 Omnichain Controller. Powered by LayerZero V2.
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Documentation
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                GitHub
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
