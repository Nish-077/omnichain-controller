import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Web3Provider } from "@/providers/web3-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omnichain Controller | Cross-Chain cNFT Management",
  description: "Enterprise-grade cross-chain governance for massive-scale cNFT collections. Control 1M+ Solana cNFTs from Ethereum DAOs via LayerZero.",
  keywords: [
    "omnichain",
    "cross-chain",
    "cNFT",
    "LayerZero",
    "Solana",
    "Ethereum",
    "DAO",
    "governance",
    "state compression",
    "NFT",
    "Web3"
  ],
  authors: [{ name: "Omnichain Controller Team" }],
  creator: "Omnichain Controller",
  publisher: "Omnichain Controller",
  robots: "index, follow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>
            <div className="relative flex min-h-screen flex-col bg-background">
              {children}
            </div>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
