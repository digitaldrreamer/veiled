// * Solana wallet adapter wrapper
// * Bridges @solana/wallet-adapter-base to our WalletAdapter interface

import type { WalletAdapter as SolanaWalletAdapter } from '@solana/wallet-adapter-base';
import type { PublicKey } from '@solana/web3.js';
import type { WalletAdapter } from './adapter.js';

/**
 * * Wraps a Solana wallet adapter to match our WalletAdapter interface
 * * This allows us to use any Solana wallet adapter with Veiled
 */
export function createSolanaWalletAdapter(
  adapter: SolanaWalletAdapter
): WalletAdapter {
  return {
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
    }
  };
}
