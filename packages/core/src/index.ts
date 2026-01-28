export { VeiledAuth } from './veiled-auth.js';
export type {
  AuthResult,
  SignInOptions,
  VeiledConfig,
  VeiledRequirements,
  VeiledRpcProvider,
  Permission,
  PermissionRequest,
  PermissionGrant,
  PermissionAccess,
  Session
} from './types.js';
export { PermissionModal } from './ui/permission-modal.js';
export type { WalletAdapter } from './wallet/adapter.js';
export { getWalletProof, prepareSecretKeyFromSignature } from './wallet/adapter.js';
export { createSolanaWalletAdapter } from './wallet/solana-adapter.js';
export type { CompiledCircuit, CircuitABI } from './proof/circuit-loader.js';
export { loadCircuit, generateWitness } from './proof/circuit-loader.js';
export type { ProofInputs, ProofResult } from './proof/generator.js';
export { 
  prepareProofInputs, 
  generateProof, 
  verifyProof,
  createVerificationResult,
  hashProofAsync,
  exportVerificationKey, 
  exportVerificationKeyAsJson 
} from './proof/generator.js';
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

