# Veiled Widget Implementation Plan

**Complete, comprehensive plan for widget integration and demo app replacement**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [File Structure Changes](#file-structure-changes)
4. [SDK Integration Points](#sdk-integration-points)
5. [State Machine Implementation](#state-machine-implementation)
6. [API Design & Syntactic Sugar](#api-design--syntactic-sugar)
7. [Widget Component Architecture](#widget-component-architecture)
8. [Progress Callback System](#progress-callback-system)
9. [Error Handling Strategy](#error-handling-strategy)
10. [Demo App Replacement](#demo-app-replacement)
11. [Testing Strategy](#testing-strategy)
12. [Migration Path](#migration-path)
13. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### Goals

1. **Replace demo app** (`apps/demo`) with chat app (`apps/demo/external/chat`)
2. **Create universal sign-in widget** as a single React component with bundled styles
3. **Expose framework-agnostic API** (`veiled.renderButton()`, `veiled.openAuthModal()`, `veiled.getSession()`)
4. **Integrate widget into SDK** (`packages/core/src/ui/`)
5. **Map all SDK behaviors** to widget states with progress tracking

### Key Principles

- **React internally, JavaScript externally** - Widget uses React, but API is framework-agnostic
- **Single bundled component** - All styles and logic in one place
- **Progress callbacks** - Hook into `VeiledAuth.signIn()` at every stage
- **State preservation** - Maintain state across retries and navigation
- **Error recovery** - Every error is retryable without losing progress

---

## Architecture Overview

### Current State

```
packages/core/
├── src/
│   ├── veiled-auth.ts          # Core auth logic
│   ├── ui/
│   │   └── permission-modal.ts # Vanilla JS modal (permissions only)
│   └── index.ts                # Public exports

apps/demo/
├── src/routes/+page.svelte     # Current demo (SvelteKit)
└── external/
    ├── chat/                   # Next.js chat app (target replacement)
    └── widget/                 # React widget (design reference)
```

### Target State

```
packages/core/
├── src/
│   ├── veiled-auth.ts          # Core auth logic (enhanced with callbacks)
│   ├── ui/
│   │   ├── sign-in-widget.tsx  # React component (NEW)
│   │   ├── sign-in-widget.css  # Bundled styles (NEW)
│   │   ├── sign-in-widget-api.ts # Framework-agnostic API (NEW)
│   │   └── permission-modal.ts # Keep (used internally)
│   └── index.ts                # Export new APIs

apps/demo/                      # Replaced with chat app
├── app/                        # Next.js app structure
├── components/
│   └── chat-interface.tsx      # Main chat component
└── ...                         # Next.js files
```

### Component Hierarchy

```
VeiledAuth (Core)
  ├── signIn() with progress callbacks
  └── getSession()

SignInWidgetAPI (Public API)
  ├── renderButton()
  ├── openAuthModal()
  └── getSession()

SignInWidget (React Component - Internal)
  ├── State machine (reducer)
  ├── Progress tracking
  ├── Error handling
  └── UI rendering
```

---

## File Structure Changes

### New Files to Create

#### 1. `packages/core/src/ui/sign-in-widget.tsx`
**Purpose:** Main React component for the sign-in widget
**Size:** ~800-1000 lines
**Dependencies:**
- React 18+
- `@veiled/core` types
- Internal: `veiled-auth.ts`, `types.ts`

**Key Responsibilities:**
- State machine management (useReducer)
- Progress tracking during signIn()
- Error handling and recovery
- UI rendering for all states
- Wallet adapter integration
- Permission modal integration

#### 2. `packages/core/src/ui/sign-in-widget.css`
**Purpose:** All widget styles bundled
**Size:** ~500-800 lines
**Dependencies:** None (pure CSS)

**Key Sections:**
- Modal container and backdrop
- State-specific screens (wallet connect, proof generation, etc.)
- Progress bars and animations
- Error states
- Success states
- Responsive (mobile/desktop)
- Electric border effects (from widget design)

#### 3. `packages/core/src/ui/sign-in-widget-api.ts`
**Purpose:** Framework-agnostic API wrapper
**Size:** ~200-300 lines
**Dependencies:**
- React DOM (createRoot)
- `sign-in-widget.tsx`

**Key Responsibilities:**
- Create/destroy React roots
- Mount/unmount widget
- Manage widget instances
- Expose public API methods

#### 4. `packages/core/src/types/widget.ts`
**Purpose:** Widget-specific types
**Size:** ~100-150 lines

**Key Types:**
- `WidgetState` (all possible states)
- `WidgetConfig` (renderButton options)
- `ProgressCallback` (signIn progress)
- `WidgetInstance` (returned from API)

### Files to Modify

#### 1. `packages/core/src/veiled-auth.ts`
**Changes:**
- Add `ProgressCallback` parameter to `signIn()`
- Emit progress events at each stage
- Support cancellation token
- Return progress information

**New Method Signatures:**
```typescript
async signIn(
  options: SignInOptions,
  progress?: ProgressCallback
): Promise<Session>
```

#### 2. `packages/core/src/index.ts`
**Changes:**
- Export `createSignInWidget`
- Export `renderButton` (syntactic sugar)
- Export widget types

**New Exports:**
```typescript
export { createSignInWidget, renderButton } from './ui/sign-in-widget-api.js'
export type { WidgetConfig, WidgetInstance } from './types/widget.js'
```

#### 3. `packages/core/src/veiled-auth.ts` (Additional)
**Changes:**
- Add `renderButton()` method (syntactic sugar)
- Add `openAuthModal()` method (syntactic sugar)
- Add `getSession()` method (already exists, expose publicly)

**New Methods:**
```typescript
renderButton(target: string | HTMLElement, config: WidgetConfig): WidgetInstance
openAuthModal(config: WidgetConfig): WidgetInstance
getSession(): Session | null
```

### Files to Delete/Move

#### 1. `apps/demo/src/routes/+page.svelte`
**Action:** Delete (replaced by chat app)

#### 2. `apps/demo/external/chat/`
**Action:** Move to `apps/demo/` root
- Move all files from `external/chat/` to `apps/demo/`
- Update imports
- Update package.json paths

#### 3. `apps/demo/external/widget/`
**Action:** Keep as reference, don't delete
- Extract design patterns
- Extract CSS styles
- Extract state machine logic
- Don't copy directly - adapt to SDK

---

## SDK Integration Points

### Current `VeiledAuth.signIn()` Flow

```typescript
async signIn(options: SignInOptions): Promise<Session> {
  // 1. Check wallet adapter
  if (!this.walletAdapter) throw Error('Wallet not connected')
  
  // 2. Connect wallet if needed
  if (!this.walletAdapter.connected) {
    await this.walletAdapter.connect() // ⏸️ WALLET POPUP
  }
  
  // 3. Get wallet proof (message signing)
  const walletProof = await getWalletProof(...) // ⏸️ WALLET POPUP
  
  // 4. Prepare secret key
  const walletSecretKey = prepareSecretKeyFromSignature(...)
  
  // 5. Select circuit
  const circuitType = this.selectCircuit(options.requirements)
  
  // 6. Prepare inputs (may fetch balance/NFT)
  if (circuitType === 'balance_range') {
    // Fetch balance from RPC
    const balanceInputs = await prepareBalanceRangeCircuitInputs(...)
  } else if (circuitType === 'nft_ownership') {
    // Fetch NFTs from Quicknode
    const nftInputs = await prepareNFTOwnershipCircuitInputs(...)
  }
  
  // 7. Generate proof
  proofResult = await generateProof(...) // ⏸️ 2-3 seconds
  
  // 8. Verify proof
  const isValid = await verifyProof(...)
  
  // 9. Sign verification message
  const signature = await walletAdapter.signMessage(...) // ⏸️ WALLET POPUP
  
  // 10. Submit to chain (optional)
  if (this.connection && this.wallet) {
    const txSignature = await submitVerificationResultToChain(...) // ⏸️ WALLET POPUP
  }
  
  // 11. Request permissions (optional)
  if (options.permissions) {
    const granted = await this.requestPermissions(...) // ⏸️ UI MODAL
    if (granted) {
      await grantPermissionsOnChain(...) // ⏸️ WALLET POPUP
    }
  }
  
  // 12. Return session
  return session
}
```

### Enhanced Flow with Progress Callbacks

```typescript
type ProgressStage = 
  | 'wallet_connect'
  | 'requirements_check'
  | 'wallet_proof'
  | 'proof_generation'
  | 'proof_verification'
  | 'verification_signature'
  | 'on_chain_submission'
  | 'permissions_request'
  | 'grant_permissions'
  | 'success'

interface ProgressCallback {
  onStageChange?: (stage: ProgressStage, data?: any) => void
  onProgress?: (progress: number, message?: string) => void
  onError?: (error: Error, stage: ProgressStage) => void
  onCancel?: () => void
}

async signIn(
  options: SignInOptions,
  progress?: ProgressCallback
): Promise<Session> {
  try {
    // Stage 1: Wallet Connect
    progress?.onStageChange?.('wallet_connect')
    if (!this.walletAdapter) throw Error('Wallet not connected')
    if (!this.walletAdapter.connected) {
      await this.walletAdapter.connect() // ⏸️ WALLET POPUP
    }
    
    // Stage 2: Requirements Check
    progress?.onStageChange?.('requirements_check')
    const circuitType = this.selectCircuit(options.requirements)
    
    if (circuitType === 'balance_range') {
      progress?.onProgress?.(0, 'Fetching balance...')
      const balanceInputs = await prepareBalanceRangeCircuitInputs(...)
      progress?.onProgress?.(50, 'Balance verified')
    } else if (circuitType === 'nft_ownership') {
      progress?.onProgress?.(0, 'Checking NFT ownership...')
      const nftInputs = await prepareNFTOwnershipCircuitInputs(...)
      progress?.onProgress?.(50, 'NFT verified')
    }
    
    // Stage 3: Wallet Proof
    progress?.onStageChange?.('wallet_proof')
    progress?.onProgress?.(0, 'Sign message in wallet...')
    const walletProof = await getWalletProof(...) // ⏸️ WALLET POPUP
    progress?.onProgress?.(100, 'Message signed')
    
    // Stage 4: Proof Generation
    progress?.onStageChange?.('proof_generation')
    progress?.onProgress?.(0, 'Generating proof...')
    proofResult = await generateProof(...) // ⏸️ 2-3 seconds
    progress?.onProgress?.(100, 'Proof generated')
    
    // Stage 5: Proof Verification
    progress?.onStageChange?.('proof_verification')
    progress?.onProgress?.(0, 'Verifying proof...')
    const isValid = await verifyProof(...)
    progress?.onProgress?.(100, 'Proof verified')
    
    // Stage 6: Verification Signature
    if (this.connection && this.wallet) {
      progress?.onStageChange?.('verification_signature')
      progress?.onProgress?.(0, 'Sign verification result...')
      const signature = await walletAdapter.signMessage(...) // ⏸️ WALLET POPUP
      progress?.onProgress?.(100, 'Signed')
    }
    
    // Stage 7: On-Chain Submission
    if (this.connection && this.wallet) {
      progress?.onStageChange?.('on_chain_submission')
      progress?.onProgress?.(0, 'Submitting to Solana...')
      const txSignature = await submitVerificationResultToChain(...) // ⏸️ WALLET POPUP
      progress?.onProgress?.(100, 'Submitted')
    }
    
    // Stage 8: Permissions Request
    if (options.permissions) {
      progress?.onStageChange?.('permissions_request')
      const granted = await this.requestPermissions(...) // ⏸️ UI MODAL
      if (granted) {
        progress?.onStageChange?.('grant_permissions')
        progress?.onProgress?.(0, 'Granting permissions...')
        await grantPermissionsOnChain(...) // ⏸️ WALLET POPUP
        progress?.onProgress?.(100, 'Granted')
      }
    }
    
    // Stage 9: Success
    progress?.onStageChange?.('success')
    return session
    
  } catch (error) {
    progress?.onError?.(error, currentStage)
    throw error
  }
}
```

### Integration Points Summary

| SDK Method | Widget State | Progress Callback |
|-----------|-------------|-------------------|
| `walletAdapter.connect()` | `WALLET_CONNECT` | `onStageChange('wallet_connect')` |
| `prepareBalanceRangeCircuitInputs()` | `REQUIREMENTS_CHECK` | `onProgress(0-50, 'Fetching balance...')` |
| `prepareNFTOwnershipCircuitInputs()` | `REQUIREMENTS_CHECK` | `onProgress(0-50, 'Checking NFT...')` |
| `getWalletProof()` | `WALLET_PROOF` | `onStageChange('wallet_proof')` |
| `generateProof()` | `PROOF_GENERATION` | `onProgress(0-100, 'Generating...')` |
| `verifyProof()` | `PROOF_VERIFICATION` | `onStageChange('proof_verification')` |
| `walletAdapter.signMessage(verification)` | `VERIFICATION_RESULT` | `onStageChange('verification_signature')` |
| `submitVerificationResultToChain()` | `ON_CHAIN_SUBMISSION` | `onStageChange('on_chain_submission')` |
| `requestPermissions()` | `PERMISSIONS_REQUEST` | `onStageChange('permissions_request')` |
| `grantPermissionsOnChain()` | `GRANT_PERMISSIONS` | `onStageChange('grant_permissions')` |
| Return session | `SUCCESS` | `onStageChange('success')` |

---

## State Machine Implementation

### State Definitions

```typescript
type WidgetState = 
  | 'IDLE'                    // Initial state, button rendered
  | 'WALLET_CONNECT'          // Wallet selection/connection
  | 'REQUIREMENTS_CHECK'       // Fetching balance/NFT data
  | 'WALLET_PROOF'            // Requesting wallet signature
  | 'PROOF_GENERATION'        // Generating ZK proof (2-3s)
  | 'PROOF_VERIFICATION'      // Verifying proof off-chain
  | 'VERIFICATION_RESULT'     // Signing verification message
  | 'ON_CHAIN_SUBMISSION'     // Submitting transaction
  | 'PERMISSIONS_REQUEST'     // Showing permission modal
  | 'GRANT_PERMISSIONS'       // Granting permissions on-chain
  | 'SUCCESS'                 // Success screen (auto-closes)
  | 'ERROR'                   // Error screen with retry

interface WidgetStateData {
  currentState: WidgetState
  previousState: WidgetState | null
  error: Error | null
  errorStage: WidgetState | null
  progress: number              // 0-100
  progressMessage: string | null
  walletConnected: boolean
  walletAddress: string | null
  balance: number | null
  nftCollection: string | null
  proofGenerated: boolean
  verificationSigned: boolean
  transactionSubmitted: boolean
  permissionsGranted: Permission[]
  session: Session | null
}
```

### State Transitions

```typescript
const stateTransitions: Record<WidgetState, WidgetState[]> = {
  IDLE: ['WALLET_CONNECT'],
  WALLET_CONNECT: ['REQUIREMENTS_CHECK', 'ERROR', 'IDLE'], // Cancel
  REQUIREMENTS_CHECK: ['WALLET_PROOF', 'ERROR'],
  WALLET_PROOF: ['PROOF_GENERATION', 'ERROR'],
  PROOF_GENERATION: ['PROOF_VERIFICATION', 'ERROR'],
  PROOF_VERIFICATION: ['VERIFICATION_RESULT', 'ON_CHAIN_SUBMISSION', 'PERMISSIONS_REQUEST', 'SUCCESS'],
  VERIFICATION_RESULT: ['ON_CHAIN_SUBMISSION', 'PERMISSIONS_REQUEST', 'SUCCESS'],
  ON_CHAIN_SUBMISSION: ['PERMISSIONS_REQUEST', 'SUCCESS'],
  PERMISSIONS_REQUEST: ['GRANT_PERMISSIONS', 'SUCCESS'], // Deny → Success
  GRANT_PERMISSIONS: ['SUCCESS', 'ERROR'],
  SUCCESS: ['IDLE'], // Auto-transition
  ERROR: ['WALLET_CONNECT', 'REQUIREMENTS_CHECK', 'WALLET_PROOF', 'PROOF_GENERATION', 'IDLE'] // Retry or cancel
}
```

### State Machine Reducer

```typescript
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

function widgetReducer(
  state: WidgetStateData,
  action: WidgetAction
): WidgetStateData {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        previousState: state.currentState,
        currentState: action.state
      }
    
    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.progress,
        progressMessage: action.message || null
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        currentState: 'ERROR',
        error: action.error,
        errorStage: action.stage,
        previousState: state.currentState
      }
    
    case 'RESET':
      return initialState
    
    // ... other cases
  }
}
```

### Navigation Rules

```typescript
const navigationRules: Record<WidgetState, {
  canGoBack: boolean
  canCancel: boolean
  backTarget?: WidgetState
}> = {
  IDLE: { canGoBack: false, canCancel: false },
  WALLET_CONNECT: { canGoBack: false, canCancel: true, backTarget: 'IDLE' },
  REQUIREMENTS_CHECK: { canGoBack: false, canCancel: false }, // Loading
  WALLET_PROOF: { canGoBack: false, canCancel: true, backTarget: 'IDLE' },
  PROOF_GENERATION: { canGoBack: false, canCancel: false }, // Cannot cancel
  PROOF_VERIFICATION: { canGoBack: false, canCancel: false }, // Cannot cancel
  VERIFICATION_RESULT: { canGoBack: false, canCancel: false }, // Already signed
  ON_CHAIN_SUBMISSION: { canGoBack: false, canCancel: false }, // Already signed
  PERMISSIONS_REQUEST: { canGoBack: true, canCancel: true, backTarget: 'SUCCESS' },
  GRANT_PERMISSIONS: { canGoBack: false, canCancel: false }, // Committing
  SUCCESS: { canGoBack: false, canCancel: false }, // Auto-closes
  ERROR: { canGoBack: true, canCancel: true, backTarget: 'IDLE' }
}
```

---

## API Design & Syntactic Sugar

### Public API Methods

#### 1. `veiled.renderButton(target, config)`

**Purpose:** Render "Sign in with Veiled" button that triggers modal

**Signature:**
```typescript
renderButton(
  target: string | HTMLElement,
  config: WidgetConfig
): WidgetInstance
```

**Implementation:**
```typescript
// In VeiledAuth class
renderButton(target: string | HTMLElement, config: WidgetConfig): WidgetInstance {
  const element = typeof target === 'string' 
    ? document.querySelector(target) 
    : target
  
  if (!element) {
    throw new Error(`Target element not found: ${target}`)
  }
  
  // Create button element
  const button = document.createElement('button')
  button.className = 'veiled-sign-in-button'
  button.textContent = '🔒 Sign in with Veiled'
  
  // Create widget instance
  const widget = createSignInWidget(this)
  
  // Attach click handler
  button.onclick = () => {
    widget.openAuthModal(config)
  }
  
  // Replace or append to target
  if (element instanceof HTMLElement) {
    element.appendChild(button)
  }
  
  return {
    ...widget,
    button, // Expose button for customization
    destroy: () => {
      button.remove()
      widget.destroy()
    }
  }
}
```

**Usage:**
```javascript
const widget = veiled.renderButton('#signin', {
  requirements: { wallet: true },
  onSuccess: (session) => console.log(session)
})
```

#### 2. `veiled.openAuthModal(config)`

**Purpose:** Programmatically open auth modal

**Signature:**
```typescript
openAuthModal(config: WidgetConfig): WidgetInstance
```

**Implementation:**
```typescript
// In VeiledAuth class
openAuthModal(config: WidgetConfig): WidgetInstance {
  const widget = createSignInWidget(this)
  widget.mount(document.body, config)
  return widget
}
```

**Usage:**
```javascript
const widget = veiled.openAuthModal({
  requirements: { wallet: true },
  onSuccess: (session) => console.log(session)
})
```

#### 3. `veiled.getSession()`

**Purpose:** Get current session (already exists, just expose publicly)

**Signature:**
```typescript
getSession(): Session | null
```

**Implementation:**
```typescript
// Already exists in VeiledAuth, just make it public
getSession(): Session | null {
  return this.currentSession
}
```

**Usage:**
```javascript
const session = veiled.getSession()
if (session && !session.expired) {
  console.log('Already signed in:', session.nullifier)
}
```

### WidgetConfig Interface

```typescript
interface WidgetConfig {
  // Requirements (same as SignInOptions)
  requirements: VeiledRequirements
  
  // Domain (same as SignInOptions)
  domain?: string // Defaults to window.location.hostname
  
  // Permissions (same as SignInOptions)
  permissions?: PermissionRequest
  
  // Session expiry (same as SignInOptions)
  expiry?: number
  
  // Callbacks
  onSuccess?: (session: Session) => void
  onError?: (error: Error) => void
  onCancel?: () => void
  
  // Optional: Customize button text
  buttonText?: string // Default: '🔒 Sign in with Veiled'
  
  // Optional: Customize modal behavior
  autoClose?: boolean // Default: true
  closeDelay?: number // Default: 2000ms
}
```

### WidgetInstance Interface

```typescript
interface WidgetInstance {
  // Lifecycle
  mount: (target: HTMLElement, config: WidgetConfig) => void
  update: (config: WidgetConfig) => void
  destroy: () => void
  
  // State queries
  getState: () => WidgetState
  getProgress: () => number
  getSession: () => Session | null
  
  // Actions
  open: () => void
  close: () => void
  retry: () => void
  
  // For renderButton only
  button?: HTMLElement
}
```

### Framework-Agnostic API Implementation

```typescript
// packages/core/src/ui/sign-in-widget-api.ts

import { createRoot, type Root } from 'react-dom/client'
import { SignInWidget } from './sign-in-widget.js'
import type { VeiledAuth, WidgetConfig, WidgetInstance } from '../types.js'

class SignInWidgetAPI implements WidgetInstance {
  private veiled: VeiledAuth
  private root: Root | null = null
  private container: HTMLElement | null = null
  private config: WidgetConfig | null = null
  private widgetRef: { current: SignInWidget | null } = { current: null }

  constructor(veiled: VeiledAuth) {
    this.veiled = veiled
  }

  mount(target: HTMLElement, config: WidgetConfig): void {
    if (this.root) {
      this.update(config)
      return
    }

    // Create container
    this.container = document.createElement('div')
    this.container.id = 'veiled-sign-in-widget-root'
    target.appendChild(this.container)

    // Create React root
    this.root = createRoot(this.container)
    this.config = config

    // Render widget
    this.root.render(
      <SignInWidget
        ref={this.widgetRef}
        veiled={this.veiled}
        config={config}
        onClose={() => this.destroy()}
      />
    )
  }

  update(config: WidgetConfig): void {
    if (!this.root || !this.config) {
      throw new Error('Widget not mounted. Call mount() first.')
    }

    this.config = { ...this.config, ...config }
    this.widgetRef.current?.updateConfig(this.config)
  }

  destroy(): void {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    if (this.container) {
      this.container.remove()
      this.container = null
    }
    this.config = null
    this.widgetRef.current = null
  }

  open(): void {
    this.widgetRef.current?.open()
  }

  close(): void {
    this.widgetRef.current?.close()
  }

  retry(): void {
    this.widgetRef.current?.retry()
  }

  getState(): WidgetState {
    return this.widgetRef.current?.getState() || 'IDLE'
  }

  getProgress(): number {
    return this.widgetRef.current?.getProgress() || 0
  }

  getSession(): Session | null {
    return this.veiled.getSession()
  }
}

export function createSignInWidget(veiled: VeiledAuth): WidgetInstance {
  return new SignInWidgetAPI(veiled)
}
```

---

## Widget Component Architecture

### React Component Structure

```typescript
// packages/core/src/ui/sign-in-widget.tsx

'use client'

import React, { useReducer, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { VeiledAuth, type SignInOptions, type Session, type Permission } from '../types.js'
import type { WidgetConfig, WidgetState, WidgetStateData } from '../types/widget.js'
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

export const SignInWidget = forwardRef<SignInWidgetRef, SignInWidgetProps>(
  ({ veiled, config, onClose }, ref) => {
    const [state, dispatch] = useReducer(widgetReducer, initialState)
    const cancellationToken = useRef<{ cancelled: boolean }>({ cancelled: false })
    const signInPromise = useRef<Promise<Session> | null>(null)

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      updateConfig: (newConfig: WidgetConfig) => {
        // Update config and restart if needed
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
      getProgress: () => state.progress
    }))

    // Main sign-in flow
    useEffect(() => {
      if (state.currentState === 'WALLET_CONNECT') {
        handleSignIn()
      }
    }, [state.currentState])

    const handleSignIn = async () => {
      try {
        cancellationToken.current.cancelled = false

        // Create progress callback
        const progress = createProgressCallback(dispatch, cancellationToken)

        // Prepare sign-in options
        const signInOptions: SignInOptions = {
          requirements: config.requirements,
          domain: config.domain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
          permissions: config.permissions,
          expiry: config.expiry
        }

        // Call signIn with progress
        signInPromise.current = veiled.signIn(signInOptions, progress)
        const session = await signInPromise.current

        // Success
        dispatch({ type: 'SET_SESSION', session })
        dispatch({ type: 'SET_STATE', state: 'SUCCESS' })
        config.onSuccess?.(session)

        // Auto-close
        if (config.autoClose !== false) {
          setTimeout(() => {
            dispatch({ type: 'RESET' })
            onClose?.()
          }, config.closeDelay || 2000)
        }

      } catch (error) {
        if (cancellationToken.current.cancelled) {
          return // User cancelled, don't show error
        }

        const err = error instanceof Error ? error : new Error(String(error))
        dispatch({ type: 'SET_ERROR', error: err, stage: state.currentState })
        config.onError?.(err)
      }
    }

    // Render based on state
    return (
      <div className="veiled-widget">
        {state.currentState === 'IDLE' && <IdleScreen />}
        {state.currentState === 'WALLET_CONNECT' && <WalletConnectScreen />}
        {state.currentState === 'REQUIREMENTS_CHECK' && <RequirementsCheckScreen />}
        {state.currentState === 'WALLET_PROOF' && <WalletProofScreen />}
        {state.currentState === 'PROOF_GENERATION' && <ProofGenerationScreen />}
        {state.currentState === 'PROOF_VERIFICATION' && <ProofVerificationScreen />}
        {state.currentState === 'VERIFICATION_RESULT' && <VerificationResultScreen />}
        {state.currentState === 'ON_CHAIN_SUBMISSION' && <OnChainSubmissionScreen />}
        {state.currentState === 'PERMISSIONS_REQUEST' && <PermissionsRequestScreen />}
        {state.currentState === 'GRANT_PERMISSIONS' && <GrantPermissionsScreen />}
        {state.currentState === 'SUCCESS' && <SuccessScreen />}
        {state.currentState === 'ERROR' && <ErrorScreen />}
      </div>
    )
  }
)
```

### Progress Callback Factory

```typescript
function createProgressCallback(
  dispatch: React.Dispatch<WidgetAction>,
  cancellationToken: React.MutableRefObject<{ cancelled: boolean }>
): ProgressCallback {
  return {
    onStageChange: (stage: ProgressStage, data?: any) => {
      if (cancellationToken.current.cancelled) return

      const widgetState = mapProgressStageToWidgetState(stage)
      dispatch({ type: 'SET_STATE', state: widgetState })

      // Update state-specific data
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
    }
  }
}

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
    success: 'SUCCESS'
  }
  return mapping[stage] || 'ERROR'
}
```

---

## Progress Callback System

### Integration into VeiledAuth.signIn()

**File:** `packages/core/src/veiled-auth.ts`

**Changes Required:**

1. **Add ProgressCallback type import**
```typescript
import type { ProgressCallback } from './types/widget.js'
```

2. **Modify signIn signature**
```typescript
async signIn(
  options: SignInOptions,
  progress?: ProgressCallback
): Promise<Session>
```

3. **Add progress emissions at each stage**

**Example for wallet connect:**
```typescript
// Before
if (!this.walletAdapter.connected) {
  await this.walletAdapter.connect()
}

// After
progress?.onStageChange?.('wallet_connect')
if (!this.walletAdapter.connected) {
  progress?.onProgress?.(0, 'Connecting wallet...')
  await this.walletAdapter.connect()
  progress?.onProgress?.(100, 'Wallet connected')
  progress?.onStageChange?.('wallet_connect', {
    walletAddress: this.walletAdapter.publicKey?.toBase58()
  })
}
```

**Example for proof generation:**
```typescript
// Before
proofResult = await generateProof(proofInputs, circuitType)

// After
progress?.onStageChange?.('proof_generation')
progress?.onProgress?.(0, 'Generating zero-knowledge proof...')

// Simulate progress (proof generation is async, can't track real progress)
let progressInterval: NodeJS.Timeout | null = null
if (progress?.onProgress) {
  let simulatedProgress = 0
  progressInterval = setInterval(() => {
    simulatedProgress = Math.min(simulatedProgress + 10, 90)
    progress.onProgress?.(simulatedProgress, 'Generating proof...')
  }, 200)
}

try {
  proofResult = await generateProof(proofInputs, circuitType)
  if (progressInterval) clearInterval(progressInterval)
  progress?.onProgress?.(100, 'Proof generated')
} catch (error) {
  if (progressInterval) clearInterval(progressInterval)
  progress?.onError?.(error instanceof Error ? error : new Error(String(error)), 'proof_generation')
  throw error
}
```

### Progress Tracking Strategy

**Real Progress (where measurable):**
- Balance fetch: 0% → 50% → 100%
- NFT fetch: 0% → 50% → 100%
- Proof verification: 0% → 100%

**Simulated Progress (where not measurable):**
- Proof generation: 0% → 10% → 20% → ... → 90% → 100% (simulated, ~2-3s)
- On-chain submission: 0% → 50% → 100% (estimated)

**Stage Changes (discrete):**
- Each major stage transition emits `onStageChange()`

---

## Error Handling Strategy

### Error Types

```typescript
enum ErrorType {
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  WALLET_REJECTED = 'WALLET_REJECTED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  NFT_NOT_FOUND = 'NFT_NOT_FOUND',
  BALANCE_FETCH_FAILED = 'BALANCE_FETCH_FAILED',
  NFT_FETCH_FAILED = 'NFT_FETCH_FAILED',
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
  PROOF_VERIFICATION_FAILED = 'PROOF_VERIFICATION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  PERMISSION_GRANT_FAILED = 'PERMISSION_GRANT_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Error Recovery

**Retryable Errors:**
- Wallet connection failed → Retry `WALLET_CONNECT`
- Balance fetch failed → Retry `REQUIREMENTS_CHECK`
- NFT fetch failed → Retry `REQUIREMENTS_CHECK`
- Proof generation failed → Retry `PROOF_GENERATION`
- Transaction failed → Retry `ON_CHAIN_SUBMISSION`
- Permission grant failed → Retry `GRANT_PERMISSIONS`

**Non-Retryable Errors:**
- Insufficient balance → Show error, close modal
- NFT not found → Show error, close modal
- Invalid proof → Show error, close modal (should never happen)

### Error UI

```typescript
interface ErrorDisplay {
  title: string
  message: string
  explanation: string
  retryable: boolean
  retryAction?: () => void
}

function getErrorDisplay(error: Error, stage: WidgetState): ErrorDisplay {
  // Map error types to user-friendly messages
  if (error.message.includes('Phantom') || error.message.includes('not found')) {
    return {
      title: 'Wallet Not Found',
      message: 'Phantom wallet not installed',
      explanation: 'Please install Phantom wallet from https://phantom.app',
      retryable: false
    }
  }

  if (error.message.includes('insufficient balance')) {
    return {
      title: 'Insufficient Balance',
      message: 'You don\'t have enough SOL',
      explanation: `Required: ${minimumBalance} lamports`,
      retryable: false
    }
  }

  // ... more error mappings

  return {
    title: 'Something Went Wrong',
    message: error.message,
    explanation: 'Please try again or contact support',
    retryable: true,
    retryAction: () => {
      // Retry from error stage
    }
  }
}
```

---

## Demo App Replacement

### Current Structure

```
apps/demo/
├── src/routes/+page.svelte      # Current demo (DELETE)
├── external/
│   ├── chat/                    # Next.js chat app (MOVE TO ROOT)
│   └── widget/                  # React widget (KEEP AS REFERENCE)
└── ...
```

### Target Structure

```
apps/demo/
├── app/                         # Next.js app directory
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── chat-interface.tsx
├── package.json                 # Update dependencies
└── ...                          # Other Next.js files
```

### Migration Steps

#### Step 1: Backup Current Demo
```bash
# Create backup
cp -r apps/demo apps/demo-backup
```

#### Step 2: Move Chat App
```bash
# Move chat app to root
mv apps/demo/external/chat/* apps/demo/
rm -rf apps/demo/external/chat
```

#### Step 3: Update Package.json
```json
{
  "name": "demo",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@veiled/core": "workspace:*",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

#### Step 4: Update Imports
- Update all imports from `@/components/...` to relative paths if needed
- Add Veiled widget integration to chat interface

#### Step 5: Integrate Widget
```typescript
// components/chat-interface.tsx
import { VeiledAuth, createSignInWidget } from '@veiled/core'

// In component
useEffect(() => {
  const veiled = new VeiledAuth({ /* config */ })
  const widget = veiled.renderButton('#sign-in-button', {
    requirements: { wallet: true },
    onSuccess: (session) => {
      // Set session, enable chat
    }
  })
}, [])
```

### Chat App Integration Points

**Where to add widget:**
1. **Login screen** - Show "Sign in with Veiled" button
2. **Chat header** - Show nullifier if signed in
3. **Settings** - Show session info, sign out option

**Session management:**
```typescript
// lib/session.ts
import { VeiledAuth } from '@veiled/core'

let veiledInstance: VeiledAuth | null = null

export function getVeiled(): VeiledAuth {
  if (!veiledInstance) {
    veiledInstance = new VeiledAuth({ /* config */ })
  }
  return veiledInstance
}

export function getSession() {
  return getVeiled().getSession()
}

export function signOut() {
  return getVeiled().signOut()
}
```

---

## Testing Strategy

### Unit Tests

**File:** `packages/core/src/ui/__tests__/sign-in-widget.test.tsx`

**Test Cases:**
1. Widget state transitions
2. Progress callback emissions
3. Error handling and recovery
4. Session management
5. Navigation rules

### Integration Tests

**File:** `packages/core/src/__tests__/veiled-auth-widget.test.ts`

**Test Cases:**
1. `renderButton()` creates button and widget
2. `openAuthModal()` opens modal
3. `getSession()` returns current session
4. Full sign-in flow with widget
5. Error recovery flow

### E2E Tests

**File:** `apps/demo/e2e/widget.test.ts`

**Test Cases:**
1. Click button → modal opens
2. Connect wallet → requirements check
3. Generate proof → success
4. Error → retry → success
5. Permissions → grant → success

### Manual Testing Checklist

- [ ] Button renders correctly
- [ ] Modal opens on click
- [ ] Wallet connection works
- [ ] Requirements check works (balance/NFT)
- [ ] Proof generation shows progress
- [ ] Success screen appears
- [ ] Auto-close works
- [ ] Error states show correctly
- [ ] Retry works
- [ ] Cancel works
- [ ] Permissions flow works
- [ ] Mobile responsive
- [ ] Styles load correctly

---

## Migration Path

### Phase 1: SDK Enhancement (Week 1)

1. Add progress callbacks to `VeiledAuth.signIn()`
2. Create widget types (`types/widget.ts`)
3. Create React component (`sign-in-widget.tsx`)
4. Create API wrapper (`sign-in-widget-api.ts`)
5. Add syntactic sugar methods to `VeiledAuth`
6. Export from `index.ts`

**Deliverable:** Widget works programmatically

### Phase 2: UI Implementation (Week 2)

1. Extract styles from widget design
2. Create CSS file (`sign-in-widget.css`)
3. Implement all state screens
4. Add animations and transitions
5. Test responsive design

**Deliverable:** Widget looks and feels polished

### Phase 3: Demo App Replacement (Week 3)

1. Move chat app to demo root
2. Update dependencies
3. Integrate widget into chat
4. Test full flow
5. Update documentation

**Deliverable:** Demo app uses new widget

### Phase 4: Documentation & Polish (Week 4)

1. Update README with widget usage
2. Create widget API documentation
3. Add examples
4. Final testing
5. Release

**Deliverable:** Production-ready widget

---

## Implementation Checklist

### SDK Core
- [ ] Add `ProgressCallback` type
- [ ] Modify `VeiledAuth.signIn()` to accept progress callback
- [ ] Emit progress events at each stage
- [ ] Add `renderButton()` method
- [ ] Add `openAuthModal()` method
- [ ] Expose `getSession()` publicly
- [ ] Export widget types

### Widget Component
- [ ] Create `sign-in-widget.tsx`
- [ ] Implement state machine reducer
- [ ] Create all state screen components
- [ ] Integrate with `VeiledAuth.signIn()`
- [ ] Add progress tracking
- [ ] Add error handling
- [ ] Add navigation logic
- [ ] Add cancellation support

### Widget Styles
- [ ] Create `sign-in-widget.css`
- [ ] Extract styles from widget design
- [ ] Add modal styles
- [ ] Add state-specific styles
- [ ] Add progress bar styles
- [ ] Add error styles
- [ ] Add success styles
- [ ] Add responsive styles
- [ ] Add animations

### Widget API
- [ ] Create `sign-in-widget-api.ts`
- [ ] Implement `createSignInWidget()`
- [ ] Implement `mount()`, `update()`, `destroy()`
- [ ] Implement state queries
- [ ] Implement actions (open, close, retry)

### Demo App
- [ ] Backup current demo
- [ ] Move chat app to root
- [ ] Update package.json
- [ ] Update imports
- [ ] Integrate widget
- [ ] Test full flow
- [ ] Update documentation

### Testing
- [ ] Unit tests for widget
- [ ] Unit tests for API
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing checklist

### Documentation
- [ ] Update main README
- [ ] Create widget API docs
- [ ] Add usage examples
- [ ] Add migration guide
- [ ] Update CHANGELOG

---

## Risk Assessment

### High Risk
- **Progress callback integration** - Complex, touches core auth flow
- **State machine complexity** - Many states, many transitions
- **Error recovery** - Must preserve state correctly

### Medium Risk
- **CSS bundling** - Styles must be self-contained
- **React integration** - Framework-agnostic API with React internals
- **Demo app migration** - Moving Next.js app structure

### Low Risk
- **Syntactic sugar methods** - Simple wrappers
- **Type definitions** - Straightforward
- **Documentation** - Standard updates

### Mitigation Strategies
- **Incremental implementation** - One feature at a time
- **Comprehensive testing** - Unit, integration, E2E
- **Backup before changes** - Always have rollback plan
- **Code reviews** - Get feedback before merging

---

## Success Criteria

### Functional
- [ ] Widget renders and works in all states
- [ ] Progress tracking works correctly
- [ ] Error recovery works
- [ ] Session management works
- [ ] All syntactic sugar methods work

### UX
- [ ] Modal flow is smooth
- [ ] Progress indication is clear
- [ ] Error messages are helpful
- [ ] Success state is satisfying
- [ ] Mobile experience is good

### Developer Experience
- [ ] API is intuitive
- [ ] Documentation is clear
- [ ] Examples are helpful
- [ ] Types are complete
- [ ] Errors are actionable

### Performance
- [ ] Widget loads quickly
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Efficient state updates

---

## Conclusion

This plan covers:
- ✅ Complete architecture
- ✅ All file changes
- ✅ SDK integration points
- ✅ State machine design
- ✅ API design
- ✅ Widget component structure
- ✅ Progress callback system
- ✅ Error handling
- ✅ Demo app replacement
- ✅ Testing strategy
- ✅ Migration path
- ✅ Implementation checklist

**Next Steps:**
1. Review and approve plan
2. Start Phase 1 (SDK Enhancement)
3. Iterate based on feedback
4. Complete all phases
5. Release

**Estimated Timeline:** 4 weeks
**Complexity:** High
**Dependencies:** None (self-contained)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-27
**Status:** Ready for Implementation
