// * Anchor program client integration
// * Handles on-chain verification result submission and nullifier verification
// *
// * Verification Flow:
// * 1. Client verifies proof off-chain using WASM (@aztec/bb.js)
// * 2. Client creates verification result with signature
// * 3. Client submits verification result to Solana program
// * 4. Program validates signature and stores nullifier

import { Connection, Ed25519Program, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';

// * Program ID (matches Anchor.toml)
export const VEILED_PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P');

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
 * * Loads Anchor IDL from file or network
 * * Exported for use in other modules
 */
export async function loadIdl(): Promise<Idl | null> {
  if (cachedIdl) {
    return cachedIdl;
  }

  // * Try to load from local file (for development)
  // * In production, this would be fetched from chain or CDN
  try {
    if (typeof window !== 'undefined') {
      // Browser: fetch from public path
      const response = await fetch('/idl/veiled.json');
      if (response.ok) {
        cachedIdl = await response.json();
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
      return cachedIdl;
    }
  } catch (error) {
    console.warn('Failed to load IDL from file, using fallback:', error);
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
          { name: 'domain', type: 'string' }
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

  // * Derive PDA for nullifier account
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nullifier'), nullifierBytes],
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
        domain
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
  program?: Program<Idl>
): Promise<{ 
  exists: boolean; 
  account?: any;
  expired?: boolean;
  expiresAt?: number;
}> {
  const nullifierBytes = hexToBytes(nullifier);
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nullifier'), nullifierBytes],
    VEILED_PROGRAM_ID
  );

  try {
    // * Try to fetch account data using program if available
    if (program) {
      try {
        // * Use type assertion since IDL type may not have nullifierAccount
        const account = await (program.account as any).nullifierAccount.fetch(nullifierPda);
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

// * Helper function to convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(32);
  
  // Convert hex pairs to bytes
  for (let i = 0; i < 32 && i * 2 < cleanHex.length; i++) {
    const hexByte = cleanHex.slice(i * 2, i * 2 + 2);
    bytes[i] = parseInt(hexByte, 16);
  }
  
  return bytes;
}
