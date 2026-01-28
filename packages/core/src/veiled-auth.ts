import type { AuthResult, SignInOptions, VeiledConfig } from './types.js';
import { 
  prepareProofInputs, 
  generateProof, 
  verifyProof, 
  createVerificationResult,
  hashProofAsync
} from './proof/generator.js';
import type { WalletAdapter } from './wallet/adapter.js';
import { getWalletProof, prepareSecretKeyFromSignature } from './wallet/adapter.js';
import { submitVerificationResultToChain } from './solana/program.js';
import type { Connection } from '@solana/web3.js';
import type { Wallet } from '@coral-xyz/anchor';

/**
 * * Framework-agnostic SDK surface.
 * * Generates ZK proofs for privacy-preserving authentication
 */
export class VeiledAuth {
  readonly config: VeiledConfig;
  private walletAdapter: WalletAdapter | null = null;
  private connection: Connection | null = null;
  private wallet: Wallet | null = null;

  constructor(config: VeiledConfig) {
    this.config = config;
  }
  
  /**
   * * Sets the wallet adapter for signing
   * * Call this after wallet connects
   */
  setWalletAdapter(adapter: WalletAdapter): void {
    this.walletAdapter = adapter;
  }

  /**
   * * Sets Solana connection and wallet for on-chain operations
   * * Required for proof submission to Anchor program
   */
  setSolanaConnection(connection: Connection, wallet: Wallet): void {
    this.connection = connection;
    this.wallet = wallet;
  }

  async signIn(options: SignInOptions): Promise<AuthResult> {
    if (!this.walletAdapter) {
      throw new Error('Wallet not connected. Call setWalletAdapter() first.');
    }

    if (!this.walletAdapter.connected) {
      await this.walletAdapter.connect();
    }
    
    // * Get proof of wallet ownership via message signing
    const walletProof = await getWalletProof(this.walletAdapter, options.domain);
    
    // * Prepare secret key material from signature
    // TODO: Update circuit to verify signature directly instead of using secret key
    const walletSecretKey = prepareSecretKeyFromSignature(
      walletProof.signature,
      walletProof.message
    );
    
    // * Prepare proof inputs (matches circuit structure)
    const proofInputs = await prepareProofInputs(options, walletSecretKey);
    
    // * Generate ZK proof using Noir circuit
    const proofResult = await generateProof(proofInputs);
    
    // * Verify proof off-chain using WASM backend
    console.log('🔐 Verifying proof off-chain...');
    let isValid: boolean;
    try {
      isValid = await verifyProof(proofResult.proof);
      
      if (!isValid) {
        throw new Error('Proof verification failed. The generated proof is invalid.');
      }
      
      console.log('✅ Proof verified successfully!');
    } catch (error) {
      // * Verification failed - reject the proof
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Proof verification failed: ${message}. Cannot proceed with invalid proof.`);
    }
    
    // * Convert proof bytes to hex string for storage/transmission
    const proofHex = '0x' + Array.from(proofResult.proof)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // * Submit verification result to Anchor program if connection is available
    let txSignature: string | undefined;
    if (this.connection && this.wallet) {
      try {
        // * Sign the verification result message for additional security
        // * Message format: proof_hash (32) + is_valid (1) + timestamp (8) = 41 bytes
        const proofHash = await hashProofAsync(proofResult.proof);
        const timestamp = BigInt(Math.floor(Date.now() / 1000));
        
        // * Create message to sign
        const messageToSign = new Uint8Array(41);
        messageToSign.set(proofHash, 0);
        messageToSign[32] = isValid ? 1 : 0;
        const timestampBytes = new Uint8Array(8);
        const timestampView = new DataView(timestampBytes.buffer);
        timestampView.setBigUint64(0, timestamp, true); // little-endian
        messageToSign.set(timestampBytes, 33);
        
        // * Sign the message using wallet adapter
        let signature: Uint8Array;
        if (this.walletAdapter && typeof this.walletAdapter.signMessage === 'function') {
          signature = await this.walletAdapter.signMessage(messageToSign);
          
          // * Ensure signature is 64 bytes (Ed25519 signature length)
          if (signature.length !== 64) {
            // * If signature is longer, take first 64 bytes
            // * If shorter, pad with zeros (shouldn't happen with Ed25519)
            const paddedSignature = new Uint8Array(64);
            paddedSignature.set(signature.slice(0, 64));
            signature = paddedSignature;
          }
        } else {
          // * Fallback: Use placeholder if signMessage not available
          // * Anchor's Signer constraint still validates transaction signature
          console.warn('Wallet adapter does not support signMessage, using placeholder signature');
          signature = new Uint8Array(64);
        }
        
        // * Create verification result with actual signature
        const verificationResult = await createVerificationResult(
          proofResult.proof,
          isValid,
          signature
        );
        
        const submitResult = await submitVerificationResultToChain({
          verificationResult,
          nullifier: proofResult.publicInputs.nullifier,
          domain: options.domain,
          connection: this.connection,
          wallet: this.wallet
        });
        txSignature = submitResult.signature;
      } catch (error) {
        // * Log error but don't fail the auth flow
        console.warn('Failed to submit verification result to chain:', error);
      }
    }

    return {
      success: true,
      nullifier: proofResult.publicInputs.nullifier,
      proof: proofHex,
      commitment: proofResult.publicInputs.walletPubkeyHash,
      txSignature
    };
  }

  async verifySession(nullifier: string): Promise<{ valid: boolean; expired?: boolean }> {
    // * Query on-chain nullifier registry to verify session
    if (!this.connection) {
      throw new Error('Connection not set. Call setSolanaConnection() first.');
    }
    
    try {
      const { verifyNullifierOnChain, VEILED_PROGRAM_ID } = await import('./solana/program.js');
      const { Program } = await import('@coral-xyz/anchor');
      
      // * Load IDL to fetch account data
      let program: any = null;
      try {
        const { loadIdl } = await import('./solana/program.js');
        const idl = await loadIdl();
        if (idl && this.wallet) {
          const { AnchorProvider } = await import('@coral-xyz/anchor');
          const provider = new AnchorProvider(this.connection, this.wallet, {
            commitment: 'confirmed'
          });
          program = new Program(idl, provider);
        }
      } catch (idlError) {
        // * IDL loading failed, will use fallback
      }
      
      const result = await verifyNullifierOnChain(this.connection, nullifier, program);
      
      if (!result.exists) {
        return { valid: false };
      }
      
      // * Check if session has expired
      if (result.expired) {
        return { valid: false, expired: true };
      }
      
      // * If expiresAt is available, double-check expiry
      if (result.expiresAt !== undefined) {
        const now = Math.floor(Date.now() / 1000);
        if (result.expiresAt < now) {
          return { valid: false, expired: true };
        }
      }
      
      return { valid: true };
    } catch (error) {
      // * If query fails, assume invalid
      console.warn('Failed to verify session on-chain:', error);
      return { valid: false };
    }
  }

  async signOut(): Promise<void> {
    // TODO: Support session expiry / revocation where applicable.
  }
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Browser (WebCrypto)
  if (globalThis.crypto?.subtle?.digest) {
    // * Ensure data is properly typed for WebCrypto
    // * Create a new ArrayBuffer to avoid SharedArrayBuffer issues
    const dataBuffer = new Uint8Array(data).buffer;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    return bufferToHex(new Uint8Array(digest));
  }

  // Node.js fallback
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(data).digest();
  return bufferToHex(hash);
}

function bufferToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return `0x${out}`;
}

