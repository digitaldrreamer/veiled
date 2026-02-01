"use client"

// * Root providers component
// * Wraps WalletProvider and VeiledProvider

import { useMemo, type ReactNode } from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { VeiledProvider } from '@/lib/veiled-provider'
import type { VeiledConfig } from '@veiled/core'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // * Use devnet for demo
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // * Configure wallets
  // * Note: Phantom auto-registers as a Standard Wallet, so we don't need to add it manually
  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
    ],
    []
  )

  // * Veiled configuration
  const veiledConfig: Omit<VeiledConfig, 'wallet'> = {
    chain: 'solana',
    rpcProvider: 'helius',
    rpcUrl: endpoint, // Use public devnet endpoint for demo
    // * For production, use Helius Secure URL or Quicknode endpoint
    // rpcUrl: 'https://your-helius-secure-url.helius-rpc.com',
    // quicknodeEndpoint: 'https://your-quicknode-endpoint.quiknode.pro/...',
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <VeiledProvider config={veiledConfig}>
            {children}
          </VeiledProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
