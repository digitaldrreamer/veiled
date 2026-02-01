"use client"

// * Veiled authentication provider
// * Sets up VeiledAuth with Solana wallet adapter integration

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Wallet } from '@coral-xyz/anchor'
import { VeiledAuth, adaptSolanaWallet, openAuthModal, type Session, type WidgetInstance } from '@veiled/core'
import type { VeiledConfig, WidgetConfig } from '@veiled/core'

interface VeiledContextValue {
  veiled: VeiledAuth | null
  session: Session | null
  widget: WidgetInstance | null
  isInitialized: boolean
  config: Omit<VeiledConfig, 'wallet'> | null
  initializeWidget: (config: WidgetConfig) => Promise<void>
  openAuthModal: (config: WidgetConfig) => Promise<WidgetInstance | null>
  signOut: () => Promise<void>
}

const VeiledContext = createContext<VeiledContextValue | null>(null)

export function useVeiled() {
  const context = useContext(VeiledContext)
  if (!context) {
    throw new Error('useVeiled must be used within VeiledProvider')
  }
  return context
}

interface VeiledProviderProps {
  children: ReactNode
  config: Omit<VeiledConfig, 'wallet'>
}

export function VeiledProvider({ children, config }: VeiledProviderProps) {
  const { wallet, publicKey, connected } = useWallet()
  const [veiled, setVeiled] = useState<VeiledAuth | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [widget, setWidget] = useState<WidgetInstance | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const widgetConfigRef = useRef<WidgetConfig | null>(null)
  const [veiledConfig, setVeiledConfig] = useState<Omit<VeiledConfig, 'wallet'> | null>(config)

  // * Create VeiledAuth ONCE - SDK handles wallet auto-detection internally!
  // * No wallet needed - the SDK will auto-detect when signIn() is called
  // * Use client-side only to avoid hydration mismatches
  useEffect(() => {
    // * Only run on client side to avoid hydration issues
    if (typeof window === 'undefined') return

    // * Create VeiledAuth without wallet - SDK abstracts this complexity
    const veiledInstance = new VeiledAuth({
      ...config,
      // * No wallet passed - SDK will auto-detect in signIn()
    })

    // * If wallet is already connected from WalletProvider, use it
    if (wallet?.adapter) {
      veiledInstance.setWalletAdapter(adaptSolanaWallet(wallet.adapter))
      
      // * Set Solana connection for on-chain operations
      if (connected && publicKey) {
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
        veiledInstance.setSolanaConnection(undefined, anchorWallet)
      }
    }

    setVeiled(veiledInstance)
    setIsInitialized(true)

    // * Check for existing session (use current timestamp to avoid hydration issues)
    if (connected && publicKey) {
      const now = Date.now()
      const existingSession = veiledInstance.getSession()
      if (existingSession && existingSession.expiresAt > now) {
        setSession(existingSession)
      } else {
        setSession(null)
      }
    } else {
      setSession(null)
    }
  }, [config, wallet, connected, publicKey]) // * Include dependencies to update when wallet changes

  // * Update wallet adapter when wallet connects/disconnects
  useEffect(() => {
    if (!veiled) return

    if (wallet?.adapter) {
      veiled.setWalletAdapter(adaptSolanaWallet(wallet.adapter))
      
      // * Update Solana connection
      if (connected && publicKey) {
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
        veiled.setSolanaConnection(undefined, anchorWallet)
      }
    }

    // * Update session (use consistent timestamp to avoid hydration issues)
    if (connected && publicKey) {
      const now = Date.now()
      const existingSession = veiled.getSession()
      if (existingSession && existingSession.expiresAt > now) {
        setSession(existingSession)
      } else {
        setSession(null)
      }
    } else {
      setSession(null)
    }
  }, [wallet, connected, publicKey, veiled])

  // * Initialize widget (button mode)
  const initializeWidget = async (widgetConfig: WidgetConfig) => {
    if (!veiled) {
      throw new Error('VeiledAuth not initialized. Connect wallet first.')
    }

    widgetConfigRef.current = widgetConfig

    // * Create widget instance
    const widgetInstance = await veiled.renderButton('#veiled-sign-in-button', {
      ...widgetConfig,
      onSuccess: (newSession) => {
        setSession(newSession)
        widgetConfig.onSuccess?.(newSession)
      },
      onError: (error) => {
        console.error('Veiled sign-in error:', error)
        widgetConfig.onError?.(error)
      },
    })

    setWidget(widgetInstance)
  }

  // * Open auth modal directly
  const openAuthModalHandler = async (widgetConfig: WidgetConfig): Promise<WidgetInstance | null> => {
    console.log('[VeiledProvider] openAuthModalHandler called', { veiled: !!veiled, widget: !!widget, wallet: !!wallet })
    if (!veiled) {
      console.warn('[VeiledProvider] VeiledAuth not initialized - wallet adapter may not be available')
      // * Try to show a helpful error in the UI instead of silently failing
      widgetConfig.onError?.(new Error('Wallet adapter not available. Please ensure a wallet extension is installed.'))
      return null
    }

    // * Destroy existing widget if any
    if (widget) {
      console.log('[VeiledProvider] Destroying existing widget')
      widget.destroy()
    }

    widgetConfigRef.current = widgetConfig

    // * Create modal widget instance
    console.log('[VeiledProvider] Creating modal widget instance')
    const widgetInstance = openAuthModal(veiled, {
      ...widgetConfig,
      onSuccess: (newSession) => {
        console.log('[VeiledProvider] Sign-in successful:', newSession)
        setSession(newSession)
        widgetConfig.onSuccess?.(newSession)
      },
      onError: (error) => {
        console.error('[VeiledProvider] Veiled sign-in error:', error)
        widgetConfig.onError?.(error)
      },
    })

    console.log('[VeiledProvider] Widget instance created:', widgetInstance)
    setWidget(widgetInstance)
    return widgetInstance
  }

  // * Sign out
  const signOut = async () => {
    try {
      console.log('[VeiledProvider] Signing out...')
      
      // * Sign out from VeiledAuth
      if (veiled) {
        await veiled.signOut()
        console.log('[VeiledProvider] VeiledAuth sign out successful')
      }
      
      // * Clear session state
      setSession(null)
      
      // * Destroy widget if it exists
      if (widget) {
        widget.destroy()
        setWidget(null)
        console.log('[VeiledProvider] Widget destroyed')
      }
      
      console.log('[VeiledProvider] Sign out complete')
    } catch (error) {
      console.error('[VeiledProvider] Sign out error:', error)
      // * Still clear state even if signOut fails
      setSession(null)
      if (widget) {
        widget.destroy()
        setWidget(null)
      }
      throw error // Re-throw to let caller handle
    }
  }

  return (
    <VeiledContext.Provider
      value={{
        veiled,
        session,
        widget,
        isInitialized,
        config: veiledConfig,
        initializeWidget,
        openAuthModal: openAuthModalHandler,
        signOut,
      }}
    >
      {children}
    </VeiledContext.Provider>
  )
}
