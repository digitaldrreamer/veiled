// * Anchor program client integration
// * Handles on-chain verification result submission and nullifier verification
// *
// * Verification Flow:
// * 1. Client verifies proof off-chain using WASM (@aztec/bb.js)
// * 2. Client creates verification result with signature
// * 3. Client submits verification result to Solana program
// * 4. Program validates signature and stores nullifier

import { Connection, Ed25519Program, PublicKey, SystemProgram, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { Idl } from '@coral-xyz/anchor';
import type { Veiled } from '@veiled/anchor/src/types.js';
import { Permission } from '../types.js';

// * Program ID (must match on-chain declare_id! in lib.rs)
// * Deployed Program ID on devnet: H6apEGZAw23AKUeqCX41wkDv2LVwX3Ec8oYPip7k3xzA
export const VEILED_PROGRAM_ID = new PublicKey('H6apEGZAw23AKUeqCX41wkDv2LVwX3Ec8oYPip7k3xzA');

export interface SubmitVerificationResultOptions {
  verificationResult: Uint8Array; // * 105 bytes: [is_valid (1) | proof_hash (32) | timestamp (8) | signature (64)]
  nullifier: string; // Hex string
  domain: string;
  connection: Connection;
  wallet: Wallet;
}

export interface SubmitVerificationResultResponse {
  signature: string;
  nullifierAccount: PublicKey;
}

// * Legacy interface (deprecated - use SubmitVerificationResultOptions)
export interface SubmitProofOptions {
  proof: Uint8Array;
  publicInputs: {
    walletPubkeyHash: string;
    domainHash: string;
    nullifier: string;
  };
  nullifier: string; // Hex string
  domain: string;
  connection: Connection;
  wallet: Wallet;
}

export interface SubmitProofResult {
  signature: string;
  nullifierAccount: PublicKey;
}

// * Cached IDL
let cachedIdl: Idl | null = null;

/**
 * * Clears the cached IDL (useful for development when IDL changes)
 */
export function clearIdlCache(): void {
  cachedIdl = null;
}

/**
 * * Loads Anchor IDL from file or network
 * * Exported for use in other modules
 */
export async function loadIdl(): Promise<Idl | null> {
  // * Validate cached IDL address matches expected Program ID before using cache
  if (cachedIdl) {
    const cachedAddress = (cachedIdl as any).address;
    const expectedAddress = VEILED_PROGRAM_ID.toBase58();
    
    // * If cached IDL has wrong address, clear cache and reload
    if (cachedAddress !== expectedAddress) {
      console.warn(`IDL cache mismatch: cached=${cachedAddress}, expected=${expectedAddress}. Clearing cache.`);
      cachedIdl = null;
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:loadIdl',message:'RETURNING_CACHED_IDL',data:{cachedIdlAddress:(cachedIdl as any).address},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return cachedIdl;
    }
  }

  // * Try to load from local file (for development)
  // * In production, this would be fetched from chain or CDN
  try {
    if (typeof window !== 'undefined') {
      // Browser: fetch from public path with cache-busting
      // * Add timestamp to prevent browser caching of old IDL
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`/idl/veiled.json${cacheBuster}`, {
        cache: 'no-store' // * Prevent browser caching
      });
      if (response.ok) {
        cachedIdl = await response.json();
        
        // * Validate loaded IDL address matches expected Program ID
        const loadedAddress = (cachedIdl as any).address;
        const expectedAddress = VEILED_PROGRAM_ID.toBase58();
        if (loadedAddress !== expectedAddress) {
          throw new Error(
            `IDL address mismatch: loaded=${loadedAddress}, expected=${expectedAddress}. ` +
            `Please ensure the IDL file has been updated and the dev server has been restarted.`
          );
        }
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:loadIdl',message:'IDL_LOADED_FROM_BROWSER',data:{idlAddress:(cachedIdl as any).address,source:'/idl/veiled.json'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return cachedIdl;
      }
    } else {
      // Node.js: read from file system
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const idlPath = path.join(
        process.cwd(),
        'packages/anchor/target/idl/veiled.json'
      );
      const fileContent = await fs.readFile(idlPath, 'utf-8');
      cachedIdl = JSON.parse(fileContent);
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:loadIdl',message:'IDL_LOADED_FROM_FILESYSTEM',data:{idlAddress:(cachedIdl as any).address,source:idlPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return cachedIdl;
    }
  } catch (error) {
    console.warn('Failed to load IDL from file, using fallback:', error);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:loadIdl',message:'IDL_LOAD_FAILED',data:{errorMessage:(error as any)?.message?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }

  // * Fallback: Use minimal IDL structure
  cachedIdl = {
    version: '0.1.0',
    name: 'veiled',
    instructions: [
      {
        name: 'verifyAuth',
        accounts: [
          { name: 'nullifierAccount', isMut: true, isSigner: false },
          { name: 'authority', isMut: true, isSigner: true },
          { name: 'instructionsSysvar', isMut: false, isSigner: false },
          { name: 'systemProgram', isMut: false, isSigner: false }
        ],
        args: [
          { name: 'verificationResult', type: 'bytes' }, // * 105 bytes: verification result
          { name: 'nullifier', type: { array: ['u8', 32] } },
          // * NOTE: Domain is represented on-chain as [u8; 32]
          { name: 'domain', type: { array: ['u8', 32] } }
        ]
      }
    ],
    accounts: [
      {
        name: 'NullifierAccount',
        type: {
          kind: 'struct',
        fields: [
          { name: 'nullifier', type: { array: ['u8', 32] } },
          { name: 'domain', type: 'string' },
          { name: 'createdAt', type: 'i64' },
          { name: 'expiresAt', type: 'i64' }
        ]
        }
      }
    ],
    address: VEILED_PROGRAM_ID.toBase58(),
    metadata: {
      name: 'veiled',
      version: '0.1.0',
      spec: '0.1.0'
    }
  } as unknown as Idl;

  return cachedIdl;
}

/**
 * * Submits verification result to Anchor program
 * * The proof has already been verified off-chain using WASM
 * * This function stores the verification result and registers the nullifier
 * * 
 * * @param options - Verification result and submission options
 * * @returns Transaction signature and nullifier account address
 */
export async function submitVerificationResultToChain(
  options: SubmitVerificationResultOptions
): Promise<SubmitVerificationResultResponse> {
  const { verificationResult, nullifier, domain, connection, wallet } = options;

  // * Validate verification result size (must be 105 bytes)
  if (verificationResult.length !== 105) {
    throw new Error(
      `Verification result must be 105 bytes, got ${verificationResult.length}`
    );
  }

  // * Create provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });

  // * Load IDL
  const idl = await loadIdl();
  if (!idl) {
    throw new Error('Failed to load program IDL');
  }

  // * Create program instance
  const program = new Program(idl, provider);

  // * Convert nullifier hex string to [u8; 32]
  const nullifierBytes = hexToBytes(nullifier);

  // * Encode domain as fixed 32-byte array (must match on-chain representation)
  const domainBytes = encodeDomainToBytes32(domain);

  // * Derive PDA for nullifier account
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nullifier'), Buffer.from(nullifierBytes)],
    VEILED_PROGRAM_ID
  );

  try {
    // * Reconstruct the Ed25519 signed message from the verification result.
    // * Message format (41 bytes): proof_hash (32) + is_valid (1) + timestamp (8 LE)
    const proofHash = verificationResult.slice(1, 33);
    const isValidByte = verificationResult[0];
    const timestampBytes = verificationResult.slice(33, 41);
    const signatureBytes = verificationResult.slice(41, 105);

    const messageToVerify = new Uint8Array(41);
    messageToVerify.set(proofHash, 0);
    messageToVerify[32] = isValidByte;
    messageToVerify.set(timestampBytes, 33);

    // * Create Ed25519 verification instruction (runs in Solana's built-in Ed25519 program)
    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: wallet.publicKey.toBytes(),
      message: messageToVerify,
      signature: signatureBytes
    });

    // * Call verify_auth instruction with verification result
    const txSignature = await program.methods
      .verifyAuth(
        Array.from(verificationResult),
        Array.from(nullifierBytes),
        Array.from(domainBytes)
      )
      .preInstructions([ed25519Ix])
      .accounts({
        nullifierAccount: nullifierPda,
        authority: wallet.publicKey,
        instructionsSysvar: new PublicKey('Sysvar1nstructions1111111111111111111111111'),
        systemProgram: SystemProgram.programId
      })
      .rpc();

    return {
      signature: txSignature,
      nullifierAccount: nullifierPda
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to submit verification result to chain: ${message}`);
  }
}

/**
 * * Legacy function: Submits ZK proof to Anchor program
 * * @deprecated Use submitVerificationResultToChain() instead
 * * This function is kept for backward compatibility but will be removed
 */
export async function submitProofToChain(
  options: SubmitProofOptions
): Promise<SubmitProofResult> {
  console.warn(
    'submitProofToChain() is deprecated. ' +
    'Use submitVerificationResultToChain() after verifying proof off-chain.'
  );
  
  // * For backward compatibility, we would need to verify the proof first
  // * But this defeats the purpose, so we throw an error
  throw new Error(
    'submitProofToChain() is deprecated. ' +
    'Please verify the proof off-chain first using verifyProof(), ' +
    'then use submitVerificationResultToChain() to submit the result.'
  );
}

/**
 * * Verifies if a nullifier has been used on-chain
 * * Returns account data including expiry information
 */
export async function verifyNullifierOnChain(
  connection: Connection,
  nullifier: string,
  program?: Program<Veiled>
): Promise<{ 
  exists: boolean; 
  account?: any;
  expired?: boolean;
  expiresAt?: number;
}> {
  const nullifierBytes = hexToBytes(nullifier);
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nullifier'), Buffer.from(nullifierBytes)],
    VEILED_PROGRAM_ID
  );

  try {
    // * Try to fetch account data using program if available
    if (program) {
      try {
        const account = await program.account.nullifierAccount.fetch(nullifierPda);
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = account.expiresAt?.toNumber ? account.expiresAt.toNumber() : Number(account.expiresAt);
        const expired = expiresAt < now;
        
        return {
          exists: true,
          account,
          expired,
          expiresAt
        };
      } catch (fetchError) {
        // * Account doesn't exist or fetch failed
        return { exists: false };
      }
    }
    
    // * Fallback: just check if account exists
    const accountInfo = await connection.getAccountInfo(nullifierPda);
    return {
      exists: accountInfo !== null,
      account: accountInfo
    };
  } catch (error) {
    return { exists: false };
  }
}

// * Helper function to convert hex string to 32-byte array
function hexToBytes(hex: string): Uint8Array {
  // * Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(32);
  
  // * Convert hex pairs to bytes
  for (let i = 0; i < 32 && i * 2 < cleanHex.length; i++) {
    const hexByte = cleanHex.slice(i * 2, i * 2 + 2);
    bytes[i] = parseInt(hexByte, 16);
  }
  
  return bytes;
}

// * Helper: Encode domain string as fixed 32-byte array (UTF-8, padded with zeros)
function encodeDomainToBytes32(domain: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(domain);

  if (encoded.length > 32) {
    throw new Error(
      `Domain is too long (${encoded.length} bytes). Maximum is 32 bytes.`
    );
  }

  const out = new Uint8Array(32);
  out.set(encoded, 0);
  return out;
}

// * Internal helper: Map SDK Permission enum to Anchor enum layout
function toRustPermissionVariant(permission: Permission): any {
  switch (permission) {
    case Permission.RevealWalletAddress:
      return { revealWalletAddress: {} };
    case Permission.RevealExactBalance:
      return { revealExactBalance: {} };
    case Permission.RevealTokenBalances:
      return { revealTokenBalances: {} };
    case Permission.RevealNFTList:
      return { revealNftList: {} };
    case Permission.RevealTransactionHistory:
      return { revealTransactionHistory: {} };
    case Permission.RevealStakingPositions:
      return { revealStakingPositions: {} };
    case Permission.RevealDeFiPositions:
      return { revealDefiPositions: {} };
    case Permission.SignTransactions:
      return { signTransactions: {} };
    default:
      // * TypeScript exhaustiveness check
      const _exhaustive: never = permission;
      throw new Error(`Unknown permission: ${_exhaustive}`);
  }
}

// * Helper: Create an Anchor program instance for the Veiled program
async function getVeiledProgram(
  connection: Connection,
  wallet: Wallet
): Promise<Program<Veiled>> {
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:getVeiledProgram',message:'FUNCTION_ENTRY',data:{connectionRpcUrl:connection.rpcEndpoint,walletPublicKey:wallet.publicKey?.toBase58()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });
  const idl = await loadIdl();
  if (!idl) {
    throw new Error('Failed to load Veiled program IDL');
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:getVeiledProgram',message:'IDL_LOADED',data:{idlAddress:(idl as any).address,idlName:(idl as any).name,idlVersion:(idl as any).metadata?.version,veiledProgramIdConstant:VEILED_PROGRAM_ID.toBase58()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const program = new Program(idl, provider) as Program<Veiled>;
  
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:getVeiledProgram',message:'PROGRAM_CREATED',data:{programProgramId:program.programId.toBase58(),veiledProgramIdConstant:VEILED_PROGRAM_ID.toBase58(),programIdsMatch:program.programId.toBase58()===VEILED_PROGRAM_ID.toBase58()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  return program;
}

// * Helper: Derive appId PDA from domain (used for permission system)
function deriveAppId(domain: string): PublicKey {
  const domainBytes = new TextEncoder().encode(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('app'), domainBytes],
    VEILED_PROGRAM_ID
  )[0];
}

// * Safe transaction signing helper
// * Handles both Anchor Wallet and raw wallet adapters
// * Bypasses buggy wallet adapter wrappers that reference undefined 'tx' variable
async function signTransactionSafely(
  transaction: Transaction,
  wallet: Wallet
): Promise<Transaction> {
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:signTransactionSafely',message:'SIGN_SAFE_ENTRY',data:{hasTransaction:!!transaction,walletType:wallet?.constructor?.name,hasPayer:!!(wallet as any).payer},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  try {
    // * Try standard Anchor wallet signing first
    return await wallet.signTransaction(transaction);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:signTransactionSafely',message:'SIGN_ERROR',data:{errorType:typeof error,errorMessage:error?.message?.substring(0,200),isReferenceError:error instanceof ReferenceError,hasTxError:error?.message?.includes('tx is not defined')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // * If it's the "tx is not defined" error, the wallet adapter wrapper has a bug
    // * Try to extract and use the raw wallet adapter directly
    if (error instanceof ReferenceError && error.message === 'tx is not defined') {
      console.warn('⚠️ [GRANT PERMISSIONS] Wallet adapter bug detected (tx is not defined), trying raw adapter...');
      
      // * Try wallet.payer (common pattern in Anchor wallet wrappers)
      if ((wallet as any).payer && typeof (wallet as any).payer?.signTransaction === 'function') {
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:signTransactionSafely',message:'TRYING_PAYER_SIGN',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        try {
          return await (wallet as any).payer.signTransaction(transaction);
        } catch (payerError: any) {
          // #region agent log
          fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:signTransactionSafely',message:'PAYER_SIGN_FAILED',data:{errorMessage:payerError?.message?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Fall through to next attempt
        }
      }
      
      // * Try wallet.adapter (another common pattern)
      if ((wallet as any).adapter && typeof (wallet as any).adapter?.signTransaction === 'function') {
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:signTransactionSafely',message:'TRYING_ADAPTER_SIGN',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        try {
          return await (wallet as any).adapter.signTransaction(transaction);
        } catch (adapterError: any) {
          // #region agent log
          fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:signTransactionSafely',message:'ADAPTER_SIGN_FAILED',data:{errorMessage:adapterError?.message?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Fall through to throw
        }
      }
      
      throw new Error(`Wallet signTransaction failed: ${error.message}. All fallback signing methods failed. The wallet adapter may be incompatible.`);
    }
    
    // * Re-throw non-"tx is not defined" errors as-is
    throw error;
  }
}

// * Grant permissions on-chain via Anchor
export async function grantPermissionsOnChain(options: {
  connection: Connection;
  wallet: Wallet;
  nullifierHex: string;
  domain: string;
  permissions: Permission[];
  durationSeconds?: number;
}): Promise<string> {
  const { connection, wallet, nullifierHex, domain, permissions, durationSeconds } =
    options;

  const program = await getVeiledProgram(connection, wallet);
  const nullifierBytes = hexToBytes(nullifierHex);
  const appId = deriveAppId(domain);

  if (!appId) {
    throw new Error('Failed to derive appId from domain');
  }

  // * Note: permissionGrant PDA is auto-resolved by Anchor from seeds in IDL (Anchor 0.30.0+)
  // * No need to manually derive or pass it in .accounts()
  
  const rustPermissions = permissions.map(toRustPermissionVariant);
  // * expires_in is i64 in Rust - typed Program<Veiled> requires BN for i64 types
  const expiresIn = new BN(durationSeconds ?? 3600);

  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:410',message:'GRANT_PERMISSIONS_ENTRY',data:{hasConnection:!!connection,hasWallet:!!wallet,nullifierHexLength:nullifierHex.length,permissionsCount:permissions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    // * Use .transaction() and .send() instead of .rpc() to avoid Anchor's internal 'tx' reference
    // * This gives us full control over transaction building and error handling
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:413',message:'BEFORE_PROVIDER_CREATION',data:{hasProgram:!!program},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed'
    });
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:417',message:'BEFORE_TRANSACTION_BUILD',data:{hasProvider:!!provider},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // * Fix: Build transaction with .transaction(), then send manually to avoid Anchor 0.32.1 sendAndConfirm bug
    // * sendAndConfirm/.rpc() have a bug where they reference 'tx' variable that doesn't exist in error handling
    
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:grantPermissionsOnChain',message:'BEFORE_TRANSACTION_BUILD',data:{programProgramId:program.programId.toBase58(),veiledProgramIdConstant:VEILED_PROGRAM_ID.toBase58(),connectionRpcUrl:connection.rpcEndpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const transaction = await program.methods
      .grantPermissions(Array.from(nullifierBytes), appId, rustPermissions, expiresIn)
      .accounts({
        // * permissionGrant and systemProgram are auto-resolved by Anchor from IDL (Anchor 0.30.0+)
        // * permissionGrant: resolved from PDA seeds [b"permission", nullifier, appId]
        // * systemProgram: resolved from fixed address in IDL
        payer: wallet.publicKey
      })
      .transaction();
    
    // #region agent log
    const transactionProgramIds = transaction.instructions.map((ix, idx) => ({
      index: idx,
      programId: ix.programId.toBase58()
    }));
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:grantPermissionsOnChain',message:'TRANSACTION_BUILT',data:{transactionProgramIds,instructionCount:transaction.instructions.length,expectedProgramId:VEILED_PROGRAM_ID.toBase58()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:430',message:'AFTER_TRANSACTION_BUILD',data:{hasTransaction:!!transaction,transactionType:transaction?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    transaction.feePayer = wallet.publicKey;

    // * Get fresh blockhash RIGHT BEFORE signing (prevents "Blockhash not found" errors)
    // * Blockhashes expire after ~60 seconds, so getting it right before signing ensures it's valid
    // * This minimizes the time between getting blockhash and sending transaction
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockhash.blockhash;

    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:438',message:'BEFORE_SIGN',data:{hasTransaction:!!transaction},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // * Sign the transaction using safe signing helper (bypasses buggy wallet adapter wrappers)
    const signedTransaction = await signTransactionSafely(transaction, wallet);
    
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:441',message:'AFTER_SIGN',data:{hasSignedTransaction:!!signedTransaction},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:444',message:'BEFORE_SEND_RAW',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // * Send raw transaction (bypasses Anchor's buggy sendAndConfirm)
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: false }
    );
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:449',message:'AFTER_SEND_RAW',data:{hasSignature:!!signature},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:453',message:'BEFORE_CONFIRM',data:{hasSignature:!!signature},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // * Confirm using modern strategy object (prevents "transaction expired" race conditions)
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:460',message:'AFTER_CONFIRM',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    return signature;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:429',message:'CATCH_BLOCK_ENTRY',data:{errorType:typeof error,isError:error instanceof Error,errorConstructor:error?.constructor?.name,hasMessage:!!(error as any)?.message,errorMessage:(error as any)?.message?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // * Enhanced error logging - SAFE (no tx references)
    console.error('🔴 [GRANT PERMISSIONS] Detailed Error:');
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:432',message:'ERROR_IS_ERROR_INSTANCE',data:{message:error.message?.substring(0,200),stackLength:error.stack?.length,stackFirstLine:error.stack?.split('\n')[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } else if (error && typeof error === 'object') {
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:435',message:'ERROR_IS_OBJECT',data:{keys:Object.keys(error),hasLogs:'logs' in error,hasError:'error' in error,logsCount:Array.isArray((error as any).logs)?(error as any).logs.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('  Error object keys:', Object.keys(error));
      console.error('  Has logs?', 'logs' in error);
      console.error('  Has error?', 'error' in error);
      console.error('  Full error:', JSON.stringify(error, null, 2));
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:440',message:'ERROR_UNKNOWN_TYPE',data:{errorType:typeof error,errorString:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('  Unknown error type:', typeof error, String(error));
    }
    
    // * Check if error is "account already in use" - this means permissions already exist
    // * With init_if_needed, this shouldn't happen, but handle it gracefully for backwards compatibility
    const errorString = error instanceof Error ? error.message : String(error);
    const errorLogs = (error && typeof error === 'object' && 'logs' in error && Array.isArray((error as any).logs)) 
      ? (error as any).logs.join('\n') 
      : '';
    const fullErrorText = `${errorString}\n${errorLogs}`;
    
    if (fullErrorText.includes('already in use') || 
        fullErrorText.includes('AccountExists') ||
        fullErrorText.includes('already exists')) {
      console.log('ℹ️  [GRANT PERMISSIONS] Account already exists - permissions are already granted');
      console.log('   This is expected if permissions were previously granted.');
      
      // * Try to fetch the existing account to confirm it exists
      try {
        // * Derive the PDA to check if it exists
        const [permissionGrantPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('permission'),
            nullifierBytes,
            appId.toBuffer()
          ],
          program.programId
        );
        
        const existingAccount = await program.account.permissionGrant.fetch(permissionGrantPda);
        if (existingAccount) {
          console.log('✅ [GRANT PERMISSIONS] Permissions already exist for this nullifier and domain');
          console.log('   Existing permissions:', existingAccount.permissions);
          console.log('   Expires at:', new Date(Number(existingAccount.expiresAt) * 1000).toISOString());
          console.log('\n💡 Note: The program was updated to use init_if_needed to handle existing accounts.');
          console.log('   If you see this message, please hard-refresh your browser (Ctrl+Shift+R)');
          console.log('   to load the updated IDL. Permissions are already granted, so you can continue.\n');
          
          // * Permissions already exist - return a dummy signature to indicate success
          // * The actual transaction failed, but permissions are effectively "granted" since they exist
          // * In a future update, init_if_needed will allow updating existing permissions
          return 'existing-permissions-already-granted';
        }
      } catch (fetchError) {
        // * Account doesn't exist or fetch failed - continue with normal error handling
        console.warn('⚠️  [GRANT PERMISSIONS] Could not verify existing account:', fetchError);
      }
    }
    
    // * Extract meaningful error message from Anchor error
    let errorMessage = 'Unknown error';
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:445',message:'BEFORE_ERROR_MESSAGE_EXTRACTION',data:{errorType:typeof error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:448',message:'EXTRACTED_FROM_ERROR_MESSAGE',data:{errorMessage:errorMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } else if (typeof error === 'object' && error !== null) {
      // * Check for Anchor's structured error logs
      if ('logs' in error && Array.isArray((error as any).logs)) {
        errorMessage = (error as any).logs.join('\n');
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:452',message:'EXTRACTED_FROM_LOGS',data:{errorMessage:errorMessage.substring(0,200),logsCount:(error as any).logs.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } else if ('error' in error) {
        errorMessage = String((error as any).error);
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:454',message:'EXTRACTED_FROM_ERROR_PROPERTY',data:{errorMessage:errorMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } else {
        // * Safe JSON stringify - won't reference tx
        try {
          errorMessage = JSON.stringify(error, null, 2);
          // #region agent log
          fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:459',message:'EXTRACTED_FROM_JSON_STRINGIFY',data:{errorMessage:errorMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        } catch (stringifyError) {
          errorMessage = String(error);
          // #region agent log
          fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:461',message:'JSON_STRINGIFY_FAILED',data:{errorMessage:errorMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        }
      }
    } else {
      errorMessage = String(error);
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:465',message:'EXTRACTED_FROM_STRING',data:{errorMessage:errorMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'program.ts:467',message:'BEFORE_THROW',data:{finalErrorMessage:errorMessage.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // * Enhanced error handling for common Solana errors
    const errorMessageLower = errorMessage.toLowerCase();
    if (
      errorMessageLower.includes('no prior credit') ||
      errorMessageLower.includes('accountnotfound') ||
      errorMessageLower.includes('insufficient funds') ||
      errorMessageLower.includes('insufficient sol') ||
      errorMessageLower.includes('attempt to debit an account but found no record')
    ) {
      const walletAddress = wallet.publicKey.toString();
      throw new Error(
        `Insufficient SOL balance on devnet. ` +
        `Your wallet (${walletAddress.substring(0, 8)}...) needs ~0.005 SOL for rent + fees. ` +
        `To fix: Run \`solana airdrop 2 --url devnet\` or visit https://faucet.solana.com/`
      );
    }
    
    throw new Error(`Failed to grant permissions: ${errorMessage}`);
  }
}

// * Revoke permissions on-chain
export async function revokePermissionsOnChain(options: {
  connection: Connection;
  wallet: Wallet;
  nullifierHex: string;
  domain: string;
}): Promise<string> {
  const { connection, wallet, nullifierHex, domain } = options;

  const program = await getVeiledProgram(connection, wallet);
  const nullifierBytes = hexToBytes(nullifierHex);
  const appId = deriveAppId(domain);

  // * For revokePermissions, permissionGrant is NOT a PDA in the IDL, so we need to derive it manually
  // * But Anchor 0.30.0+ still expects us to provide it since it's not auto-resolvable
  const [permissionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('permission'), Buffer.from(nullifierBytes), appId.toBuffer()],
    VEILED_PROGRAM_ID
  );

  const signature = await program.methods
    .revokePermissions()
    .accountsPartial({
      permissionGrant: permissionPda,
      authority: wallet.publicKey
    })
    .rpc();

  return signature;
}

// * Log a permission access event on-chain for audit trail
export async function logPermissionAccessOnChain(options: {
  connection: Connection;
  wallet: Wallet;
  nullifierHex: string;
  domain: string;
  permission: Permission;
  metadata?: string;
}): Promise<string> {
  const { connection, wallet, nullifierHex, domain, permission, metadata } = options;

  const program = await getVeiledProgram(connection, wallet);
  const nullifierBytes = hexToBytes(nullifierHex);
  const appId = deriveAppId(domain);

  // * For logPermissionAccess, permissionGrant is NOT a PDA in the IDL (no seeds defined)
  // * systemProgram has fixed address, so it's auto-resolved
  const [permissionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('permission'), Buffer.from(nullifierBytes), appId.toBuffer()],
    VEILED_PROGRAM_ID
  );

  const accessAccount = Keypair.generate();

  const signature = await program.methods
    .logPermissionAccess(toRustPermissionVariant(permission), metadata ?? '')
      .accounts({
        permissionAccess: accessAccount.publicKey,
        permissionGrant: permissionPda,
        // * systemProgram is auto-resolved from fixed address in IDL (Anchor 0.30.0+)
        payer: wallet.publicKey
      })
      .signers([accessAccount])
      .rpc();

  return signature;
}
