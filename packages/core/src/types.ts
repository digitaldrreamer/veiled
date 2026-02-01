import type { WalletAdapter as SolanaWalletAdapter } from '@solana/wallet-adapter-base';
import type { WalletAdapter } from './wallet/adapter.js';

export type VeiledRpcProvider = 'helius' | 'quicknode' | 'custom';

// * Future-proof chain type - currently only Solana is supported
// * Future: extend to 'ethereum' | 'polygon' | etc.
export type VeiledChain = 'solana';

export type VeiledRequirements = {
  wallet: true;
  nft?: {
    /** Collection identifier; for now, treated as an opaque string */
    collection: string;
  };
  balance?: {
    /** Minimum amount required (unit depends on token) */
    minimum: number;
    /** Token mint address; omit for SOL */
    token?: string;
  };
};

export type VeiledConfig = {
  /** Blockchain to use - currently only 'solana' is supported */
  chain: VeiledChain;
  rpcProvider: VeiledRpcProvider;
  
  /** 
   * Primary RPC URL (takes precedence over rpcProvider)
   * For Helius: Use Secure URL format (e.g., https://abc-456-fast-devnet.helius-rpc.com)
   *   - Safe to expose in frontend (no API key needed)
   *   - IP rate-limited at 5 TPS
   * For Quicknode: Use your endpoint URL
   * For custom: Use any Solana RPC endpoint
   */
  rpcUrl?: string;
  
  /** Legacy: API key-based configuration (for non-secure URLs) */
  rpcApiKey?: string;
  
  /** 
   * Helius API key for balance queries (balance_range circuit)
   * Only needed if using API key method instead of Secure URL
   * If rpcUrl is a Helius Secure URL, this is not needed
   */
  heliusApiKey?: string;
  
  /** Quicknode API key and endpoint for NFT queries (nft_ownership circuit) */
  quicknodeApiKey?: string;
  quicknodeEndpoint?: string;
  
  /** Program ID as base58 string; optional until Anchor integration exists */
  programId?: string;
  /** Optional wallet adapter - can be a Veiled WalletAdapter or a Solana wallet adapter */
  wallet?: WalletAdapter | SolanaWalletAdapter;
};

export type SignInOptions = {
  requirements: VeiledRequirements;
  /** Domain for nullifier scoping (e.g., "myapp.com") */
  domain: string;
  /** Optional session expiry in seconds */
  expiry?: number;
  /** Optional permission request for this session */
  permissions?: PermissionRequest;
};

export type AuthResult = {
  success: boolean;
  /** Domain-scoped identifier */
  nullifier: string;
  /** Placeholder until Noir + Anchor plumbing is implemented */
  proof?: string;
  /** Placeholder until Noir + Anchor plumbing is implemented */
  commitment?: string;
  /** Placeholder until Anchor tx submission exists */
  txSignature?: string;
};

// * Permission system types
export enum Permission {
  RevealWalletAddress = 'reveal_wallet_address',
  RevealExactBalance = 'reveal_exact_balance',
  RevealTokenBalances = 'reveal_token_balances',
  RevealNFTList = 'reveal_nft_list',
  RevealTransactionHistory = 'reveal_transaction_history',
  RevealStakingPositions = 'reveal_staking_positions',
  RevealDeFiPositions = 'reveal_defi_positions',
  SignTransactions = 'sign_transactions',
}

export interface PermissionRequest {
  permissions: Permission[];
  reason?: string;
  duration?: number; // * Seconds, default 3600 (1 hour)
}

export interface PermissionGrant {
  nullifier: string;
  appId: string;
  permissions: Permission[];
  grantedAt: number;
  expiresAt: number;
  revoked: boolean;
}

export interface PermissionAccess {
  permission: Permission;
  accessedAt: number;
  metadata?: string;
}

// * Session extends AuthResult with permission information
export interface Session extends AuthResult {
  verified: boolean;
  permissions: Permission[];
  expiresAt: number;
  /** Balance range bucket (0-3) when using balance_range circuit */
  balanceRangeBucket?: number;
}
