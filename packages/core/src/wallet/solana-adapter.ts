// * Solana wallet adapter wrapper
// * Bridges @solana/wallet-adapter-base to our WalletAdapter interface

import type { WalletAdapter as SolanaWalletAdapter } from '@solana/wallet-adapter-base';
import type { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { WalletAdapter } from './adapter.js';

/**
 * * Solana wallet adapter that supports transaction signing (required for Anchor Wallet)
 * * This is a subset of SolanaWalletAdapter that includes the transaction signing methods
 */
export interface SolanaTransactionSigningAdapter {
  signTransaction(tx: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
  signAllTransactions(txs: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]>;
}

/**
 * * Extended WalletAdapter that preserves access to Solana-specific methods
 * * Needed for creating Anchor Wallet instances for on-chain operations
 */
export interface SolanaWalletAdapterWrapper extends WalletAdapter {
  readonly __solanaAdapter: SolanaWalletAdapter & Partial<SolanaTransactionSigningAdapter>;
  signTransaction?(tx: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
  signAllTransactions?(txs: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]>;
}

/**
 * * Type guard to check if adapter has Solana-specific transaction signing methods
 */
export function hasSolanaTransactionSigning(
  adapter: WalletAdapter | SolanaWalletAdapterWrapper
): adapter is SolanaWalletAdapterWrapper & {
  __solanaAdapter: SolanaWalletAdapter & SolanaTransactionSigningAdapter;
} {
  if (!('__solanaAdapter' in adapter) || !adapter.__solanaAdapter) {
    return false;
  }
  
  const solanaAdapter = adapter.__solanaAdapter;
  return (
    typeof solanaAdapter.signTransaction === 'function' &&
    typeof solanaAdapter.signAllTransactions === 'function'
  );
}

/**
 * * Wraps a Solana wallet adapter to match our WalletAdapter interface
 * * This allows us to use any Solana wallet adapter with Veiled
 */
export function createSolanaWalletAdapter(
  adapter: SolanaWalletAdapter
): SolanaWalletAdapterWrapper {
  const wrapped: SolanaWalletAdapterWrapper = {
    get publicKey(): PublicKey | null {
      return adapter.publicKey;
    },
    
    get connected(): boolean {
      return adapter.connected;
    },
    
    async connect(): Promise<void> {
      if (!adapter.connected) {
        await adapter.connect();
      }
    },
    
    async disconnect(): Promise<void> {
      if (adapter.connected) {
        await adapter.disconnect();
      }
    },
    
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      if (!adapter.publicKey) {
        throw new Error('Wallet not connected');
      }
      
      // * Check if adapter supports signMessage
      if (!('signMessage' in adapter) || typeof adapter.signMessage !== 'function') {
        throw new Error('Wallet adapter does not support message signing');
      }
      
      // * Sign message using adapter
      const signature = await adapter.signMessage(message);
      
      // * Convert signature to Uint8Array if needed
      if (signature instanceof Uint8Array) {
        return signature;
      }
      
      // * Handle different signature formats
      if (Array.isArray(signature)) {
        return new Uint8Array(signature);
      }
      
      throw new Error('Unsupported signature format');
    },
    
    // * Store reference to original adapter for signTransaction/signAllTransactions access
    __solanaAdapter: adapter,
    
    // * Expose Solana transaction signing methods if available on underlying adapter
    // * These are optional on the wrapper but required for Anchor Wallet creation
    signTransaction: 'signTransaction' in adapter && typeof adapter.signTransaction === 'function'
      ? async (tx: Transaction | VersionedTransaction) => {
          // * Type assertion: we've checked the method exists, but TypeScript doesn't know it's on the base type
          const signingAdapter = adapter as unknown as SolanaTransactionSigningAdapter;
          return await signingAdapter.signTransaction(tx);
        }
      : undefined,
    
    signAllTransactions: 'signAllTransactions' in adapter && typeof adapter.signAllTransactions === 'function'
      ? async (txs: (Transaction | VersionedTransaction)[]) => {
          // * Type assertion: we've checked the method exists, but TypeScript doesn't know it's on the base type
          const signingAdapter = adapter as unknown as SolanaTransactionSigningAdapter;
          return await signingAdapter.signAllTransactions(txs);
        }
      : undefined,
  };
  
  return wrapped;
}

/**
 * * Auto-adapts a Solana wallet to Veiled's WalletAdapter interface
 * * Accepts either a Veiled WalletAdapter (returns as-is) or a Solana wallet adapter (wraps it)
 * * This enables developers to pass Solana wallets directly without manual bridging
 */
export function adaptSolanaWallet(
  wallet: WalletAdapter | SolanaWalletAdapter
): WalletAdapter {
  // * Already a Veiled WalletAdapter? Return as-is
  if (
    wallet &&
    typeof (wallet as WalletAdapter).signMessage === 'function' &&
    'publicKey' in wallet &&
    'connected' in wallet
  ) {
    // * Check if it's already our interface (has all required methods)
    const adapter = wallet as WalletAdapter;
    if (
      typeof adapter.connect === 'function' &&
      typeof adapter.disconnect === 'function'
    ) {
      return adapter;
    }
  }

  // * Wrap Solana wallet adapter
  return createSolanaWalletAdapter(wallet as SolanaWalletAdapter);
}
