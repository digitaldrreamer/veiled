"use client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Link, Folder, Mic, LogOut, Send } from "lucide-react"
import { LiquidMetal, PulsingBorder } from "@paper-design/shaders-react"
import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton, useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useVeiled } from "@/lib/veiled-provider"
import type { WidgetConfig } from "@veiled/core"
import { Connection } from "@solana/web3.js"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ExposedData {
  balance: number | null
  nfts: any[]
  transactions: any[]
  netWorth: number | null
}

export function ChatInterface() {
  const [isFocused, setIsFocused] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [signInMethod, setSignInMethod] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("solana-default")
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const hasSetModelForTraditionalAuth = useRef(false)
  const [usingTraditionalAuth, setUsingTraditionalAuth] = useState(false)
  const [exposedData, setExposedData] = useState<ExposedData>({
    balance: null,
    nfts: [],
    transactions: [],
    netWorth: null,
  })
  const [isLoadingData, setIsLoadingData] = useState(false)
  const { publicKey, connected, disconnect, connect } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const { session, isInitialized, openAuthModal, signOut, config: veiledConfig } = useVeiled()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasShownInitialPrompt = useRef(false)

  // * Handle traditional Solana auth (exposes all data)
  const handleTraditionalSolanaAuth = async () => {
    // * Set this FIRST to prevent auto-connect Veiled modal
    setUsingTraditionalAuth(true)
    // * Reset flag so model gets set when wallet connects
    hasSetModelForTraditionalAuth.current = false
    
    // * If wallet is already connected, set model immediately
    if (connected) {
      setSelectedModel("solana-default")
      hasSetModelForTraditionalAuth.current = true
      return
    }
    
    // * Automatically open the wallet modal
    setTimeout(() => {
      setVisible(true)
    }, 100)
  }

  // * Fetch exposed data when using traditional auth
  useEffect(() => {
    if (usingTraditionalAuth && connected && publicKey && connection) {
      // * Set model to Solana when traditional auth completes (only once)
      if (!hasSetModelForTraditionalAuth.current) {
        setSelectedModel("solana-default")
        hasSetModelForTraditionalAuth.current = true
      }
      fetchExposedData()
    } else if (!connected) {
      // * Reset exposed data when disconnected
      setExposedData({
        balance: null,
        nfts: [],
        transactions: [],
        netWorth: null,
      })
      // * Reset flag when disconnected
      hasSetModelForTraditionalAuth.current = false
    }
  }, [usingTraditionalAuth, connected, publicKey, connection])

  const fetchExposedData = async () => {
    if (!publicKey || !connection) return
    
    setIsLoadingData(true)
    try {
      // * 1. Get balance (EXPOSED)
      const lamports = await connection.getBalance(publicKey)
      const balance = lamports / 1e9

      // * 2. Get transaction history (EXPOSED)
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 })
      const transactions = signatures.map(sig => ({
        signature: sig.signature,
        blockTime: sig.blockTime,
        err: sig.err,
      }))

      // * 3. Get NFTs (EXPOSED) - using the same RPC URL/provider as Veiled SDK
      let nfts: any[] = []
      try {
        // * Use Veiled config to determine RPC provider and URL
        if (veiledConfig) {
          const rpcUrl = veiledConfig.rpcUrl || veiledConfig.quicknodeEndpoint
          const rpcProvider = veiledConfig.rpcProvider
          
          // * Check if it's Helius
          if (rpcProvider === 'helius' || (rpcUrl && (rpcUrl.includes('helius') || rpcUrl.includes('helius-rpc')))) {
            // * For Helius Secure URLs (no API key needed), we can't fetch NFTs via API
            // * For Helius with API key, use the API key
            if (veiledConfig.heliusApiKey) {
              // * Use Helius NFT API with API key
              const nftData = await fetch(
                `https://api.helius.xyz/v0/addresses/${publicKey.toString()}/nfts?api-key=${veiledConfig.heliusApiKey}`
              )
              if (nftData.ok) {
                const nftResponse = await nftData.json()
                nfts = nftResponse || []
              }
            } else if (rpcUrl) {
              // * Try to extract API key from Secure URL or query params
              try {
                const urlObj = new URL(rpcUrl)
                const apiKeyParam = urlObj.searchParams.get('api-key')
                if (apiKeyParam) {
                  const nftData = await fetch(
                    `https://api.helius.xyz/v0/addresses/${publicKey.toString()}/nfts?api-key=${apiKeyParam}`
                  )
                  if (nftData.ok) {
                    const nftResponse = await nftData.json()
                    nfts = nftResponse || []
                  }
                }
              } catch (urlError) {
                // * If URL parsing fails, try extracting from URL pattern
                const urlMatch = rpcUrl.match(/api-key=([^&]+)/)
                if (urlMatch) {
                  const nftData = await fetch(
                    `https://api.helius.xyz/v0/addresses/${publicKey.toString()}/nfts?api-key=${urlMatch[1]}`
                  )
                  if (nftData.ok) {
                    const nftResponse = await nftData.json()
                    nfts = nftResponse || []
                  }
                }
              }
            }
          } 
          // * Check if it's QuickNode
          else if (rpcProvider === 'quicknode' || (rpcUrl && (rpcUrl.includes('quicknode') || rpcUrl.includes('quiknode')))) {
            // * Use QuickNode RPC methods for NFT fetching
            try {
              // * Get all token accounts (including NFTs)
              const { PublicKey } = await import('@solana/web3.js')
              const tokenProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
              
              const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: tokenProgramId
              })
              
              // * Filter for NFT-like accounts (decimals === 0 and supply === 1)
              // * For a more complete NFT fetch, you'd use QuickNode's NFT API
              nfts = tokenAccounts.value
                .filter(account => {
                  const info = account.account.data.parsed.info
                  return info.tokenAmount.decimals === 0 && info.tokenAmount.amount === '1'
                })
                .map(account => ({
                  mint: account.account.data.parsed.info.mint,
                  amount: account.account.data.parsed.info.tokenAmount.amount,
                }))
            } catch (error) {
              console.error('Error fetching NFTs via QuickNode RPC:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching NFTs:', error)
      }

      // * 4. Calculate net worth (EXPOSED)
      // * In production, you'd query all token accounts, DeFi positions, etc.
      const netWorth = balance * 150 // * Placeholder calculation (SOL price)

      setExposedData({
        balance,
        nfts,
        transactions,
        netWorth,
      })
      
      // * Pre-fill initial prompt after data is fetched
      setTimeout(() => showInitialPrompt(), 500)
    } catch (error) {
      console.error('Error fetching exposed data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // * Handle connect wallet - Veiled widget handles wallet connection internally
  const handleConnectWallet = () => {
    console.log('[ChatInterface] handleConnectWallet called', { isInitialized, connected, publicKey })
    
    // * Just open the Veiled modal - it handles wallet connection internally
      const widgetConfig: WidgetConfig = {
        requirements: { wallet: true },
        onSuccess: (newSession) => {
          console.log('Veiled sign-in successful:', newSession)
          // * Set model to Veiled when Veiled auth completes
          setSelectedModel("veiled-novel")
          // * Pre-fill initial prompt after auth completes
          setTimeout(() => showInitialPrompt(), 500)
        },
        onError: (error) => {
          console.error('Veiled sign-in error:', error)
        // * Show user-friendly error message
        alert(`Sign-in failed: ${error.message || 'Unknown error'}`)
        },
      }

      openAuthModal(widgetConfig)
        .then((widget) => {
        console.log('[ChatInterface] Veiled modal opened:', widget)
        if (!widget) {
          console.warn('[ChatInterface] Widget is null - VeiledAuth may not be initialized')
          alert('Please ensure a wallet extension (Phantom, Solflare) is installed and try again.')
        }
        })
        .catch((error) => {
        console.error('[ChatInterface] Failed to open auth modal:', error)
        alert(`Failed to open sign-in modal: ${error.message || 'Unknown error'}`)
      })
  }

  const handleSignOut = async () => {
    try {
      console.log('[ChatInterface] Signing out...')
      
      if (session) {
        // * Sign out from Veiled
        await signOut()
        console.log('[ChatInterface] Veiled sign out successful')
      }
      
      if (usingTraditionalAuth) {
        // * Sign out from traditional auth
        setUsingTraditionalAuth(false)
        setExposedData({
          balance: null,
          nfts: [],
          transactions: [],
          netWorth: null,
        })
      }
      
      // * Disconnect wallet if connected
      if (connected) {
        await disconnect()
        console.log('[ChatInterface] Wallet disconnected')
      }
      
      // * Clear messages on sign out
      setMessages([])
      // * Reset initial prompt flag so it shows again on next auth
      hasShownInitialPrompt.current = false
    } catch (error) {
      console.error('[ChatInterface] Sign out error:', error)
      alert(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // * Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // * Handle Enter key press (Shift+Enter for new line, Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // * Generate comprehensive response for Solana (traditional) auth
  const generateSolanaAuthResponse = (): string => {
    const walletAddress = publicKey?.toString() || 'Unknown'
    const balance = exposedData.balance !== null ? `${exposedData.balance.toFixed(4)} SOL` : 'Loading...'
    const nftCount = exposedData.nfts?.length || 0
    const transactionCount = exposedData.transactions?.length || 0
    const netWorth = exposedData.netWorth !== null ? `$${exposedData.netWorth.toFixed(2)}` : 'Calculating...'

    return `I have **full access** to your Solana wallet and can see everything about your account. Here's what I can access:

**🔴 EXPOSED DATA:**

**1. Wallet Address (Public Key)**
- Your complete wallet address: \`${walletAddress}\`
- This is permanently linked to your identity and all your on-chain activity

**2. Balance & Assets**
- Current SOL balance: ${balance}
- Estimated net worth: ${netWorth}
- All token holdings (SPL tokens, wrapped SOL, etc.)
- All NFT collections (${nftCount} NFTs detected)

**3. Complete Transaction History**
- ${transactionCount} recent transactions visible
- All transaction signatures and details
- All interactions with dApps, DeFi protocols, and smart contracts
- All token transfers, swaps, and staking activities

**4. On-Chain Activity Patterns**
- Your spending habits and transaction frequency
- Your DeFi portfolio composition
- Your NFT collection value and rarity
- Your interaction patterns with different protocols

**⚠️ DANGEROUS SCENARIOS:**

**1. Privacy Violations**
- Your wallet address can be linked to your real-world identity through:
  - Centralized exchange KYC data
  - NFT marketplace accounts
  - Social media wallet connections
  - On-chain analysis tools (Solscan, Dune Analytics, etc.)

**2. Targeted Attacks**
- Phishing attacks tailored to your holdings
- Social engineering based on your transaction history
- Rug pull targeting based on your DeFi positions
- Wallet draining attempts if you interact with malicious contracts

**3. Financial Surveillance**
- Complete wealth tracking and portfolio analysis
- Tax reporting implications (all transactions are public)
- Credit scoring based on on-chain activity
- Insurance discrimination based on DeFi usage

**4. Censorship & Deplatforming**
- Services can blacklist your wallet address
- DeFi protocols can freeze or restrict your access
- NFT marketplaces can ban your account
- Centralized exchanges can flag your address

**5. Smart Contract Exploits**
- Attackers can analyze your transaction patterns
- Front-running your transactions
- MEV (Maximal Extractable Value) extraction
- Sandwich attacks on your swaps

**6. Regulatory Risks**
- Government agencies can track all your transactions
- Compliance requirements for every transaction
- Potential asset freezing or seizure
- Legal implications of DeFi interactions

**7. Social & Reputation Risks**
- Your entire financial history is public
- Embarrassing or controversial transactions are permanent
- Association with certain protocols or addresses
- Public scrutiny of your investment decisions

**🔐 SECURITY IMPLICATIONS:**

All of this data is:
- **Permanent**: Immutably stored on the blockchain forever
- **Public**: Anyone can view it with your wallet address
- **Linkable**: Can be connected to your real identity
- **Unchangeable**: Cannot be deleted or modified

This is the fundamental privacy trade-off of traditional Web3 authentication - you gain decentralization but lose financial privacy.`
  }

  // * Generate comprehensive response for Veiled auth
  const generateVeiledAuthResponse = (): string => {
    const nullifier = session?.nullifier || 'Unknown'
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'this domain'

    return `I can only see your **Veiled nullifier** for ${domain}: \`${nullifier.substring(0, 16)}...\`

**🔒 PRIVACY PROTECTION:**

**What I CAN See:**
- Your domain-specific nullifier (a privacy-preserving identifier)
- Proof that you own a Solana wallet (without revealing which one)
- Proof that you've authenticated to this specific domain

**What I CANNOT See:**
- Your actual wallet address
- Your wallet balance or assets
- Your transaction history
- Your NFT collections
- Your DeFi positions
- Any on-chain activity or patterns
- Your real-world identity

**🛡️ HOW VEILED WORKS:**

**1. Zero-Knowledge Proofs (ZKPs)**
- You generate a cryptographic proof that you own a wallet
- The proof is verified on-chain without revealing your wallet address
- Only a domain-specific nullifier is stored (not your wallet)

**2. Client-Side Processing**
- All proof generation happens in your browser
- Your private key never leaves your wallet
- No server-side processing of sensitive data
- Complete user control over authentication

**3. Decentralized Smart Contract**
- Authentication is verified by an on-chain Solana program
- The contract is open-source and auditable
- No single entity controls the authentication system
- Community can verify and fork the contract

**4. Domain-Specific Nullifiers**
- Each domain gets a unique nullifier for your wallet
- You can't be tracked across different websites
- Your identity is isolated per domain
- Complete privacy between different services

**🌐 DECENTRALIZATION & INDEPENDENCE:**

**Smart Contract Architecture:**
- The Veiled authentication contract runs on Solana
- It's completely decentralized and permissionless
- No central server or authority required
- Anyone can interact with it directly

**Community Ownership:**
- If Veiled (the company) closes down, the contract continues running
- The authentication system is independent of any single entity
- Community can fork the repository and deploy new frontends
- The protocol is truly Web3 - owned by the community, not a corporation

**Open Source & Auditable:**
- All code is open source and verifiable
- Smart contract logic is transparent
- Zero-knowledge circuits are publicly auditable
- No hidden backdoors or centralized control

**🔐 SECURITY BENEFITS:**

**1. Privacy by Design**
- Your wallet address is never exposed
- No on-chain linking between domains
- Complete financial privacy
- Protection from surveillance and tracking

**2. Reduced Attack Surface**
- Attackers can't target your wallet address
- No transaction history to analyze
- No wealth information to exploit
- Protection from targeted phishing

**3. Regulatory Compliance**
- No permanent on-chain identity linking
- Reduced KYC/AML requirements
- Privacy-preserving authentication
- GDPR and privacy law compliant

**4. Censorship Resistance**
- Can't be blacklisted by wallet address
- No centralized entity can block you
- True Web3 decentralization
- Community-governed protocol

**This is the future of Web3 authentication - privacy-preserving, decentralized, and community-owned.**`
  }

  // * Simulate streaming response
  const simulateStreamingResponse = async (fullText: string, onChunk: (chunk: string) => void, onComplete: () => void) => {
    const words = fullText.split(' ')
    let currentText = ''
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i]
      onChunk(currentText)
      
      // * Variable delay for more natural streaming
      const delay = words[i].length > 10 ? 80 : 40
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    onComplete()
  }

  // * Pre-fill textarea with initial prompt after authentication completes
  const showInitialPrompt = () => {
    // * Only show once
    if (hasShownInitialPrompt.current) return
    hasShownInitialPrompt.current = true
    
    // * Pre-fill the textarea with the prompt
    setMessageText("What can you access from my authenticated account?")
    
    // * Focus the textarea so user can immediately press Enter
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }
  
  // * Handle the initial prompt when user sends it
  const handleInitialPromptResponse = async (isVeiled: boolean) => {
    setIsSending(true)
    
    // * Generate and stream the response
    const responseText = isVeiled 
      ? generateVeiledAuthResponse() 
      : generateSolanaAuthResponse()
    
    let assistantMessageId = `msg-assistant-${Date.now()}`
    
    simulateStreamingResponse(
      responseText,
      (chunk) => {
        setMessages((prev) => {
          const existing = prev.find(m => m.id === assistantMessageId)
          if (existing) {
            return prev.map(m => 
              m.id === assistantMessageId 
                ? { ...m, content: chunk }
                : m
            )
          } else {
            return [...prev, {
              id: assistantMessageId,
              content: chunk,
              role: 'assistant' as const,
              timestamp: new Date(),
            }]
          }
        })
      },
      () => {
        setIsSending(false)
      }
    )
  }

  // * Handle sending a message
  const handleSendMessage = async () => {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage || isSending) return

    // * Create user message
    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content: trimmedMessage,
      role: 'user',
      timestamp: new Date(),
    }

    // * Add user message immediately
    setMessages((prev) => [...prev, userMessage])
    setMessageText('')
    setIsSending(true)

    // * Check if this is the initial prompt
    const isInitialPrompt = trimmedMessage.toLowerCase() === "what can you access from my authenticated account?"
    
    if (isInitialPrompt) {
      // * Handle the initial prompt with comprehensive response
      const isVeiled = !!session
      handleInitialPromptResponse(isVeiled)
    } else {
      // * Return "I'm not actually an AI..." for all subsequent messages
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-${Math.random()}`,
          content: "I'm not actually an AI. I'm a demonstration of what data can be accessed from your authenticated account. This chat interface is for educational purposes to show the difference between traditional Web3 authentication (which exposes all your data) and Veiled authentication (which preserves your privacy).",
          role: 'assistant',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setIsSending(false)
      }, 1000)
    }
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden relative">
      {/* Auth Overlay - Shows when not logged in */}
      {!session && !usingTraditionalAuth && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#040404] border border-zinc-800 rounded-2xl p-8 max-w-md w-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Veiled Chat</h2>
              <p className="text-white/60 text-sm">Choose your authentication method</p>
            </div>
            
            <div className="space-y-3">
            <Button
              onClick={handleConnectWallet}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-12 text-base"
            >
              Sign in with Veiled
            </Button>
              <Button
                onClick={handleTraditionalSolanaAuth}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-12 text-base"
              >
                Sign in with Solana
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-xs text-white/40 text-center">
                Veiled protects your privacy. Solana shows your wallet data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Auth - Top Right */}
      <div className="w-full px-4 pt-4 pb-2 flex justify-end relative z-50">
        {!session && !usingTraditionalAuth && (
          <Select
            value={signInMethod}
            onValueChange={(value) => {
              setSignInMethod("") // * Reset to show placeholder
              if (value === "veiled") {
                handleConnectWallet()
              } else if (value === "solana") {
                handleTraditionalSolanaAuth()
              }
            }}
          >
            <SelectTrigger className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 w-auto min-w-[180px]">
              <SelectValue placeholder="Sign in..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="veiled" className="text-white hover:bg-zinc-700 cursor-pointer">
                Sign in with Veiled
              </SelectItem>
              <SelectItem value="solana" className="text-white hover:bg-zinc-700 cursor-pointer">
                Sign in with Solana
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {usingTraditionalAuth && !connected && (
          <div className="flex items-center gap-3">
            <div className="wallet-adapter-button-trigger">
              <WalletMultiButton />
            </div>
          </div>
        )}
        {(session || (usingTraditionalAuth && connected)) && (
          <div className="flex items-center gap-3 text-sm pointer-events-auto">
            {session ? (
              <div className="flex flex-col items-end gap-1 text-white/60">
                <span>Anonymous ID: {session.nullifier.substring(0, 16)}...</span>
                {publicKey && (
                  <span className="text-xs text-white/40">
                    {publicKey.toString().substring(0, 4)}...{publicKey.toString().substring(publicKey.toString().length - 4)}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1 text-white/60">
                <span className="text-red-400">🔴 Exposed: {publicKey?.toString().substring(0, 8)}...{publicKey?.toString().substring(publicKey.toString().length - 8)}</span>
                {exposedData.balance !== null && (
                  <span className="text-xs text-red-300">
                    Balance: {exposedData.balance.toFixed(4)} SOL
                  </span>
                )}
              </div>
            )}
            <Button
              type="button"
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
              className="h-8 text-white/80 hover:text-white hover:bg-white/10 pointer-events-auto cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>
            </div>
          )}
      </div>

      {/* Exposed Data Warning - Traditional Auth */}
      {usingTraditionalAuth && connected && (
        <div className="w-full px-4 pb-4">
          <div className="w-full max-w-4xl mx-auto bg-red-950/50 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-400 text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-red-300 font-semibold mb-2">This website can now see:</h3>
                {isLoadingData ? (
                  <div className="text-white/60 text-sm">Loading your data...</div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80">Your Wallet:</span>
                      <code className="text-red-300 bg-red-950/50 px-2 py-1 rounded text-xs">
                        {publicKey?.toString()}
                      </code>
                    </div>
                    {exposedData.balance !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/80">Your Balance:</span>
                        <code className="text-red-300 bg-red-950/50 px-2 py-1 rounded text-xs">
                          {exposedData.balance.toFixed(4)} SOL (${exposedData.netWorth?.toFixed(2) || '0.00'})
                        </code>
                      </div>
                    )}
                    {exposedData.transactions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-white/80">Recent Transactions:</span>
                        <code className="text-red-300 bg-red-950/50 px-2 py-1 rounded text-xs">
                          {exposedData.transactions.length} visible
                        </code>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-red-800">
                      <div className="text-red-300 font-semibold">
                        Privacy Score: <span className="text-red-400">0/10</span> ❌
                      </div>
                      <div className="text-white/60 text-xs mt-1">
                        This website can track you across the internet using your wallet address
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container - Scrollable */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="w-full max-w-4xl mx-auto">
            {/* Messages List */}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-800 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.content}</p>
                  </div>
                </motion.div>
              ))}
              
              {/* Loading indicator when sending */}
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-white/60 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-white/60 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-white/60 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
        </div>
      </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input Container - Centered when no messages, Fixed to Bottom when messages exist */}
      <div className={`w-full px-4 ${messages.length === 0 ? 'flex-1 flex flex-col items-center justify-center' : 'pb-4'}`}>
        <div className="w-full max-w-4xl mx-auto relative overflow-hidden">
          {messages.length === 0 && (
        <div className="flex flex-row items-center mb-2">
          {/* Shader Circle */}
          <motion.div
            id="circle-ball"
            className="relative flex items-center justify-center z-10"
            animate={{
              y: isFocused ? 50 : 0,
              opacity: isFocused ? 0 : 100,
              filter: isFocused ? "blur(4px)" : "blur(0px)",
              rotation: isFocused ? 180 : 0,
            }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            <div className="z-10 absolute bg-white/5 h-11 w-11 rounded-full backdrop-blur-[3px]">
              <div className="h-[2px] w-[2px] bg-white rounded-full absolute top-4 left-4  blur-[1px]" />
              <div className="h-[2px] w-[2px] bg-white rounded-full absolute top-3 left-7  blur-[0.8px]" />
              <div className="h-[2px] w-[2px] bg-white rounded-full absolute top-8 left-2  blur-[1px]" />
              <div className="h-[2px] w-[2px] bg-white rounded-full absolute top-5 left-9 blur-[0.8px]" />
              <div className="h-[2px] w-[2px] bg-white rounded-full absolute top-7 left-7  blur-[1px]" />
            </div>
            <LiquidMetal
              style={{ height: 80, width: 80, filter: "blur(14px)", position: "absolute" }}
              colorBack="hsl(0, 0%, 0%, 0)"
                  colorTint={selectedModel === "veiled-novel" ? "hsl(280, 77%, 49%)" : "hsl(29, 77%, 49%)"}
              repetition={4}
              softness={0.5}
              shiftRed={0.3}
              shiftBlue={0.3}
              distortion={0.1}
              contour={1}
              shape="circle"
              offsetX={0}
              offsetY={0}
              scale={0.58}
              rotation={50}
              speed={5}
            />
            <LiquidMetal
              style={{ height: 80, width: 80 }}
              colorBack="hsl(0, 0%, 0%, 0)"
                  colorTint={selectedModel === "veiled-novel" ? "hsl(280, 77%, 49%)" : "hsl(29, 77%, 49%)"}
              repetition={4}
              softness={0.5}
              shiftRed={0.3}
              shiftBlue={0.3}
              distortion={0.1}
              contour={1}
              shape="circle"
              offsetX={0}
              offsetY={0}
              scale={0.58}
              rotation={50}
              speed={5}
            />
          </motion.div>

          {/* Greeting Text */}
          <motion.p
            className="text-white/40 text-sm font-light z-10"
            animate={{
              y: isFocused ? 50 : 0,
              opacity: isFocused ? 0 : 100,
              filter: isFocused ? "blur(4px)" : "blur(0px)",
            }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            Hey there! I'm here to help with anything you need
          </motion.p>
        </div>
          )}

        <div className="relative">
          <motion.div
            className="absolute w-full h-full z-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: isFocused ? 1 : 0 }}
            transition={{
              duration: 0.8, 
            }}
          >
            <PulsingBorder
              style={{ height: "146.5%", minWidth: "143%" }}
              colorBack="hsl(0, 0%, 0%)"
              roundness={0.18}
              thickness={0}
              softness={0}
              intensity={0.3}
              bloom={2}
              spots={2}
              spotSize={0.25}
              pulse={1}
              smoke={0.35}
              smokeSize={0.4}
              scale={0.7}
              rotation={0}
              offsetX={0}
              offsetY={0}
              speed={1}
              colors={
                selectedModel === "solana-default"
                  ? [
                      // * Flame colored (fiery red/orange) for Solana (Default)
                      "hsl(0, 100%, 50%)",
                      "hsl(10, 100%, 60%)",
                      "hsl(20, 100%, 55%)",
                      "hsl(0, 90%, 45%)",
                      "hsl(15, 100%, 40%)",
                    ]
                  : [
                      // * Purple flame colored for Veiled (Novel)
                      "hsl(280, 100%, 60%)",
                      "hsl(270, 100%, 70%)",
                      "hsl(290, 100%, 65%)",
                      "hsl(275, 90%, 55%)",
                      "hsl(285, 100%, 50%)",
                    ]
              }
            />
          </motion.div>

          <motion.div
            className="relative bg-[#040404] rounded-2xl p-4 z-10"
            animate={{
              borderColor: isFocused ? "#BA9465" : "#3D3D3D",
            }}
            transition={{
              duration: 0.6,
              delay: 0.1,
            }}
            style={{
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {/* Message Input */}
            <div className="relative mb-6">
              <Textarea
                ref={textareaRef}
                placeholder=""
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] resize-none bg-transparent border-none text-white text-base placeholder:text-zinc-500 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isSending}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Left side icons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white p-0"
                >
                  <Brain className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-0"
                >
                  <Link className="h-4 w-4" />
                </Button>
                {/* Center model selector */}
                <div className="flex items-center">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-zinc-900 border-[#3D3D3D] text-white hover:bg-zinc-700 text-xs rounded-full px-2 h-8 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">⚡</span>
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-[#3D3D3D] rounded-xl z-30">
                      <SelectItem value="veiled-novel" className="text-white hover:bg-zinc-700 rounded-lg">
                        Veiled (Novel)
                      </SelectItem>
                      <SelectItem value="solana-default" className="text-white hover:bg-zinc-700 rounded-lg">
                        Solana (Default)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right side icons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-0"
                >
                  <Folder className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  className={`h-10 w-10 rounded-full p-0 transition-all ${
                    messageText.trim() && !isSending
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-orange-200 hover:bg-orange-300 text-orange-800"
                  } ${isSending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {messageText.trim() ? (
                    <motion.div
                      animate={{ scale: isSending ? [1, 1.2, 1] : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Send className="h-5 w-5" />
                    </motion.div>
                  ) : (
                  <Mic className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
        </div>
      </div>
    </div>
  )
}
