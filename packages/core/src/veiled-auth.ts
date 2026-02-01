// * IMMEDIATE LOG - MODULE LOADED
console.log('🔵 [VEILED] ========================================');
console.log('🔵 [VEILED] veiled-auth.ts MODULE LOADED');
console.log('🔵 [VEILED] ========================================');
// * SUPER OBVIOUS - CANNOT MISS THIS
if (typeof window !== 'undefined') {
  console.error('🔴🔴🔴 VEILED-AUTH.TS LOADED 🔴🔴🔴');
  console.error('🔴🔴🔴 IF YOU SEE THIS, MODULE IS LOADING 🔴🔴🔴');
}

import type {
  AuthResult,
  SignInOptions,
  VeiledConfig,
  PermissionRequest,
  Permission,
  Session,
  VeiledRequirements
} from './types.js';
import { 
  prepareProofInputs, 
  generateProof, 
  verifyProof, 
  createVerificationResult,
  hashProofAsync
} from './proof/generator.js';
import { prepareBalanceRangeCircuitInputs, prepareNFTOwnershipCircuitInputs } from './proof/generator.js';
import { QuicknodeClient } from './providers/quicknode-client.js';
import type { WalletAdapter } from './wallet/adapter.js';
import { getWalletProof, prepareSecretKeyFromSignature } from './wallet/adapter.js';
import { adaptSolanaWallet } from './wallet/solana-adapter.js';
import {
  submitVerificationResultToChain,
  grantPermissionsOnChain,
  revokePermissionsOnChain,
  logPermissionAccessOnChain
} from './solana/program.js';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import type { Wallet } from '@coral-xyz/anchor';
import { PermissionModal } from './ui/permission-modal.js';

/**
 * * Framework-agnostic SDK surface.
 * * Generates ZK proofs for privacy-preserving authentication
 */
export class VeiledAuth {
  readonly config: VeiledConfig;
  private walletAdapter: WalletAdapter | null = null;
  private connection: Connection | null = null;
  private wallet: Wallet | null = null;
  private currentSession: Session | null = null;
  private currentDomain: string | null = null;

  constructor(config: VeiledConfig) {
    // * Future-proof chain validation - only Solana is supported for now
    if (config.chain !== 'solana') {
      throw new Error(
        `Unsupported chain "${config.chain}". This version of Veiled only supports "solana".`
      );
    }

    this.config = config;

    // * Auto-adapt Solana wallet if provided in config
    if (config.wallet) {
      try {
        this.walletAdapter = adaptSolanaWallet(config.wallet);
      } catch (error) {
        console.warn(
          '[Veiled] Failed to adapt wallet from config:',
          error instanceof Error ? error.message : String(error)
        );
        // * Don't throw - allow setWalletAdapter() to be called later
      }
    }
  }
  
  /**
   * * Sets the wallet adapter for signing
   * * Call this after wallet connects
   */
  setWalletAdapter(adapter: WalletAdapter): void {
    this.walletAdapter = adapter;
  }

  /**
   * * Creates Solana Connection from config
   * * Uses rpcUrl if provided (Helius Secure URL or custom), otherwise falls back to rpcProvider
   */
  private createSolanaConnection(): Connection {
    // * Priority 1: Use rpcUrl if provided (Helius Secure URL or custom endpoint)
    if (this.config.rpcUrl) {
      return new Connection(this.config.rpcUrl, 'confirmed');
    }
    
    // * Priority 2: Use rpcProvider to construct URL
    if (this.config.rpcProvider === 'helius' && this.config.heliusApiKey) {
      // * For now, default to devnet (can be made configurable later)
      const baseUrl = 'https://devnet.helius-rpc.com';
      return new Connection(`${baseUrl}/?api-key=${this.config.heliusApiKey}`, 'confirmed');
    }
    
    if (this.config.rpcProvider === 'quicknode' && this.config.quicknodeEndpoint) {
      return new Connection(this.config.quicknodeEndpoint, 'confirmed');
    }
    
    // * Fallback: Public RPC (for demo/testing)
    return new Connection(clusterApiUrl('devnet'), 'confirmed');
  }

  /**
   * * Sets Solana connection and wallet for on-chain operations
   * * Required for proof submission to Anchor program
   * * If connection is not provided, creates one from config
   */
  setSolanaConnection(connection?: Connection, wallet?: Wallet): void {
    if (connection && wallet) {
      this.connection = connection;
      this.wallet = wallet;
    } else if (wallet) {
      // * Auto-create connection from config if not provided
      this.connection = this.createSolanaConnection();
      this.wallet = wallet;
    } else if (connection) {
      this.connection = connection;
    }
  }

  async signIn(options: SignInOptions): Promise<Session> {
    console.log('🔵 [VEILED] ========================================');
    console.log('🔵 [VEILED] VeiledAuth.signIn() called');
    console.log('🔵 [VEILED] Options:', JSON.stringify(options, null, 2));
    
    if (!this.walletAdapter) {
      console.error('🔴 [VEILED] Wallet adapter not set!');
      throw new Error(
        'Wallet not connected. Pass `wallet` in VeiledAuth config or call setWalletAdapter() after your Solana wallet connects.'
      );
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
    
    // * Select circuit based on requirements
    const circuitType = this.selectCircuit(options.requirements);
    console.log('🔵 [VEILED] ========================================');
    console.log('🔵 [VEILED] Circuit Selection');
    console.log('🔵 [VEILED] Requirements:', JSON.stringify(options.requirements, null, 2));
    console.log('🔵 [VEILED] Selected Circuit:', circuitType);
    console.log('🔵 [VEILED] ========================================');

    let proofResult;
    let proofHex: string;
    let balanceRangeBucket: number | undefined;

    if (circuitType === 'balance_range') {
      console.log('🔵 [VEILED] Using balance_range circuit');
      // * Ensure wallet is set
      if (!this.wallet) {
        throw new Error('Wallet required for balance range proof. Call setSolanaConnection() with wallet.');
      }
      // * Auto-create connection from config if not set
      if (!this.connection) {
        this.connection = this.createSolanaConnection();
      }

      console.log('🔵 [VEILED] Preparing balance range circuit inputs...');
      const balanceInputs = await prepareBalanceRangeCircuitInputs(
        options,
        walletSecretKey,
        this.connection,
        this.wallet
      );
      console.log('🔵 [VEILED] Balance inputs prepared:', balanceInputs);

      console.log('🔵 [VEILED] Generating balance range proof...');
      proofResult = await generateProof(balanceInputs, 'balance_range');
      proofHex = '0x' + Array.from(proofResult.proof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // * Extract balance range bucket from inputs
      balanceRangeBucket = balanceInputs.balanceRangeBucket;
    } else if (circuitType === 'nft_ownership') {
      console.log('🔵 [VEILED] Using nft_ownership circuit');
      if (!this.wallet) {
        console.error('🔴 [VEILED] Wallet required for NFT ownership proof');
        throw new Error('Wallet required for NFT ownership proof');
      }

      // * Create Quicknode client
      if (!this.config.quicknodeEndpoint) {
        throw new Error('Quicknode endpoint required for NFT ownership circuit. Set quicknodeEndpoint in VeiledConfig.');
      }
      const quicknodeClient = new QuicknodeClient(
        this.config.quicknodeEndpoint,
        this.config.quicknodeApiKey
      );

      console.log('🔵 [VEILED] Preparing NFT ownership circuit inputs...');
      const nftInputs = await prepareNFTOwnershipCircuitInputs(
        options,
        walletSecretKey,
        quicknodeClient,
        this.wallet
      );
      console.log('🔵 [VEILED] NFT inputs prepared:', nftInputs);

      console.log('🔵 [VEILED] Generating NFT ownership proof...');
      proofResult = await generateProof(nftInputs, 'nft_ownership');
      proofHex = '0x' + Array.from(proofResult.proof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // * Default: wallet ownership circuit
      console.log('🔵 [VEILED] Using wallet_ownership circuit');
      console.log('🔵 [VEILED] Preparing wallet ownership circuit inputs...');
    const proofInputs = await prepareProofInputs(options, walletSecretKey);
      console.log('🔵 [VEILED] Proof inputs prepared:', proofInputs);
      console.log('🔵 [VEILED] Generating wallet ownership proof...');
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:135',message:'BEFORE_GENERATE_PROOF',data:{circuitType:'wallet_ownership'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      proofResult = await generateProof(proofInputs, 'wallet_ownership');
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:137',message:'AFTER_GENERATE_PROOF',data:{hasProof:!!proofResult.proof,proofLength:proofResult.proof?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      proofHex = '0x' + Array.from(proofResult.proof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    // * Verify proof off-chain using WASM backend
    // * CRITICAL: Must pass the full publicInputsArray and circuitType to verifyProof()
    // * Verification requires the same public inputs array and circuit type used during proof generation
    console.log('🔐 Verifying proof off-chain...');
    console.log('🔵 [VEILED] Circuit type:', circuitType);
    console.log('🔵 [VEILED] Public inputs array length:', proofResult.publicInputsArray.length);
    console.log('🔵 [VEILED] Public inputs for verification:', proofResult.publicInputs);
    let isValid: boolean;
    try {
      isValid = await verifyProof(
        proofResult.proof, 
        proofResult.publicInputsArray, 
        proofResult.circuitType
      );
      
      if (!isValid) {
        throw new Error('Proof verification failed. The generated proof is invalid.');
      }
      
      console.log('✅ Proof verified successfully!');
    } catch (error) {
      // * Verification failed - reject the proof
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Proof verification failed: ${message}. Cannot proceed with invalid proof.`);
    }

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

    // * Base auth result (without permissions)
    const baseResult: AuthResult = {
      success: true,
      nullifier: proofResult.publicInputs.nullifier,
      proof: proofHex,
      commitment: proofResult.publicInputs.walletPubkeyHash,
      txSignature
    };

    // * Handle optional permission flow
    let grantedPermissions: Permission[] = [];
    if (options.permissions && this.connection && this.wallet) {
      grantedPermissions = await this.requestPermissions(
        baseResult.nullifier,
        options.domain,
        options.permissions
      );
    }

    const session: Session = {
      ...baseResult,
      verified: true,
      permissions: grantedPermissions,
      expiresAt:
        Date.now() +
        (options.permissions?.duration ? options.permissions.duration * 1000 : (options.expiry ?? 3600) * 1000),
      balanceRangeBucket
    };

    this.currentSession = session;
    this.currentDomain = options.domain;
    return session;
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
    this.currentSession = null;
    this.currentDomain = null;
  }

  /**
   * * Requests permissions from the user and writes PermissionGrant on-chain
   */
  private async requestPermissions(
    nullifierHex: string,
    domain: string,
    request: PermissionRequest
  ): Promise<Permission[]> {
    if (!this.connection || !this.wallet) {
      throw new Error('Connection and wallet must be set before requesting permissions.');
    }

    const modal = new PermissionModal();
    const approved = await modal.request(request.permissions, request.reason);

    if (!approved) {
      return [];
    }

    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:429',message:'REQUEST_PERMISSIONS_ENTRY',data:{hasConnection:!!this.connection,hasWallet:!!this.wallet,permissionsCount:request.permissions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:430',message:'BEFORE_GRANT_PERMISSIONS_CALL',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      await grantPermissionsOnChain({
        connection: this.connection,
        wallet: this.wallet,
        nullifierHex,
        domain,
        permissions: request.permissions,
        durationSeconds: request.duration
      });
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:439',message:'AFTER_GRANT_PERMISSIONS_SUCCESS',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      return request.permissions;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:440',message:'VEILED_AUTH_CATCH_ENTRY',data:{errorType:typeof error,isError:error instanceof Error,errorMessage:(error as any)?.message?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // * If permission grant fails, surface error to caller
      const message = error instanceof Error ? error.message : String(error);
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:443',message:'BEFORE_RETHROW',data:{extractedMessage:message.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      throw new Error(`Failed to grant permissions: ${message}`);
    }
  }

  /**
   * * Determine which circuit to use based on requirements
   */
  private selectCircuit(
    requirements: VeiledRequirements
  ): 'wallet_ownership' | 'balance_range' | 'nft_ownership' {
    if (requirements.nft?.collection !== undefined) {
      return 'nft_ownership';
    }
    if (requirements.balance?.minimum !== undefined) {
      return 'balance_range';
    }
    return 'wallet_ownership';
  }

  /**
   * * Logs when a specific permission is actually used (audit trail)
   */
  async logPermissionAccess(permission: Permission, metadata?: string): Promise<void> {
    if (!this.connection || !this.wallet) {
      throw new Error('Connection and wallet must be set before logging permission access.');
    }

    if (!this.currentSession) {
      throw new Error('No active session. Call signIn() first.');
    }

    if (!this.currentSession.permissions.includes(permission)) {
      throw new Error('Permission not granted for current session.');
    }

    if (!this.currentDomain) {
      throw new Error('Current session domain is unknown.');
    }

    await logPermissionAccessOnChain({
      connection: this.connection,
      wallet: this.wallet,
      nullifierHex: this.currentSession.nullifier,
      domain: this.currentDomain,
      permission,
      metadata
    });
  }

  /**
   * * Revokes all permissions for the current session
   */
  async revokePermissions(): Promise<void> {
    if (!this.connection || !this.wallet) {
      throw new Error('Connection and wallet must be set before revoking permissions.');
    }

    if (!this.currentSession) {
      throw new Error('No active session. Call signIn() first.');
    }

    if (!this.currentDomain) {
      throw new Error('Current session domain is unknown.');
    }

    await revokePermissionsOnChain({
      connection: this.connection,
      wallet: this.wallet,
      nullifierHex: this.currentSession.nullifier,
      domain: this.currentDomain
    });
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

