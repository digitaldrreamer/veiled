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

  // * Quicknode endpoint for devnet (NFT ownership circuit - DAS API)
  // * Safe to hardcode for demo; in production, read from env
  const QUICKNODE_DEVNET_ENDPOINT =
    "https://patient-skilled-arrow.solana-devnet.quiknode.pro/6716eee99a064e95be4c29b6dc3edd130464ee66/"

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
    rpcUrl: endpoint, // Use public devnet endpoint for demo (balance / wallet circuits)
    // * Quicknode endpoint is REQUIRED for the NFT ownership circuit (DAS API)
    quicknodeEndpoint: QUICKNODE_DEVNET_ENDPOINT,
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
