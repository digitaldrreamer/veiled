export { VeiledAuth } from './veiled-auth.js';
export type {
  AuthResult,
  SignInOptions,
  VeiledConfig,
  VeiledRequirements,
  VeiledRpcProvider,
  VeiledChain,
  PermissionRequest,
  PermissionGrant,
  PermissionAccess,
  Session
} from './types.js';
export { Permission } from './types.js';
export { PermissionModal } from './ui/permission-modal.js';
export type { WalletAdapter } from './wallet/adapter.js';
export { getWalletProof, prepareSecretKeyFromSignature } from './wallet/adapter.js';
export { createSolanaWalletAdapter, adaptSolanaWallet } from './wallet/solana-adapter.js';
export type { CompiledCircuit, CircuitABI } from './proof/circuit-loader.js';
export { loadCircuit } from './proof/circuit-loader.js';
export type { ProofInputs, ProofResult, NFTOwnershipProofInputs } from './proof/generator.js';
export { 
  prepareProofInputs, 
  generateProof, 
  verifyProof,
  createVerificationResult,
  hashProofAsync,
  exportVerificationKey, 
  exportVerificationKeyAsJson 
} from './proof/generator.js';

// * Export DAS types for external use
export type {
  DasAssetItem,
  DasGetAssetsByOwnerResponse,
  DasGrouping,
  DasContent,
  DasOwnership,
  DasCompression
} from './providers/quicknode-client.js';
export { 
  submitVerificationResultToChain,
  submitProofToChain, // * Deprecated
  verifyNullifierOnChain 
} from './solana/program.js';
export type { 
  SubmitVerificationResultOptions,
  SubmitVerificationResultResponse,
  SubmitProofOptions, // * Deprecated
  SubmitProofResult 
} from './solana/program.js';

// * Widget exports
export type {
  WidgetConfig,
  WidgetInstance,
  WidgetState,
  WidgetStateData,
  ProgressCallback,
  ProgressStage
} from './types/widget.js';
export { createSignInWidget, renderButton, openAuthModal } from './ui/sign-in-widget-api.js';
// * Note: SignInWidgetRef is intentionally NOT exported - it's a React implementation detail