'use client'

import { useReducer, useEffect, useState } from 'react'
import '@/styles/electric-border.css'

type AuthState = 
  | 'IDLE'
  | 'WALLET_CONNECT'
  | 'REQUIREMENTS_CHECK'
  | 'WALLET_PROOF'
  | 'PROOF_GENERATION'
  | 'VERIFICATION_RESULT'
  | 'ON_CHAIN_SUBMISSION'
  | 'PERMISSIONS_REQUEST'
  | 'GRANT_PERMISSIONS'
  | 'SUCCESS'
  | 'ERROR'

interface WidgetState {
  currentState: AuthState
  walletSelected: 'Phantom' | 'Backpack' | 'Solflare' | null
  balance: number | null
  proofGenerated: boolean
  proofProgress: number
  verificationSigned: boolean
  transactionSubmitted: boolean
  permissionsGranted: string[]
  errorMessage: string | null
  previousState: AuthState | null
  session: {
    id: string
    timestamp: string
    privacy_score: number
  } | null
}

type Action = 
  | { type: 'OPEN_MODAL' }
  | { type: 'SELECT_WALLET'; wallet: 'Phantom' | 'Backpack' | 'Solflare' }
  | { type: 'ADVANCE_STAGE' }
  | { type: 'SET_BALANCE'; balance: number }
  | { type: 'UPDATE_PROOF_PROGRESS'; progress: number }
  | { type: 'TOGGLE_PERMISSION'; permission: string }
  | { type: 'SUCCESS'; session: WidgetState['session'] }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' }
  | { type: 'CLOSE_MODAL' }

const initialState: WidgetState = {
  currentState: 'IDLE',
  walletSelected: null,
  balance: null,
  proofGenerated: false,
  proofProgress: 0,
  verificationSigned: false,
  transactionSubmitted: false,
  permissionsGranted: [],
  errorMessage: null,
  previousState: null,
  session: null,
}

const reducer = (state: WidgetState, action: Action): WidgetState => {
  switch (action.type) {
    case 'OPEN_MODAL':
      return { ...state, currentState: 'WALLET_CONNECT' }

    case 'SELECT_WALLET':
      return { 
        ...state, 
        walletSelected: action.wallet,
        currentState: 'REQUIREMENTS_CHECK'
      }

    case 'ADVANCE_STAGE': {
      const stageSequence: AuthState[] = [
        'WALLET_CONNECT',
        'REQUIREMENTS_CHECK',
        'WALLET_PROOF',
        'PROOF_GENERATION',
        'VERIFICATION_RESULT',
        'ON_CHAIN_SUBMISSION',
        'PERMISSIONS_REQUEST',
        'GRANT_PERMISSIONS',
        'SUCCESS',
      ]
      const currentIndex = stageSequence.indexOf(state.currentState)
      const nextIndex = currentIndex + 1
      const nextState = stageSequence[nextIndex] || 'SUCCESS'
      return { ...state, currentState: nextState }
    }

    case 'SET_BALANCE':
      return { ...state, balance: action.balance }

    case 'UPDATE_PROOF_PROGRESS':
      return { ...state, proofProgress: action.progress }

    case 'TOGGLE_PERMISSION':
      return {
        ...state,
        permissionsGranted: state.permissionsGranted.includes(action.permission)
          ? state.permissionsGranted.filter(p => p !== action.permission)
          : [...state.permissionsGranted, action.permission],
      }

    case 'SUCCESS':
      return {
        ...state,
        currentState: 'SUCCESS',
        session: action.session,
      }

    case 'ERROR':
      return {
        ...state,
        currentState: 'ERROR',
        errorMessage: action.message,
      }

    case 'RETRY':
      return {
        ...state,
        currentState: state.previousState || 'WALLET_CONNECT',
        errorMessage: null,
      }

    case 'CLOSE_MODAL':
      return initialState

    default:
      return state
  }
}

export default function OAuthWidget() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [isVisible, setIsVisible] = useState(false)

  const handleOpenModal = () => {
    console.log('[v0] Opening modal')
    setIsVisible(true)
    dispatch({ type: 'OPEN_MODAL' })
  }

  const handleCloseModal = () => {
    setIsVisible(false)
    dispatch({ type: 'CLOSE_MODAL' })
  }

  const handleSelectWallet = (wallet: 'Phantom' | 'Backpack' | 'Solflare') => {
    dispatch({ type: 'SELECT_WALLET', wallet })
  }

  // Simulate requirements check
  useEffect(() => {
    if (state.currentState === 'REQUIREMENTS_CHECK' && state.walletSelected) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_BALANCE', balance: 5000000000 })
        dispatch({ type: 'ADVANCE_STAGE' })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.currentState, state.walletSelected])

  // Simulate proof generation
  useEffect(() => {
    if (state.currentState === 'PROOF_GENERATION') {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          dispatch({ type: 'UPDATE_PROOF_PROGRESS', progress: 100 })
          clearInterval(interval)
          const timer = setTimeout(() => {
            dispatch({ type: 'ADVANCE_STAGE' })
          }, 500)
          return () => clearTimeout(timer)
        }
        dispatch({ type: 'UPDATE_PROOF_PROGRESS', progress })
      }, 300)
      return () => clearInterval(interval)
    }
  }, [state.currentState])

  // Auto-close on success
  useEffect(() => {
    if (state.currentState === 'SUCCESS') {
      const timer = setTimeout(() => {
        handleCloseModal()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.currentState])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="turbulent-displace-modal">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Trigger Button */}
      {!isVisible && (
        <button
          onClick={handleOpenModal}
          className="oauth-button"
          type="button"
          style={{ position: 'relative', zIndex: 100, pointerEvents: 'auto' }}
          onTouchStart={handleOpenModal}
        >
          <span className="oauth-button-text">Sign in with Veiled</span>
        </button>
      )}

      {/* Modal Backdrop */}
      <div className={`modal-backdrop ${isVisible ? 'visible' : ''}`} onClick={handleCloseModal}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="oauth-card-wrapper">
            <div className="oauth-card-inner">
              <div className="border-outer-oauth">
                <div className="oauth-main-card">
                  <div className="glow-layer-1-oauth" />
                  <div className="glow-layer-2-oauth" />
                  <div className="overlay-1-oauth" />
                  <div className="overlay-2-oauth" />
                  <div className="background-glow-oauth" />

                  {/* Close Button */}
                  <button
                    onClick={handleCloseModal}
                    className="close-button-oauth"
                    type="button"
                    aria-label="Close"
                  >
                    ✕
                  </button>

                  {/* Content Area */}
                  <div className="oauth-content-wrapper">
                    {/* Stage 1: Wallet Connect */}
                    {state.currentState === 'WALLET_CONNECT' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Connect Wallet to Continue</h2>
                          <p>Choose your preferred wallet</p>
                        </div>

                        <div className="wallet-grid">
                          {['Phantom', 'Backpack', 'Solflare'].map((wallet) => (
                            <button
                              key={wallet}
                              onClick={() => handleSelectWallet(wallet as any)}
                              className="wallet-option"
                              type="button"
                            >
                              <div className="wallet-icon">
                                {wallet === 'Phantom' && '🦊'}
                                {wallet === 'Backpack' && '🎒'}
                                {wallet === 'Solflare' && '☀️'}
                              </div>
                              <div className="wallet-name">{wallet}</div>
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={handleCloseModal}
                          className="btn-deny"
                          style={{ marginTop: 'auto' }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Stage 2: Requirements Check */}
                    {state.currentState === 'REQUIREMENTS_CHECK' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Checking Requirements...</h2>
                          <p>Fetching balance information</p>
                        </div>

                        <div className="progress-container">
                          <div className="spinner" />
                          <div className="progress-text">Fetching balance...</div>
                        </div>
                      </div>
                    )}

                    {/* Stage 3: Wallet Proof */}
                    {state.currentState === 'WALLET_PROOF' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Sign Message in Wallet</h2>
                          <p>Check your wallet extension and approve the signature</p>
                        </div>

                        <div className="progress-container">
                          <div className="spinner" />
                          <div className="progress-text">Message: "Veiled Auth: Prove your privacy"</div>
                          <div className="progress-text" style={{ marginTop: '16px', fontSize: '12px' }}>
                            Waiting for wallet response...
                          </div>
                        </div>

                        <button
                          onClick={() => dispatch({ type: 'ADVANCE_STAGE' })}
                          className="btn-allow"
                          style={{ marginTop: 'auto' }}
                          type="button"
                        >
                          Simulate Sign
                        </button>
                      </div>
                    )}

                    {/* Stage 4: Proof Generation */}
                    {state.currentState === 'PROOF_GENERATION' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Generating Zero-Knowledge Proof...</h2>
                          <p>This proves you own a wallet without revealing which one</p>
                        </div>

                        <div className="progress-container">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${state.proofProgress}%` }}
                            />
                          </div>
                          <div className="progress-text">{Math.round(state.proofProgress)}%</div>
                          <div className="progress-text" style={{ fontSize: '12px' }}>
                            This may take 2-3 seconds
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 5: Verification Result */}
                    {state.currentState === 'VERIFICATION_RESULT' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Sign Verification Result</h2>
                          <p>Check your wallet to confirm the proof was verified</p>
                        </div>

                        <div className="progress-container">
                          <div className="spinner" />
                          <div className="progress-text">Waiting for wallet signature...</div>
                        </div>

                        <button
                          onClick={() => dispatch({ type: 'ADVANCE_STAGE' })}
                          className="btn-allow"
                          style={{ marginTop: 'auto' }}
                          type="button"
                        >
                          Simulate Sign
                        </button>
                      </div>
                    )}

                    {/* Stage 6: On-Chain Submission */}
                    {state.currentState === 'ON_CHAIN_SUBMISSION' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Submitting to Solana...</h2>
                          <p>Approve the transaction in your wallet</p>
                        </div>

                        <div className="progress-container">
                          <div className="spinner" />
                          <div className="progress-text">Waiting for approval...</div>
                        </div>

                        <button
                          onClick={() => dispatch({ type: 'ADVANCE_STAGE' })}
                          className="btn-allow"
                          style={{ marginTop: 'auto' }}
                          type="button"
                        >
                          Simulate Approve
                        </button>
                      </div>
                    )}

                    {/* Stage 7: Permissions Request */}
                    {state.currentState === 'PERMISSIONS_REQUEST' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Permission Request</h2>
                          <p>myapp.com wants to:</p>
                        </div>

                        <div className="permissions-list">
                          {['reveal_wallet_address', 'read_balance', 'view_nfts'].map((perm) => (
                            <label key={perm} className="permission-item">
                              <div className="custom-checkbox-wrapper">
                                <input
                                  type="checkbox"
                                  className="custom-checkbox"
                                  checked={state.permissionsGranted.includes(perm)}
                                  onChange={() => dispatch({ type: 'TOGGLE_PERMISSION', permission: perm })}
                                />
                                <div className="checkbox-box" />
                              </div>
                              <span>{perm.replace(/_/g, ' ')}</span>
                            </label>
                          ))}
                        </div>

                        <div className="permissions-actions" style={{ marginTop: 'auto' }}>
                          <button
                            onClick={() => dispatch({ type: 'ADVANCE_STAGE' })}
                            className="btn-deny"
                            type="button"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => state.permissionsGranted.length > 0 
                              ? dispatch({ type: 'ADVANCE_STAGE' })
                              : dispatch({ type: 'ADVANCE_STAGE' })
                            }
                            className="btn-allow"
                            type="button"
                          >
                            Allow
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stage 8: Grant Permissions */}
                    {state.currentState === 'GRANT_PERMISSIONS' && state.permissionsGranted.length > 0 && (
                      <div className="oauth-screen slide-in-left">
                        <div className="oauth-screen-header">
                          <h2>Granting Permissions...</h2>
                          <p>Approve transaction to grant permissions on-chain</p>
                        </div>

                        <div className="progress-container">
                          <div className="spinner" />
                          <div className="progress-text">Waiting for approval...</div>
                        </div>

                        <button
                          onClick={() => dispatch({ type: 'ADVANCE_STAGE' })}
                          className="btn-allow"
                          style={{ marginTop: 'auto' }}
                          type="button"
                        >
                          Simulate Approve
                        </button>
                      </div>
                    )}

                    {/* Success Screen */}
                    {state.currentState === 'SUCCESS' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="success-content">
                          <div className="success-icon">✓</div>
                          <div className="session-info">
                            <p><strong>Success!</strong></p>
                            <p>Anonymous ID: veiled_7a3b2f9</p>
                            <p>Privacy Score: 10/10 ✓</p>
                          </div>
                          <div className="progress-text">Closing in 2s...</div>
                        </div>
                      </div>
                    )}

                    {/* Error Screen */}
                    {state.currentState === 'ERROR' && (
                      <div className="oauth-screen slide-in-left">
                        <div className="error-content">
                          <div className="error-icon">⚠️</div>
                          <div className="error-message">{state.errorMessage || 'An error occurred'}</div>
                          <div className="error-actions" style={{ marginTop: 'auto' }}>
                            <button
                              onClick={() => dispatch({ type: 'RETRY' })}
                              className="btn-retry"
                              type="button"
                            >
                              Try Again
                            </button>
                            <button
                              onClick={handleCloseModal}
                              className="btn-cancel"
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
