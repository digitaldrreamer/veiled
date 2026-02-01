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
import type { ProgressCallback, ProgressStage } from './types/widget.js';
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
        // * Don't throw - allow auto-detection or setWalletAdapter() to be called later
      }
    }
    // * If no wallet provided, walletAdapter remains null
    // * It can be set later via setWalletAdapter() or will be auto-detected in signIn()
  }
  
  /**
   * * Sets the wallet adapter for signing
   * * Call this after wallet connects
   */
  setWalletAdapter(adapter: WalletAdapter): void {
    this.walletAdapter = adapter;
  }

  /**
   * * Tries to auto-detect installed wallet extensions
   * * Returns null if no wallet is detected
   * * This abstracts wallet detection complexity from consumers
   */
  private _tryAutoDetectWallet(): WalletAdapter | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const solanaWindow = window as typeof window & {
      solana?: { isPhantom?: boolean; isSolflare?: boolean; connect?: () => Promise<void> }
      solflare?: unknown
    }

    // * Check for Phantom (most common)
    if (solanaWindow.solana?.isPhantom) {
      // * Create a minimal adapter wrapper around window.solana
      // * This avoids needing @solana/wallet-adapter-wallets as a dependency
      return this._createWindowSolanaAdapter(solanaWindow.solana);
    }

    // * Check for Solflare
    if (solanaWindow.solflare || solanaWindow.solana?.isSolflare) {
      // * For Solflare, we'd need the adapter, but for now just check window.solana
      if (solanaWindow.solana) {
        return this._createWindowSolanaAdapter(solanaWindow.solana);
      }
    }

    return null;
  }

  /**
   * * Creates a minimal WalletAdapter from window.solana
   * * This allows auto-detection without requiring wallet-adapter-wallets dependency
   */
  private _createWindowSolanaAdapter(solana: any): WalletAdapter {
    return {
      get publicKey() {
        return solana.publicKey || null;
      },
      get connected() {
        return !!solana.isConnected;
      },
      async connect() {
        if (!solana.connect) {
          throw new Error('Wallet does not support connect()');
        }
        await solana.connect();
      },
      async disconnect() {
        if (solana.disconnect) {
          await solana.disconnect();
        }
      },
      async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!solana.signMessage) {
          throw new Error('Wallet does not support signMessage()');
        }
        const result = await solana.signMessage(message);
        // * Handle different signature formats
        if (result.signature instanceof Uint8Array) {
          return result.signature;
        }
        if (Array.isArray(result.signature)) {
          return new Uint8Array(result.signature);
        }
        throw new Error('Unsupported signature format');
      }
    };
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

  async signIn(options: SignInOptions, progress?: ProgressCallback): Promise<Session> {
    console.log('🔵 [VEILED] ========================================');
    console.log('🔵 [VEILED] VeiledAuth.signIn() called');
    console.log('🔵 [VEILED] Options:', JSON.stringify(options, null, 2));
    
    try {
      // * Stage 1: Wallet Connect
      progress?.onStageChange?.('wallet_connect');
    
    // * Auto-detect wallet if not set (abstracts complexity from consumers)
    if (!this.walletAdapter) {
      this.walletAdapter = this._tryAutoDetectWallet();
      
      if (!this.walletAdapter) {
        console.error('🔴 [VEILED] Wallet adapter not set and auto-detection failed!');
        const error = new Error(
          'No wallet detected. Please install Phantom or Solflare wallet extension, or pass `wallet` in VeiledAuth config.'
        );
        progress?.onError?.(error, 'wallet_connect');
        throw error;
      }
    }

    if (!this.walletAdapter.connected) {
        progress?.onProgress?.(0, 'Connecting wallet...');
      await this.walletAdapter.connect();
        progress?.onProgress?.(100, 'Wallet connected');
        progress?.onStageChange?.('wallet_connect', {
          walletAddress: this.walletAdapter.publicKey?.toBase58()
        });
      } else {
        progress?.onStageChange?.('wallet_connect', {
          walletAddress: this.walletAdapter.publicKey?.toBase58()
        });
      }
      
      // * Stage 2: Requirements Check
      progress?.onStageChange?.('requirements_check');
      
      // * Stage 3: Wallet Proof
      progress?.onStageChange?.('wallet_proof');
      progress?.onProgress?.(0, 'Sign message in wallet...');
    
    // * Get proof of wallet ownership via message signing
    const walletProof = await getWalletProof(this.walletAdapter, options.domain);
      
      progress?.onProgress?.(100, 'Message signed');
    
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
          const error = new Error('Wallet required for balance range proof. Call setSolanaConnection() with wallet.');
          progress?.onError?.(error, 'requirements_check');
          throw error;
      }
      // * Auto-create connection from config if not set
      if (!this.connection) {
        this.connection = this.createSolanaConnection();
      }

        progress?.onProgress?.(0, 'Fetching balance...');
      console.log('🔵 [VEILED] Preparing balance range circuit inputs...');
      const balanceInputs = await prepareBalanceRangeCircuitInputs(
        options,
        walletSecretKey,
        this.connection,
        this.wallet
      );
      console.log('🔵 [VEILED] Balance inputs prepared:', balanceInputs);
        progress?.onProgress?.(50, 'Balance verified');

        // * Stage 4: Proof Generation
        progress?.onStageChange?.('proof_generation');
        progress?.onProgress?.(0, 'Generating zero-knowledge proof...');
        
        // * Simulate progress for proof generation (2-3 seconds)
        let progressInterval: NodeJS.Timeout | null = null;
        if (progress?.onProgress) {
          let simulatedProgress = 0;
          progressInterval = setInterval(() => {
            simulatedProgress = Math.min(simulatedProgress + 10, 90);
            progress.onProgress?.(simulatedProgress, 'Generating proof...');
          }, 200);
        }

      console.log('🔵 [VEILED] Generating balance range proof...');
        try {
      proofResult = await generateProof(balanceInputs, 'balance_range');
          if (progressInterval) clearInterval(progressInterval);
          progress?.onProgress?.(100, 'Proof generated');
        } catch (error) {
          if (progressInterval) clearInterval(progressInterval);
          const proofError = error instanceof Error ? error : new Error(String(error));
          progress?.onError?.(proofError, 'proof_generation');
          throw proofError;
        }
        
      proofHex = '0x' + Array.from(proofResult.proof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // * Extract balance range bucket from inputs
      balanceRangeBucket = balanceInputs.balanceRangeBucket;
    } else if (circuitType === 'nft_ownership') {
      console.log('🔵 [VEILED] Using nft_ownership circuit');
      if (!this.wallet) {
        console.error('🔴 [VEILED] Wallet required for NFT ownership proof');
          const error = new Error('Wallet required for NFT ownership proof');
          progress?.onError?.(error, 'requirements_check');
          throw error;
      }

      // * Create Quicknode client
      if (!this.config.quicknodeEndpoint) {
          const error = new Error('Quicknode endpoint required for NFT ownership circuit. Set quicknodeEndpoint in VeiledConfig.');
          progress?.onError?.(error, 'requirements_check');
          throw error;
      }
      const quicknodeClient = new QuicknodeClient(
        this.config.quicknodeEndpoint,
        this.config.quicknodeApiKey
      );

        progress?.onProgress?.(0, 'Checking NFT ownership...');
      console.log('🔵 [VEILED] Preparing NFT ownership circuit inputs...');
      const nftInputs = await prepareNFTOwnershipCircuitInputs(
        options,
        walletSecretKey,
        quicknodeClient,
        this.wallet
      );
      console.log('🔵 [VEILED] NFT inputs prepared:', nftInputs);
        progress?.onProgress?.(50, 'NFT verified');

        // * Stage 4: Proof Generation
        progress?.onStageChange?.('proof_generation');
        progress?.onProgress?.(0, 'Generating zero-knowledge proof...');
        
        // * Simulate progress for proof generation (2-3 seconds)
        let progressInterval: NodeJS.Timeout | null = null;
        if (progress?.onProgress) {
          let simulatedProgress = 0;
          progressInterval = setInterval(() => {
            simulatedProgress = Math.min(simulatedProgress + 10, 90);
            progress.onProgress?.(simulatedProgress, 'Generating proof...');
          }, 200);
        }

      console.log('🔵 [VEILED] Generating NFT ownership proof...');
        try {
      proofResult = await generateProof(nftInputs, 'nft_ownership');
          if (progressInterval) clearInterval(progressInterval);
          progress?.onProgress?.(100, 'Proof generated');
        } catch (error) {
          if (progressInterval) clearInterval(progressInterval);
          const proofError = error instanceof Error ? error : new Error(String(error));
          progress?.onError?.(proofError, 'proof_generation');
          throw proofError;
        }
        
      proofHex = '0x' + Array.from(proofResult.proof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // * Default: wallet ownership circuit
      console.log('🔵 [VEILED] Using wallet_ownership circuit');
      console.log('🔵 [VEILED] Preparing wallet ownership circuit inputs...');
    const proofInputs = await prepareProofInputs(options, walletSecretKey);
      console.log('🔵 [VEILED] Proof inputs prepared:', proofInputs);
        
        // * Stage 4: Proof Generation
        progress?.onStageChange?.('proof_generation');
        progress?.onProgress?.(0, 'Generating zero-knowledge proof...');
        
        // * Simulate progress for proof generation (2-3 seconds)
        let progressInterval: NodeJS.Timeout | null = null;
        if (progress?.onProgress) {
          let simulatedProgress = 0;
          progressInterval = setInterval(() => {
            simulatedProgress = Math.min(simulatedProgress + 10, 90);
            progress.onProgress?.(simulatedProgress, 'Generating proof...');
          }, 200);
        }
        
      console.log('🔵 [VEILED] Generating wallet ownership proof...');
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:135',message:'BEFORE_GENERATE_PROOF',data:{circuitType:'wallet_ownership'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
        try {
      proofResult = await generateProof(proofInputs, 'wallet_ownership');
          if (progressInterval) clearInterval(progressInterval);
          progress?.onProgress?.(100, 'Proof generated');
        } catch (error) {
          if (progressInterval) clearInterval(progressInterval);
          const proofError = error instanceof Error ? error : new Error(String(error));
          progress?.onError?.(proofError, 'proof_generation');
          throw proofError;
        }
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'veiled-auth.ts:137',message:'AFTER_GENERATE_PROOF',data:{hasProof:!!proofResult.proof,proofLength:proofResult.proof?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      proofHex = '0x' + Array.from(proofResult.proof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
      
      // * Stage 5: Proof Verification
      progress?.onStageChange?.('proof_verification');
      progress?.onProgress?.(0, 'Verifying proof...');
    
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
          const error = new Error('Proof verification failed. The generated proof is invalid.');
          progress?.onError?.(error, 'proof_verification');
          throw error;
      }
      
      console.log('✅ Proof verified successfully!');
        progress?.onProgress?.(100, 'Proof verified');
    } catch (error) {
      // * Verification failed - reject the proof
      const message = error instanceof Error ? error.message : String(error);
        const verificationError = new Error(`Proof verification failed: ${message}. Cannot proceed with invalid proof.`);
        progress?.onError?.(verificationError, 'proof_verification');
        throw verificationError;
    }

      // * Stage 6: Verification Signature (if on-chain submission enabled)
    let txSignature: string | undefined;
    if (this.connection && this.wallet) {
      try {
          progress?.onStageChange?.('verification_signature');
          progress?.onProgress?.(0, 'Sign verification result...');
          
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
          
          progress?.onProgress?.(100, 'Signed');
          
          // * Stage 7: On-Chain Submission
          progress?.onStageChange?.('on_chain_submission');
          progress?.onProgress?.(0, 'Submitting to Solana...');
        
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
          progress?.onProgress?.(100, 'Submitted');
      } catch (error) {
        // * Log error but don't fail the auth flow
        console.warn('Failed to submit verification result to chain:', error);
          if (progress?.onError) {
            const chainError = error instanceof Error ? error : new Error(String(error));
            progress.onError(chainError, 'on_chain_submission');
          }
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

      // * Stage 8: Permissions Request (optional)
    let grantedPermissions: Permission[] = [];
    if (options.permissions && this.connection && this.wallet) {
        progress?.onStageChange?.('permissions_request');
        const granted = await this.requestPermissions(
        baseResult.nullifier,
        options.domain,
          options.permissions,
          progress
      );
        
        if (granted.length > 0) {
          progress?.onStageChange?.('grant_permissions');
          progress?.onProgress?.(0, 'Granting permissions...');
          // * Permissions are already granted in requestPermissions()
          grantedPermissions = granted;
          progress?.onProgress?.(100, 'Granted');
        }
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
      
      // * Stage 9: Success
      progress?.onStageChange?.('success');
      
    return session;
    } catch (error) {
      // * Error handling - determine which stage we were in
      const currentStage: ProgressStage = 'wallet_connect'; // Default, will be updated by progress callbacks
      const err = error instanceof Error ? error : new Error(String(error));
      progress?.onError?.(err, currentStage);
      throw error;
    }
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

  /**
   * * Get current session
   * * Returns the active session if one exists
   */
  getSession(): Session | null {
    return this.currentSession;
  }

  /**
   * * Renders a button that opens the sign-in modal
   * * @param target - CSS selector or HTMLElement where button should be rendered
   * * @param config - Widget configuration
   * * @returns WidgetInstance with button element
   */
  async renderButton(target: string | HTMLElement, config: import('./types/widget.js').WidgetConfig): Promise<import('./types/widget.js').WidgetInstance> {
    const { renderButton: renderButtonImpl } = await import('./ui/sign-in-widget-api.js')
    return renderButtonImpl(this, target, config)
  }

  /**
   * * Opens the sign-in modal programmatically
   * * @param config - Widget configuration
   * * @returns WidgetInstance for controlling the modal
   */
  async openAuthModal(config: import('./types/widget.js').WidgetConfig): Promise<import('./types/widget.js').WidgetInstance> {
    const { openAuthModal: openAuthModalImpl } = await import('./ui/sign-in-widget-api.js')
    return openAuthModalImpl(this, config)
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
    request: PermissionRequest,
    progress?: ProgressCallback
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

