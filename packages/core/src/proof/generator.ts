// * Proof generation module for Veiled
// * Generates zero-knowledge proofs using compiled Noir circuits
// * Verifies proofs using WASM backend (@aztec/bb.js)

import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { loadCircuit } from './circuit-loader.js';
import type { SignInOptions } from '../types.js';

// * Dynamic import for @aztec/bb.js
// * Note: @aztec/bb.js exports may vary - check actual exports if this fails
let BarretenbergAPI: any = null;
let UltraHonkBackend: any = null;

async function loadBarretenbergAPI() {
  if (BarretenbergAPI && UltraHonkBackend) {
    return { Barretenberg: BarretenbergAPI, UltraHonkBackend };
  }
  
  try {
    const bbModule = await import('@aztec/bb.js');
    
    // * @aztec/bb.js exports: Barretenberg, UltraHonkBackend, etc.
    // * These are the correct export names
    BarretenbergAPI = (bbModule as any).Barretenberg;
    UltraHonkBackend = (bbModule as any).UltraHonkBackend;
    
    if (!BarretenbergAPI || !UltraHonkBackend) {
      const exports = Object.keys(bbModule);
      throw new Error(
        `Could not find Barretenberg or UltraHonkBackend in @aztec/bb.js exports. ` +
        `Available: ${exports.join(', ')}`
      );
    }
    
    return { Barretenberg: BarretenbergAPI, UltraHonkBackend };
  } catch (error) {
    throw new Error(
      `Failed to load @aztec/bb.js: ${error instanceof Error ? error.message : String(error)}. ` +
      `Install it with: npm install @aztec/bb.js`
    );
  }
}

export interface ProofInputs {
  walletSecretKey: Uint8Array;
  randomSecret: bigint;
  walletPubkeyHash: bigint;
  domainHash: bigint;
  nullifier: bigint;
}

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: {
    walletPubkeyHash: string;
    domainHash: string;
    nullifier: string;
  };
}

// * Cached Noir instance and backend
let noirInstance: Noir | null = null;
let backendInstance: BarretenbergBackend | null = null;

/**
 * * Exports the verification key from the compiled circuit
 * * This can be used to generate the verification key for on-chain verification
 * * 
 * * NOTE: Based on research, Barretenberg may output binary or JSON format.
 * * For JSON-based conversion (recommended), use exportVerificationKeyAsJson() instead.
 */
export async function exportVerificationKey(): Promise<Uint8Array> {
  const { noir, backend } = await initializeNoir();
  
  try {
    // * CRITICAL: Generate a proof FIRST to properly initialize the backend
    // * The backend needs to be "warmed up" with a proof generation before VK extraction works
    console.log('🔧 Generating proof to initialize backend state...');
    
    // * Generate valid inputs that satisfy circuit constraints
    // * Use same helper functions as prepareProofInputs to ensure consistency
    const walletSecretKey = new Uint8Array(32).fill(1);
    const randomSecret = generateRandomSecret();
    const domainHash = await hashDomain('test-domain');
    const walletPubkeyHash = await computeWalletPubkeyHash(walletSecretKey);
    const nullifier = await computeNullifier(walletPubkeyHash, domainHash, randomSecret);
    
    // * Generate proof - this initializes the backend's internal state
    const circuitInputs = {
      wallet_secret_key: Array.from(walletSecretKey),
      random_secret: randomSecret.toString(),
      wallet_pubkey_hash: walletPubkeyHash.toString(),
      domain_hash: domainHash.toString(),
      nullifier: nullifier.toString()
    };
    
    // * Use Noir.execute() to get witness (correct API)
    const { witness } = await noir.execute(circuitInputs);
    
    // * Generate proof using backend (backend.generateProof returns ProofData)
    const proofData = await backend.generateProof(witness);
    console.log('✅ Proof generated, backend is now initialized');
    
    // * Wait for backend to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // * TRY ALTERNATIVE: Use generateRecursiveProofArtifacts to get VK as fields
    // * This might work even if getVerificationKey() doesn't
    console.log('🔑 Attempting to extract verification key...');
    let vk: Uint8Array | null = null;
    
    try {
      // * Method 1: Try getVerificationKey() directly
      console.log('Trying getVerificationKey()...');
      vk = await backend.getVerificationKey();
      console.log('✅ getVerificationKey() succeeded!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('getVerificationKey() failed:', errorMsg);
      
      // * Method 2: Try generateRecursiveProofArtifacts (returns vkAsFields)
      // * Note: This requires a recursive circuit, but might still give us VK data
      try {
        console.log('Trying generateRecursiveProofArtifacts() as fallback...');
        const artifacts = await backend.generateRecursiveProofArtifacts(proofData, 3); // 3 public inputs
        console.log('generateRecursiveProofArtifacts succeeded, but VK is in field format, not binary');
        console.log('vkAsFields length:', artifacts.vkAsFields.length);
        
        // * Convert field elements back to binary (this is complex and may not work)
        // * For now, throw an error explaining the limitation
        throw new Error(
          'VK extraction via JavaScript API is not supported in this backend version.\n\n' +
          'SOLUTION: Use nargo CLI to extract verification key:\n\n' +
          '  1. cd packages/circuit\n' +
          '  2. nargo execute  # This generates proof artifacts\n' +
          '  3. Check if VK is in target/ directory\n\n' +
          'OR manually extract from proof generation process.\n\n' +
          'The JavaScript backend does not support direct VK extraction.'
        );
      } catch (fallbackError) {
        throw new Error(
          `❌ Verification key extraction is NOT supported in @noir-lang/backend_barretenberg@0.36.0\n\n` +
          `The getVerificationKey() method causes WebAssembly panics.\n\n` +
          `🔧 WORKING SOLUTION:\n` +
          `   Use nargo CLI to generate the verification key:\n\n` +
          `   1. cd packages/circuit\n` +
          `   2. nargo execute  # Generates proof and may expose VK\n` +
          `   3. Check target/ directory for VK files\n\n` +
          `   OR check if nargo has a VK export command in future versions.\n\n` +
          `📝 Note: The JavaScript API limitation is a known issue with this backend version.\n` +
          `   The VK must be extracted via CLI or a different backend version.\n\n` +
          `Original error: ${errorMsg}`
        );
      }
    }
    
    if (!vk || (vk instanceof Uint8Array && vk.length === 0)) {
      throw new Error('Verification key is empty');
    }
    
    console.log('Verification key retrieved, type:', typeof vk, 'is Uint8Array:', vk instanceof Uint8Array);
    
    // * Handle both binary and JSON formats
    if (vk instanceof Uint8Array) {
      if (vk.length === 0) {
        throw new Error('Verification key is empty. The circuit may be invalid or corrupted. Try recompiling: cd packages/circuit && nargo compile');
      }
      console.log(`Verification key size: ${vk.length} bytes (binary format)`);
      return vk;
    }
    
    // * If JSON format, convert to Uint8Array for backward compatibility
    if (typeof vk === 'object' && vk !== null) {
      const jsonString = JSON.stringify(vk);
      console.log('Verification key is JSON format, converted to bytes');
      return new TextEncoder().encode(jsonString);
    }
    
    throw new Error('Verification key format not recognized');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    // * Provide more helpful error messages
    if (message.includes('unreachable')) {
      throw new Error(
        `WebAssembly panic: The circuit bytecode may be incompatible with the Barretenberg backend version. ` +
        `This often happens when:\n` +
        `1. Circuit was compiled with a different Noir version\n` +
        `2. Backend version mismatch\n` +
        `Try: cd packages/circuit && nargo compile\n` +
        `Original error: ${message}`
      );
    }
    
    throw new Error(`Failed to export verification key: ${message}. Make sure the circuit is compiled correctly with nargo compile.`);
  }
}

/**
 * * Exports verification key as JSON string (recommended for cross-system compatibility)
 * * Based on research: JSON format is easier to convert to Arkworks format
 */
export async function exportVerificationKeyAsJson(): Promise<string> {
  const { backend } = await initializeNoir();
  
  try {
    // * Wait a bit for backend to fully initialize (WebAssembly needs time)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // * Get verification key
    const vk = await backend.getVerificationKey();
    
    // * If already JSON, return as string
    if (typeof vk === 'object' && !(vk instanceof Uint8Array)) {
      return JSON.stringify(vk, null, 2);
    }
    
    // * If binary, we can't easily convert without knowing the structure
    // * Log a warning and return empty JSON (user should check backend configuration)
    if (vk instanceof Uint8Array) {
      console.warn(
        '⚠️ Verification key is in binary format. ' +
        'For JSON-based conversion (recommended), check if Barretenberg backend ' +
        'supports JSON output option. Returning binary as base64-encoded JSON.'
      );
      // * Return binary as base64 in JSON wrapper for now
      const base64 = btoa(String.fromCharCode(...vk));
      return JSON.stringify({
        format: 'binary',
        data: base64,
        note: 'This is binary format. For JSON format, check backend configuration.'
      }, null, 2);
    }
    
    throw new Error('Verification key format not recognized');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to export verification key as JSON: ${message}. Make sure the circuit is compiled correctly with nargo compile.`);
  }
}

/**
 * * Initializes Noir backend and loads circuit
 * * This is called lazily on first proof generation
 */
async function initializeNoir(): Promise<{ noir: Noir; backend: BarretenbergBackend }> {
  if (noirInstance && backendInstance) {
    return { noir: noirInstance, backend: backendInstance };
  }

  try {
    // * Load compiled circuit
    const { circuit: circuitData } = await loadCircuit();

    // * Validate circuit data structure
    if (!circuitData || !circuitData.bytecode) {
      throw new Error('Invalid circuit data: missing bytecode. Make sure the circuit is compiled.');
    }

    // * Validate circuit version compatibility
    if (circuitData.noir_version && !circuitData.noir_version.includes('1.0.0-beta')) {
      console.warn(`Circuit compiled with Noir ${circuitData.noir_version}, but backend expects 1.0.0-beta.x`);
    }

    // * Initialize Barretenberg backend with the circuit object
    // * BarretenbergBackend expects the full circuit JSON with bytecode
    // * This may take time as it initializes WebAssembly
    console.log('Initializing Barretenberg backend (this may take a moment)...');
    
    // * Validate bytecode exists and is not empty
    if (!circuitData.bytecode || circuitData.bytecode.length === 0) {
      throw new Error('Circuit bytecode is empty. Please recompile the circuit with: cd packages/circuit && nargo compile');
    }
    
    try {
      backendInstance = new BarretenbergBackend(circuitData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Barretenberg backend: ${message}. This may indicate a version mismatch between Noir and Barretenberg. Try: cd packages/circuit && nargo compile`);
    }
    
    // * Wait for backend to be ready (WebAssembly initialization is async)
    // * The backend constructor is synchronous but WASM loading happens in background
    // * Increase wait time for complex circuits
    await new Promise(resolve => setTimeout(resolve, 1000));

    // * Initialize Noir instance with the full circuit object
    console.log('Initializing Noir instance...');
    try {
      noirInstance = new Noir(circuitData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Noir instance: ${message}`);
    }

    return { noir: noirInstance, backend: backendInstance };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Noir initialization error:', { message, stack });
    throw new Error(`Failed to initialize Noir backend: ${message}. Make sure the circuit is compiled correctly with 'nargo compile' and the bytecode is valid.`);
  }
}

/**
 * * Generates proof inputs from sign-in options and wallet data
 * * This prepares the data structure that will be passed to the Noir circuit
 */
export async function prepareProofInputs(
  options: SignInOptions,
  walletSecretKey: Uint8Array
): Promise<ProofInputs> {
  // * Generate random secret for nullifier uniqueness
  const randomSecret = generateRandomSecret();
  
  // * Hash domain for circuit input
  const domainHash = await hashDomain(options.domain);
  
  // * Compute wallet pubkey hash (commitment)
  const walletPubkeyHash = await computeWalletPubkeyHash(walletSecretKey);
  
  // * Compute nullifier (will be verified by circuit)
  const nullifier = await computeNullifier(walletPubkeyHash, domainHash, randomSecret);
  
  return {
    walletSecretKey,
    randomSecret,
    walletPubkeyHash,
    domainHash,
    nullifier
  };
}

/**
 * * Generates a ZK proof using the compiled Noir circuit
 * * Uses Noir WASM backend for actual proof generation
 */
export async function generateProof(inputs: ProofInputs): Promise<ProofResult> {
  // * Initialize Noir if not already done
  const { noir, backend } = await initializeNoir();

  // * Prepare inputs in format expected by Noir circuit
  // * Circuit expects:
  // * - wallet_secret_key: [u8; 32] (private)
  // * - random_secret: Field (private)
  // * - wallet_pubkey_hash: Field (public)
  // * - domain_hash: Field (public)
  // * - nullifier: Field (public)
  const circuitInputs = {
    wallet_secret_key: Array.from(inputs.walletSecretKey),
    random_secret: inputs.randomSecret.toString(),
    wallet_pubkey_hash: inputs.walletPubkeyHash.toString(),
    domain_hash: inputs.domainHash.toString(),
    nullifier: inputs.nullifier.toString()
  };

  try {
    // * Use Noir.execute() to get witness (this is the correct API)
    const { witness } = await noir.execute(circuitInputs);

    // * Generate proof using backend (backend.generateProof returns ProofData)
    const proofData = await backend.generateProof(witness);
    const proof = proofData.proof; // * Uint8Array
    const publicInputs = proofData.publicInputs; // * string[]

    // * Proof is already Uint8Array from ProofData
    const proofBytes = proof;

    // * Extract public inputs (they're returned as string array)
    const publicInputsArray = publicInputs;
    
    return {
      proof: proofBytes,
      publicInputs: {
        walletPubkeyHash: publicInputsArray[0]?.toString() || inputs.walletPubkeyHash.toString(),
        domainHash: publicInputsArray[1]?.toString() || inputs.domainHash.toString(),
        nullifier: publicInputsArray[2]?.toString() || inputs.nullifier.toString()
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Proof generation failed: ${message}`);
  }
}

/**
 * * Verifies UltraHonk proof using WASM backend
 * * This is the off-chain verification that happens before submitting to Solana
 * * 
 * * Uses the same BarretenbergBackend that generated the proof for verification
 * * This ensures format compatibility
 * * 
 * * @param proof - The proof bytes (Uint8Array) from generateProof()
 * * @param publicInputs - The public inputs from generateProof()
 * * @returns Promise<boolean> - true if proof is valid, false otherwise
 */
export async function verifyProof(
  proof: Uint8Array,
  publicInputs?: { walletPubkeyHash: string; domainHash: string; nullifier: string }
): Promise<boolean> {
  try {
    // * Use the same backend that generated the proof for verification
    // * This ensures format compatibility
    const { noir, backend } = await initializeNoir();
    
    // * Load circuit to get verification key
    const { circuit } = await loadCircuit();
    
    if (!circuit || !circuit.bytecode) {
      throw new Error('Circuit bytecode not found. Make sure the circuit is compiled.');
    }
    
    console.log('🔍 Verifying proof using Barretenberg backend...');
    
    // * The BarretenbergBackend should have a verify method
    // * Check if backend has verifyProof method
    if (typeof (backend as any).verifyProof === 'function') {
      // * Verify using backend's verifyProof method
      const isValid = await (backend as any).verifyProof(proof);
      
      if (isValid) {
        console.log('✅ Proof verified successfully!');
      } else {
        console.log('❌ Proof verification failed!');
      }
      
      return isValid;
    }
    
    // * Fallback: Try @aztec/bb.js if available
    try {
      const { Barretenberg, UltraHonkBackend } = await loadBarretenbergAPI();
      
      console.log('🔍 Initializing @aztec/bb.js for verification...');
      const barretenbergAPI = await Barretenberg.new();
      const ultraHonkBackend = new UltraHonkBackend(circuit.bytecode, barretenbergAPI);
      
      // * Verify proof
      console.log('🔐 Verifying proof...');
      const isValid = await ultraHonkBackend.verifyProof(proof);
      
      if (isValid) {
        console.log('✅ Proof verified successfully!');
      } else {
        console.log('❌ Proof verification failed!');
      }
      
      return isValid;
    } catch (bbError) {
      // * @aztec/bb.js verification failed
      // * This should not happen if the package is properly installed
      // * Throw error instead of accepting invalid proofs
      const errorMessage = bbError instanceof Error ? bbError.message : String(bbError);
      throw new Error(
        `Proof verification failed: ${errorMessage}. ` +
        `Make sure @aztec/bb.js is properly installed (npm install @aztec/bb.js) ` +
        `and the proof format matches the circuit bytecode.`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Proof verification error:', message);
    return false;
  }
}

/**
 * * Creates verification result data for Solana program
 * * This includes the proof hash, verification status, timestamp, and signature
 * * 
 * * @param proof - The proof bytes
 * * @param isValid - Whether the proof is valid (from verifyProof)
 * * @param signature - Ed25519 signature from wallet (64 bytes)
 * * @returns Verification result data (105 bytes) ready for Solana instruction
 */
export async function createVerificationResult(
  proof: Uint8Array,
  isValid: boolean,
  signature: Uint8Array
): Promise<Uint8Array> {
  // * Hash the proof (SHA256) - async for browser compatibility
  const proofHash = await hashProofAsync(proof);
  
  // * Get current timestamp (Unix timestamp in seconds)
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  
  // * Format: [1 byte: is_valid] [32 bytes: proof_hash] [8 bytes: timestamp (little-endian)] [64 bytes: signature]
  const result = new Uint8Array(105);
  result[0] = isValid ? 1 : 0;
  result.set(proofHash, 1);
  
  // * Write timestamp as little-endian u64 (8 bytes)
  const timestampBytes = new Uint8Array(8);
  const timestampView = new DataView(timestampBytes.buffer);
  timestampView.setBigUint64(0, timestamp, true); // true = little-endian
  result.set(timestampBytes, 33);
  
  // * Write signature (64 bytes)
  if (signature.length !== 64) {
    throw new Error(`Signature must be 64 bytes, got ${signature.length}`);
  }
  result.set(signature, 41);
  
  return result;
}

/**
 * * Async version of hashProof for browser and Node.js environments
 */
export async function hashProofAsync(proof: Uint8Array): Promise<Uint8Array> {
  if (globalThis.crypto?.subtle) {
    // * Browser: use crypto.subtle (async)
    const dataBuffer = new Uint8Array(proof).buffer;
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    return new Uint8Array(hashBuffer);
  }
  
  // * Node.js fallback
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(proof).digest();
}

// * Helper functions

function generateRandomSecret(): bigint {
  // Generate cryptographically secure random value
  const array = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for Node.js
    const { randomBytes } = require('node:crypto');
    array.set(randomBytes(32));
  }
  
  // Convert to bigint
  let result = 0n;
  for (let i = 0; i < array.length; i++) {
    result = result * 256n + BigInt(array[i]);
  }
  // * Apply field modulus to ensure value is within valid range
  return applyFieldModulus(result);
}

// * BN254 field modulus (same as Noir uses)
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * * Applies field modulus to ensure value is within valid range
 * * Noir circuits use BN254 field arithmetic, so all values must be < FIELD_MODULUS
 */
function applyFieldModulus(value: bigint): bigint {
  return value % FIELD_MODULUS;
}

async function hashDomain(domain: string): Promise<bigint> {
  // * Hash domain string to Field
  // * Uses same hash function as circuit (simple_hash)
  const encoder = new TextEncoder();
  const data = encoder.encode(domain);
  
  // * Convert bytes to Field (matches circuit's bytes_to_field)
  let hash = 0n;
  for (const byte of data) {
    hash = hash * 256n + BigInt(byte);
  }
  // * Apply same transformation as circuit: simple_hash(input) = input * 7 + 13
  // * Apply field modulus to ensure value is within valid range
  const result = hash * 7n + 13n;
  return applyFieldModulus(result);
}

async function computeWalletPubkeyHash(secretKey: Uint8Array): Promise<bigint> {
  // * Convert secret key bytes to Field (matches circuit's bytes_to_field)
  let secretField = 0n;
  for (let i = 0; i < secretKey.length; i++) {
    secretField = secretField * 256n + BigInt(secretKey[i]);
  }
  
  // * Apply same hash as circuit: simple_hash(secret_field) = secret_field * 7 + 13
  // * Apply field modulus to ensure value is within valid range
  const result = secretField * 7n + 13n;
  return applyFieldModulus(result);
}

async function computeNullifier(
  pubkeyHash: bigint,
  domainHash: bigint,
  randomSecret: bigint
): Promise<bigint> {
  // * Apply same hash_3 as circuit: simple_hash_3(a, b, c) = (a * 11 + b * 13 + c * 17) * 19 + 23
  // * Apply field modulus to ensure value is within valid range
  const result = (pubkeyHash * 11n + domainHash * 13n + randomSecret * 17n) * 19n + 23n;
  return applyFieldModulus(result);
}
