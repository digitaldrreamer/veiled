// * Sign-in widget React component
// * Provides a complete UI for Veiled authentication with progress tracking
// * Note: This is an internal React component - not exported to consumers

import React, { useReducer, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { VeiledAuth } from '../veiled-auth.js'
import type { SignInOptions, Session, Permission } from '../types.js'
import type { WidgetConfig, WidgetState, WidgetStateData, ProgressStage, ProgressCallback } from '../types/widget.js'
import './sign-in-widget.css'

interface SignInWidgetProps {
  veiled: VeiledAuth
  config: WidgetConfig
  onClose?: () => void
}

export interface SignInWidgetRef {
  updateConfig: (config: WidgetConfig) => void
  open: () => void
  close: () => void
  retry: () => void
  getState: () => WidgetState
  getProgress: () => number
}

// * Widget action types
type WidgetAction =
  | { type: 'SET_STATE'; state: WidgetState }
  | { type: 'SET_PROGRESS'; progress: number; message?: string }
  | { type: 'SET_WALLET'; connected: boolean; address?: string }
  | { type: 'SET_BALANCE'; balance: number }
  | { type: 'SET_NFT'; collection: string }
  | { type: 'SET_PROOF_GENERATED'; generated: boolean }
  | { type: 'SET_VERIFICATION_SIGNED'; signed: boolean }
  | { type: 'SET_TRANSACTION_SUBMITTED'; submitted: boolean }
  | { type: 'SET_PERMISSIONS'; permissions: Permission[] }
  | { type: 'SET_SESSION'; session: Session }
  | { type: 'SET_ERROR'; error: Error; stage: WidgetState }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' }

// * Initial state
const initialState: WidgetStateData = {
  currentState: 'IDLE',
  previousState: null,
  error: null,
  errorStage: null,
  progress: 0,
  progressMessage: null,
  walletConnected: false,
  walletAddress: null,
  balance: null,
  nftCollection: null,
  proofGenerated: false,
  verificationSigned: false,
  transactionSubmitted: false,
  permissionsGranted: [],
  session: null,
}

// * Widget reducer
function widgetReducer(
  state: WidgetStateData,
  action: WidgetAction
): WidgetStateData {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        previousState: state.currentState,
        currentState: action.state,
      }

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.progress,
        progressMessage: action.message || null,
      }

    case 'SET_WALLET':
      return {
        ...state,
        walletConnected: action.connected,
        walletAddress: action.address || null,
      }

    case 'SET_BALANCE':
      return {
        ...state,
        balance: action.balance,
      }

    case 'SET_NFT':
      return {
        ...state,
        nftCollection: action.collection,
      }

    case 'SET_PROOF_GENERATED':
      return {
        ...state,
        proofGenerated: action.generated,
      }

    case 'SET_VERIFICATION_SIGNED':
      return {
        ...state,
        verificationSigned: action.signed,
      }

    case 'SET_TRANSACTION_SUBMITTED':
      return {
        ...state,
        transactionSubmitted: action.submitted,
      }

    case 'SET_PERMISSIONS':
      return {
        ...state,
        permissionsGranted: action.permissions,
      }

    case 'SET_SESSION':
      return {
        ...state,
        session: action.session,
      }

    case 'SET_ERROR':
      return {
        ...state,
        currentState: 'ERROR',
        error: action.error,
        errorStage: action.stage,
        previousState: state.currentState,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        errorStage: null,
      }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// * Map progress stage to widget state
function mapProgressStageToWidgetState(stage: ProgressStage): WidgetState {
  const mapping: Record<ProgressStage, WidgetState> = {
    wallet_connect: 'WALLET_CONNECT',
    requirements_check: 'REQUIREMENTS_CHECK',
    wallet_proof: 'WALLET_PROOF',
    proof_generation: 'PROOF_GENERATION',
    proof_verification: 'PROOF_VERIFICATION',
    verification_signature: 'VERIFICATION_RESULT',
    on_chain_submission: 'ON_CHAIN_SUBMISSION',
    permissions_request: 'PERMISSIONS_REQUEST',
    grant_permissions: 'GRANT_PERMISSIONS',
    success: 'SUCCESS',
  }
  return mapping[stage] || 'ERROR'
}

// * Create progress callback from dispatch
function createProgressCallback(
  dispatch: React.Dispatch<WidgetAction>,
  cancellationToken: React.MutableRefObject<{ cancelled: boolean }>
): ProgressCallback {
  return {
    onStageChange: (stage: ProgressStage, data?: any) => {
      if (cancellationToken.current.cancelled) return

      const widgetState = mapProgressStageToWidgetState(stage)
      dispatch({ type: 'SET_STATE', state: widgetState })

      // * Update state-specific data
      if (data) {
        if (data.walletAddress) {
          dispatch({ type: 'SET_WALLET', connected: true, address: data.walletAddress })
        }
        if (data.balance !== undefined) {
          dispatch({ type: 'SET_BALANCE', balance: data.balance })
        }
        if (data.nftCollection) {
          dispatch({ type: 'SET_NFT', collection: data.nftCollection })
        }
      }
    },

    onProgress: (progress: number, message?: string) => {
      if (cancellationToken.current.cancelled) return
      dispatch({ type: 'SET_PROGRESS', progress, message })
    },

    onError: (error: Error, stage: ProgressStage) => {
      if (cancellationToken.current.cancelled) return
      const widgetState = mapProgressStageToWidgetState(stage)
      dispatch({ type: 'SET_ERROR', error, stage: widgetState })
    },

    onCancel: () => {
      cancellationToken.current.cancelled = true
      dispatch({ type: 'RESET' })
    },
  }
}

export const SignInWidget = forwardRef<SignInWidgetRef, SignInWidgetProps>(
  ({ veiled, config, onClose }, ref) => {
    const [state, dispatch] = useReducer(widgetReducer, initialState)
    const cancellationToken = useRef<{ cancelled: boolean }>({ cancelled: false })
    const signInPromise = useRef<Promise<Session> | null>(null)
    const configRef = useRef<WidgetConfig>(config)

    // * Update config ref when config changes
    useEffect(() => {
      configRef.current = config
    }, [config])

    // * Expose methods via ref
    useImperativeHandle(ref, () => ({
      updateConfig: (newConfig: WidgetConfig) => {
        configRef.current = newConfig
      },
      open: () => {
        dispatch({ type: 'SET_STATE', state: 'WALLET_CONNECT' })
      },
      close: () => {
        cancellationToken.current.cancelled = true
        dispatch({ type: 'RESET' })
        onClose?.()
      },
      retry: () => {
        if (state.errorStage) {
          dispatch({ type: 'SET_STATE', state: state.errorStage })
          dispatch({ type: 'CLEAR_ERROR' })
        }
      },
      getState: () => state.currentState,
      getProgress: () => state.progress,
    }))

    // * Main sign-in flow
    const handleSignIn = useCallback(async () => {
      try {
        cancellationToken.current.cancelled = false

        // * Create progress callback
        const progress = createProgressCallback(dispatch, cancellationToken)

        // * Prepare sign-in options
        const signInOptions: SignInOptions = {
          requirements: configRef.current.requirements,
          domain: configRef.current.domain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
          permissions: configRef.current.permissions,
          expiry: configRef.current.expiry,
        }

        // * Call signIn with progress
        signInPromise.current = veiled.signIn(signInOptions, progress)
        const session = await signInPromise.current

        // * Success - session is guaranteed to be non-null after successful signIn
        if (session) {
          dispatch({ type: 'SET_SESSION', session })
          dispatch({ type: 'SET_STATE', state: 'SUCCESS' })
          configRef.current.onSuccess?.(session)
        }

        // * Auto-close
        if (configRef.current.autoClose !== false) {
          setTimeout(() => {
            dispatch({ type: 'RESET' })
            onClose?.()
          }, configRef.current.closeDelay || 2000)
        }
      } catch (error) {
        if (cancellationToken.current.cancelled) {
          return // User cancelled, don't show error
        }

        const err = error instanceof Error ? error : new Error(String(error))
        dispatch({ type: 'SET_ERROR', error: err, stage: state.currentState })
        configRef.current.onError?.(err)
      }
    }, [veiled, onClose])

    useEffect(() => {
      if (state.currentState === 'WALLET_CONNECT') {
        handleSignIn()
      }
    }, [state.currentState, handleSignIn])

    // * CRITICAL: Disable pointer events on modal container when widget is IDLE
    // * This prevents the invisible modal container from blocking clicks
    useEffect(() => {
      if (state.currentState === 'IDLE') {
        // * Find modal container and disable pointer events
        const modalContainer = document.getElementById('veiled-auth-modal-container')
        if (modalContainer) {
          modalContainer.style.pointerEvents = 'none'
        }
      }
    }, [state.currentState])

    // * Render based on state
    const renderContent = () => {
      switch (state.currentState) {
        case 'IDLE':
          return null // Button is rendered separately

        case 'WALLET_CONNECT':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Connect Wallet to Continue</h2>
                <p>Your wallet will be used to generate a privacy-preserving proof</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">Connecting wallet...</div>
              </div>
            </div>
          )

        case 'REQUIREMENTS_CHECK':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Checking Requirements...</h2>
                <p>{state.progressMessage || 'Verifying eligibility'}</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">{state.progressMessage || 'Checking requirements...'}</div>
              </div>
            </div>
          )

        case 'WALLET_PROOF':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Sign Message in Wallet</h2>
                <p>Check your wallet extension and approve the signature</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">Waiting for wallet signature...</div>
              </div>
            </div>
          )

        case 'PROOF_GENERATION':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Generating Zero-Knowledge Proof...</h2>
                <p>This proves you own a wallet without revealing which one</p>
              </div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
                <div className="progress-text">{Math.round(state.progress)}%</div>
                <div className="progress-text" style={{ fontSize: '12px' }}>
                  {state.progressMessage || 'This may take 2-3 seconds'}
                </div>
              </div>
            </div>
          )

        case 'PROOF_VERIFICATION':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Verifying Proof...</h2>
                <p>Validating zero-knowledge proof</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">{state.progressMessage || 'Verifying proof...'}</div>
              </div>
            </div>
          )

        case 'VERIFICATION_RESULT':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Sign Verification Result</h2>
                <p>Check your wallet to confirm the proof was verified</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">Waiting for wallet signature...</div>
              </div>
            </div>
          )

        case 'ON_CHAIN_SUBMISSION':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Submitting to Solana...</h2>
                <p>Approve the transaction in your wallet</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">{state.progressMessage || 'Waiting for approval...'}</div>
              </div>
            </div>
          )

        case 'PERMISSIONS_REQUEST':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Permission Request</h2>
                <p>{typeof window !== 'undefined' ? window.location.hostname : 'this app'} wants to:</p>
              </div>
              <div className="permissions-list">
                {configRef.current.permissions?.permissions.map((perm) => (
                  <div key={perm} className="permission-item">
                    <span>{perm.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
              <div className="progress-text" style={{ marginTop: 'auto', fontSize: '12px' }}>
                Permission modal will appear...
              </div>
            </div>
          )

        case 'GRANT_PERMISSIONS':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="oauth-screen-header">
                <h2>Granting Permissions...</h2>
                <p>Approve transaction to grant permissions on-chain</p>
              </div>
              <div className="progress-container">
                <div className="spinner" />
                <div className="progress-text">{state.progressMessage || 'Waiting for approval...'}</div>
              </div>
            </div>
          )

        case 'SUCCESS':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="success-content">
                <div className="success-icon">✓</div>
                <div className="session-info">
                  <p><strong>Success!</strong></p>
                  {state.session && (
                    <>
                      <p>Anonymous ID: {state.session.nullifier.substring(0, 16)}...</p>
                      <p>Privacy Score: 10/10 ✓</p>
                    </>
                  )}
                </div>
                <div className="progress-text">Closing in 2s...</div>
              </div>
            </div>
          )

        case 'ERROR':
          return (
            <div className="oauth-screen slide-in-left">
              <div className="error-content">
                <div className="error-icon">⚠️</div>
                <div className="error-message">
                  {state.error?.message || 'An error occurred'}
                </div>
                <div className="error-actions" style={{ marginTop: 'auto' }}>
                  <button
                    onClick={() => {
                      if (state.errorStage) {
                        dispatch({ type: 'SET_STATE', state: state.errorStage })
                        dispatch({ type: 'CLEAR_ERROR' })
                      }
                    }}
                    className="btn-retry"
                    type="button"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      cancellationToken.current.cancelled = true
                      dispatch({ type: 'RESET' })
                      onClose?.()
                    }}
                    className="btn-cancel"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )

        default:
          return null
      }
    }

    // * Don't render if IDLE (button will be rendered separately)
    if (state.currentState === 'IDLE') {
      return null
    }

    return (
      <div className="veiled-widget">
        <svg style={{ display: 'none' }}>
          <defs>
            <filter id="turbulent-displace-modal">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="2" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        {/* Modal Backdrop */}
        <div className="modal-backdrop visible" onClick={() => {
          if (state.currentState !== 'PROOF_GENERATION' && state.currentState !== 'PROOF_VERIFICATION') {
            cancellationToken.current.cancelled = true
            dispatch({ type: 'RESET' })
            onClose?.()
          }
        }}>
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
                    {state.currentState !== 'PROOF_GENERATION' && state.currentState !== 'PROOF_VERIFICATION' && (
                      <button
                        onClick={() => {
                          cancellationToken.current.cancelled = true
                          dispatch({ type: 'RESET' })
                          onClose?.()
                        }}
                        className="close-button-oauth"
                        type="button"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    )}

                    {/* Content Area */}
                    <div className="oauth-content-wrapper">
                      {renderContent()}
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
)

SignInWidget.displayName = 'SignInWidget'
