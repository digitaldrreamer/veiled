// * Widget-specific types for the sign-in widget
// * These types define the widget's state machine, configuration, and API

import type { VeiledRequirements, PermissionRequest, Session, Permission } from '../types.js';

/**
 * * Progress stages during sign-in flow
 * * Each stage represents a major step in the authentication process
 */
export type ProgressStage =
  | 'wallet_connect'
  | 'requirements_check'
  | 'wallet_proof'
  | 'proof_generation'
  | 'proof_verification'
  | 'verification_signature'
  | 'on_chain_submission'
  | 'permissions_request'
  | 'grant_permissions'
  | 'success';

/**
 * * Widget states for the UI state machine
 * * Maps to ProgressStage but includes IDLE and ERROR states
 */
export type WidgetState =
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
  | 'ERROR';                  // Error screen with retry

/**
 * * Progress callback interface
 * * Used to track progress during VeiledAuth.signIn()
 */
export interface ProgressCallback {
  /**
   * * Called when transitioning between major stages
   * * @param stage - The current progress stage
   * @param data - Optional data associated with the stage (wallet address, balance, etc.)
   */
  onStageChange?: (stage: ProgressStage, data?: any) => void;

  /**
   * * Called for progress updates within a stage (0-100)
   * * @param progress - Progress percentage (0-100)
   * @param message - Optional progress message
   */
  onProgress?: (progress: number, message?: string) => void;

  /**
   * * Called when an error occurs during sign-in
   * * @param error - The error that occurred
   * @param stage - The stage where the error occurred
   */
  onError?: (error: Error, stage: ProgressStage) => void;

  /**
   * * Called when the user cancels the sign-in flow
   */
  onCancel?: () => void;
}

/**
 * * Widget configuration options
 * * Passed to renderButton() or openAuthModal()
 */
export interface WidgetConfig {
  // * Requirements (same as SignInOptions)
  requirements: VeiledRequirements;

  // * Domain (same as SignInOptions)
  domain?: string; // Defaults to window.location.hostname

  // * Permissions (same as SignInOptions)
  permissions?: PermissionRequest;

  // * Session expiry (same as SignInOptions)
  expiry?: number;

  // * Callbacks
  onSuccess?: (session: Session) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;

  // * Optional: Customize button text
  buttonText?: string; // Default: '🔒 Sign in with Veiled'

  // * Optional: Customize modal behavior
  autoClose?: boolean; // Default: true
  closeDelay?: number; // Default: 2000ms
}

/**
 * * Widget state data structure
 * * Maintains all state information for the widget
 */
export interface WidgetStateData {
  currentState: WidgetState;
  previousState: WidgetState | null;
  error: Error | null;
  errorStage: WidgetState | null;
  progress: number;              // 0-100
  progressMessage: string | null;
  walletConnected: boolean;
  walletAddress: string | null;
  balance: number | null;
  nftCollection: string | null;
  proofGenerated: boolean;
  verificationSigned: boolean;
  transactionSubmitted: boolean;
  permissionsGranted: Permission[];
  session: Session | null;
}

/**
 * * Widget instance interface
 * * Returned from renderButton() and openAuthModal()
 */
export interface WidgetInstance {
  // * Lifecycle
  mount: (target: HTMLElement, config: WidgetConfig) => void;
  update: (config: WidgetConfig) => void;
  destroy: () => void;

  // * State queries
  getState: () => WidgetState;
  getProgress: () => number;
  getSession: () => Session | null;

  // * Actions
  open: () => void;
  close: () => void;
  retry: () => void;

  // * Internal methods (used by API functions, not part of public contract)
  setButton?: (element: HTMLElement) => void;
  setModalMode?: (isModal: boolean) => void;
  setModalContainer?: (container: HTMLElement) => void;

  // * For renderButton only
  button?: HTMLElement;
}
