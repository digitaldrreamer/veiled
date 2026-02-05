"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useVeiled } from "@/lib/veiled-provider"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import type { Wallet } from "@coral-xyz/anchor"
import { adaptSolanaWallet } from "@veiled/core"
import type { WidgetConfig } from "@veiled/core"
import { Permission } from "@veiled/core"
import { CheckCircle2, XCircle, Lock, Eye, Shield, LogOut, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface UseCase {
  id: string
  title: string
  description: string
  icon: string
  config: WidgetConfig
  expectedResult: {
    exposed: string[]
    hidden: string[]
  }
}

const useCases: UseCase[] = [
  {
    id: "anonymous-auth",
    title: "🎭 Anonymous Authentication",
    description: "Prove you own a wallet without revealing which wallet. Same identity across apps, but unlinkable.",
    icon: "🎭",
    config: {
      requirements: { wallet: true },
      domain: typeof window !== "undefined" ? window.location.hostname : "demo.veiled.sh",
      onSuccess: (session) => {
        console.log("Anonymous auth success:", session)
      },
      onError: (error) => {
        console.error("Anonymous auth error:", error)
      },
    },
    expectedResult: {
      exposed: ["Anonymous ID (nullifier)"],
      hidden: ["Wallet address", "Balance", "NFTs", "Transaction history"],
    },
  },
  {
    id: "nft-gated",
    title: "🎨 NFT-Gated Access",
    description: "Prove you own an NFT from a collection without revealing which specific token or other holdings.",
    icon: "🎨",
    config: {
      requirements: {
        wallet: true,
        nft: { collection: "DeGodsCollectionAddress" }, // * User can edit this in production
      },
      domain: typeof window !== "undefined" ? window.location.hostname : "demo.veiled.sh",
      onSuccess: (session) => {
        console.log("NFT-gated auth success:", session)
      },
      onError: (error) => {
        console.error("NFT-gated auth error:", error)
      },
    },
    expectedResult: {
      exposed: ["Anonymous ID", "Proof of NFT ownership"],
      hidden: ["Wallet address", "Which NFT", "Other NFTs", "Balance"],
    },
  },
  {
    id: "defi-balance",
    title: "💰 DeFi Balance Requirements",
    description: "Prove your balance meets requirements (e.g., ≥10 SOL) without revealing exact amount.",
    icon: "💰",
    config: {
      requirements: {
        wallet: true,
        balance: { minimum: 10_000_000_000 }, // * 10 SOL in lamports
      },
      domain: typeof window !== "undefined" ? window.location.hostname : "demo.veiled.sh",
      onSuccess: (session) => {
        console.log("Balance requirement success:", session)
      },
      onError: (error) => {
        console.error("Balance requirement error:", error)
      },
    },
    expectedResult: {
      exposed: ["Anonymous ID", "Balance range bucket (e.g., 10-100 SOL)"],
      hidden: ["Exact balance", "Wallet address", "Other holdings"],
    },
  },
  {
    id: "dao-voting",
    title: "🗳️ Anonymous DAO Voting",
    description: "Prove eligibility (e.g., ≥1 SOL) without revealing identity. Vote anonymously but verifiably.",
    icon: "🗳️",
    config: {
      requirements: {
        wallet: true,
        balance: { minimum: 1_000_000_000 }, // * 1 SOL in lamports
      },
      domain: typeof window !== "undefined" ? window.location.hostname : "demo.veiled.sh",
      onSuccess: (session) => {
        console.log("DAO voting auth success:", session)
      },
      onError: (error) => {
        console.error("DAO voting auth error:", error)
      },
    },
    expectedResult: {
      exposed: ["Anonymous ID", "Eligibility proof"],
      hidden: ["Wallet address", "Exact balance", "How you voted"],
    },
  },
  {
    id: "gaming",
    title: "🎮 Gaming (Cross-Game Identity)",
    description: "Same player identity across games, but untraceable. Different nullifier per domain.",
    icon: "🎮",
    config: {
      requirements: { wallet: true },
      domain: typeof window !== "undefined" ? window.location.hostname : "demo.veiled.sh",
      onSuccess: (session) => {
        console.log("Gaming auth success:", session)
      },
      onError: (error) => {
        console.error("Gaming auth error:", error)
      },
    },
    expectedResult: {
      exposed: ["Anonymous ID (domain-specific)"],
      hidden: ["Wallet address", "Cross-game linking"],
    },
  },
  {
    id: "permissions",
    title: "🔐 Privacy with Flexibility",
    description: "Request specific permissions (e.g., wallet address) with user warnings. Users can deny while still using the app.",
    icon: "🔐",
    config: {
      requirements: { wallet: true },
      domain: typeof window !== "undefined" ? window.location.hostname : "demo.veiled.sh",
      permissions: {
        permissions: [Permission.RevealWalletAddress],
        reason: "To display your profile",
        duration: 3600, // * 1 hour
      },
      onSuccess: (session) => {
        console.log("Permission request success:", session)
      },
      onError: (error) => {
        console.error("Permission request error:", error)
      },
    },
    expectedResult: {
      exposed: ["Anonymous ID", "Wallet address (if granted)"],
      hidden: ["Balance", "NFTs", "Transaction history"],
    },
  },
]

export default function UseCasesPage() {
  const { session, openAuthModal, signOut, isInitialized, veiled } = useVeiled()
  const { wallet, publicKey, connected, connect } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [activeUseCase, setActiveUseCase] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCompletedUseCase, setLastCompletedUseCase] = useState<string | null>(null)
  const [useCaseErrors, setUseCaseErrors] = useState<Record<string, string | null>>({})

  // * Helper to set up VeiledAuth connection
  const setupVeiledConnection = () => {
    if (!veiled || !wallet?.adapter || !publicKey) return false
    
    veiled.setWalletAdapter(adaptSolanaWallet(wallet.adapter))
    
    const anchorWallet: Wallet = {
      publicKey: publicKey,
      signTransaction: async (tx) => {
        if (!wallet.adapter.signTransaction) {
          throw new Error('Wallet adapter does not support signTransaction')
        }
        return await wallet.adapter.signTransaction(tx)
      },
      signAllTransactions: async (txs) => {
        if (!wallet.adapter.signAllTransactions) {
          throw new Error('Wallet adapter does not support signAllTransactions')
        }
        return await wallet.adapter.signAllTransactions(txs)
      },
    }
    
    veiled.setSolanaConnection(connection, anchorWallet)
    return true
  }

  // * Ensure wallet connection is set up when wallet connects
  useEffect(() => {
    if (connected && wallet?.adapter && publicKey && veiled) {
      setupVeiledConnection()
    }
  }, [connected, wallet, publicKey, veiled, connection])


  const handleTryUseCase = async (useCase: UseCase) => {
    if (!isInitialized) {
      alert("Veiled is not initialized. Please wait a moment.")
      return
    }

    // * For NFT and balance proofs, ensure connection is set if wallet is already connected
    // * The Veiled widget will handle wallet connection if needed
    const requiresWalletConnection = 
      useCase.id === "nft-gated" || 
      useCase.id === "defi-balance" || 
      useCase.id === "dao-voting"

    if (requiresWalletConnection && connected && wallet?.adapter && publicKey && veiled) {
      // * Ensure connection is set up before opening modal
      setupVeiledConnection()
    }

    // * Open Veiled modal - it will handle wallet connection internally if needed
    openModalForUseCase(useCase)
  }

  const openModalForUseCase = async (useCase: UseCase) => {
    setIsLoading(true)
    setActiveUseCase(useCase.id)
    setUseCaseErrors((prev) => ({ ...prev, [useCase.id]: null }))

    try {
      // * Update config with success handler to track completion
      const configWithTracking: WidgetConfig = {
        ...useCase.config,
        onSuccess: (newSession) => {
          setLastCompletedUseCase(useCase.id)
          setActiveUseCase(null)
          setIsLoading(false)
          setUseCaseErrors((prev) => ({ ...prev, [useCase.id]: null }))
          useCase.config.onSuccess?.(newSession)
        },
        onError: (error) => {
          setActiveUseCase(null)
          setIsLoading(false)

          const raw = error instanceof Error ? error.message : String(error)
          let friendly = raw

          if (raw.startsWith("Insufficient balance:")) {
            friendly =
              "Your devnet wallet balance is below the minimum required for this use case. " +
              "Either fund your wallet with more SOL on devnet or lower the configured minimum in this demo."
          } else if (raw.startsWith("No NFTs found in collection")) {
            friendly =
              "We couldn't find an NFT from the configured collection in your wallet. " +
              "Double‑check that the collection address in this demo matches the one you actually minted from, " +
              "or mint an NFT for that collection on devnet and try again."
          } else if (raw.includes("Failed to deserialize circuit")) {
            friendly =
              "The proof circuit for this use case is out of sync with the browser runtime. " +
              "Try a hard refresh (Cmd/Ctrl+Shift+R). If it still fails after that, the circuit artifacts need to be rebuilt and redeployed."
          }

          setUseCaseErrors((prev) => ({ ...prev, [useCase.id]: friendly }))
          useCase.config.onError?.(error)
        },
      }

      await openAuthModal(configWithTracking)
    } catch (error) {
      console.error("Failed to open auth modal:", error)
      alert(`Failed to open auth modal: ${error instanceof Error ? error.message : "Unknown error"}`)
      setActiveUseCase(null)
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setActiveUseCase(null)
      setLastCompletedUseCase(null)
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat Demo
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Veiled Use Cases Demo</h1>
          <p className="text-white/60 text-base md:text-lg">
            Explore all authentication scenarios supported by Veiled. Each use case demonstrates privacy-preserving authentication with different requirements.
          </p>
        </div>

        {/* Session Status */}
        {session && (
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-white">Active Session</CardTitle>
                <Button onClick={handleSignOut} variant="outline" size="sm" className="border-zinc-700 text-white hover:bg-zinc-800">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-white/60 mb-2">Anonymous ID (Nullifier):</p>
                <code className="text-sm bg-zinc-800 px-3 py-2 rounded block text-green-400 break-all">
                  {session.nullifier}
                </code>
              </div>
              {session.permissions.length > 0 && (
                <div>
                  <p className="text-sm text-white/60 mb-2">Granted Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {session.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="bg-yellow-900/30 text-yellow-300 border-yellow-800">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {session.balanceRangeBucket !== undefined && (
                <div>
                  <p className="text-sm text-white/60 mb-2">Balance Range Bucket:</p>
                  <Badge variant="secondary" className="bg-blue-900/30 text-blue-300 border-blue-800">
                    Bucket {session.balanceRangeBucket} (e.g., 10-100 SOL)
                  </Badge>
                </div>
              )}
              {session.txSignature && (
                <div>
                  <p className="text-sm text-white/60 mb-2">Transaction Signature:</p>
                  <code className="text-xs bg-zinc-800 px-3 py-2 rounded block text-blue-400 break-all">
                    {session.txSignature}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase) => {
            const isActive = activeUseCase === useCase.id
            const isCompleted = lastCompletedUseCase === useCase.id && session
            const error = useCaseErrors[useCase.id]

            return (
              <Card
                key={useCase.id}
                className={`bg-zinc-900 border-zinc-800 transition-all ${
                  isActive ? "ring-2 ring-purple-500" : ""
                } ${isCompleted ? "ring-2 ring-green-500" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="text-2xl">{useCase.icon}</span>
                    <span className="text-lg">{useCase.title.replace(/^[^\s]+\s/, "")}</span>
                  </CardTitle>
                  <CardDescription className="text-white/60 text-sm">
                    {useCase.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Expected Results */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                        <Eye className="h-3 w-3" />
                        What's Exposed:
                      </p>
                      <ul className="text-xs text-white/80 space-y-1">
                        {useCase.expectedResult.exposed.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        What's Hidden:
                      </p>
                      <ul className="text-xs text-white/80 space-y-1">
                        {useCase.expectedResult.hidden.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleTryUseCase(useCase)}
                    disabled={isLoading || !isInitialized}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    variant={isCompleted ? "outline" : "default"}
                  >
                    {isLoading && isActive
                      ? "Loading..."
                      : isCompleted
                        ? "✓ Completed - Try Again"
                        : "Try This Use Case"}
                  </Button>

                  {/* Error Indicator */}
                  {error && (
                    <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      <div className="font-semibold mb-1">Why it failed</div>
                      <div>{error}</div>
                    </div>
                  )}

                  {/* Success Indicator */}
                  {isCompleted && session && (
                    <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded-lg">
                      <p className="text-xs text-green-400 flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        Authenticated! Check session status above.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ul className="space-y-2 text-white/80 text-sm">
            <li>• Click "Try This Use Case" to open the Veiled authentication widget</li>
            <li>• Connect your wallet and complete the authentication flow</li>
            <li>• See what data is exposed vs. hidden for each scenario</li>
            <li>• Your wallet address is never revealed unless you grant permission</li>
            <li>• Each domain gets a unique nullifier (can't be tracked across sites)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
