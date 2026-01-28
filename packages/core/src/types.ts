export type VeiledRpcProvider = 'helius' | 'quicknode' | 'custom';

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
  rpcProvider: VeiledRpcProvider;
  rpcApiKey?: string;
  rpcUrl?: string;
  /** Program ID as base58 string; optional until Anchor integration exists */
  programId?: string;
};

export type SignInOptions = {
  requirements: VeiledRequirements;
  /** Domain for nullifier scoping (e.g., "myapp.com") */
  domain: string;
  /** Optional session expiry in seconds */
  expiry?: number;
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
}
