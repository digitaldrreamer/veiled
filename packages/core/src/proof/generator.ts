// * Proof generation module for Veiled
// * Generates zero-knowledge proofs using compiled Noir circuits
// * Verifies proofs using WASM backend (@aztec/bb.js)

// * IMMEDIATE LOG - MODULE LOADED
console.log('🔵 [VEILED] ========================================');
console.log('🔵 [VEILED] generator.ts MODULE LOADED');
console.log('🔵 [VEILED] ========================================');
// * SUPER OBVIOUS - CANNOT MISS THIS
if (typeof window !== 'undefined') {
  console.error('🔴🔴🔴 GENERATOR.TS LOADED 🔴🔴🔴');
  console.error('🔴🔴🔴 IF YOU SEE THIS, MODULE IS LOADING 🔴🔴🔴');
}

import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend, type BackendOptions } from '@aztec/bb.js';

// * CircuitOptions is not exported from main index, define it locally
type CircuitOptions = {
  recursive: boolean;
};
// * Beta.3: No manual WASM initialization needed - Noir.js handles it internally
import { loadCircuit, type CircuitType } from './circuit-loader.js';
import type { SignInOptions } from '../types.js';
import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import type { Wallet } from '@coral-xyz/anchor';
import { logger } from '../utils/logger.js';
import { QuicknodeClient } from '../providers/quicknode-client.js';

// * Beta.3: No WASM initialization needed - Noir.js handles it internally

export interface ProofInputs {
  walletSecretKey: Uint8Array;
  randomSecret: bigint;
  walletPubkeyHash: bigint;
  domainHash: bigint;
  nullifier: bigint;
}

export interface BalanceRangeProofInputs extends ProofInputs {
  actualBalance: bigint; // * Actual balance in lamports (private input)
  minimumBalance: bigint;
  balanceRangeBucket: number;
}

export interface NFTOwnershipProofInputs extends ProofInputs {
  nftMintAddress: Uint8Array; // * Specific NFT mint address (private - not revealed)
  collectionAddress: Uint8Array; // * NFT collection address (public)
}

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: {
    walletPubkeyHash: string;
    domainHash: string;
    nullifier: string;
  };
  // * Full public inputs array from backend (for verification)
  // * For wallet_ownership: [wallet_pubkey_hash, domain_hash, nullifier] (3 elements)
  // * For balance_range: [wallet_pubkey_hash, minimum_balance, balance_range_bucket, domain_hash, nullifier] (5 elements)
  // * For nft_ownership: [wallet_pubkey_hash, collection_address, domain_hash, nullifier] (4 elements)
  publicInputsArray: string[];
  circuitType: CircuitType;
}

// * Cached Noir instances and backends per circuit type
const noirInstances: Partial<Record<CircuitType, Noir>> = {};
const backendInstances: Partial<Record<CircuitType, UltraHonkBackend>> = {};

/**
 * * Exports the verification key from the compiled circuit
 * * This can be used to generate the verification key for on-chain verification
 * * 
 * * NOTE: Based on research, Barretenberg may output binary or JSON format.
 * * For JSON-based conversion (recommended), use exportVerificationKeyAsJson() instead.
 */
export async function exportVerificationKey(): Promise<Uint8Array> {
  const { noir, backend } = await initializeNoir('wallet_ownership');
  
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
        // * generateRecursiveProofArtifacts expects Uint8Array (proof bytes), not ProofData
        const artifacts = await backend.generateRecursiveProofArtifacts(proofData.proof, 3); // 3 public inputs
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
  const { backend } = await initializeNoir('wallet_ownership');
  
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
 * * Uses @aztec/bb.js with beta.3 compatible versions
 * * Beta.3: No manual WASM initialization needed - Noir.js handles it internally
 */
async function initializeNoir(
  circuitType: CircuitType = 'wallet_ownership'
): Promise<{ noir: Noir; backend: UltraHonkBackend }> {
  console.log('🔵 [VEILED] ========================================');
  console.log('🔵 [VEILED] initializeNoir() called for circuit:', circuitType);
  
  // * Beta.3: No WASM initialization needed - Noir.js handles it internally
  
  // * Return cached instance for this specific circuit type
  if (noirInstances[circuitType] && backendInstances[circuitType]) {
    console.log('🔵 [VEILED] Using cached Noir instance for:', circuitType);
    return { 
      noir: noirInstances[circuitType]!, 
      backend: backendInstances[circuitType]! 
    };
  }

  try {
    console.log('🔵 [VEILED] Loading compiled circuit...');
    // * Load compiled circuit (bytecode format is handled automatically by framework)
    const { circuit: circuitData } = await loadCircuit(circuitType);
    console.log('🔵 [VEILED] Circuit loaded, bytecode length:', circuitData.bytecode?.length || 0);

    // * Validate circuit data structure
    if (!circuitData || !circuitData.bytecode) {
      console.error('🔴 [VEILED] Invalid circuit data: missing bytecode');
      throw new Error('Invalid circuit data: missing bytecode. Make sure the circuit is compiled.');
    }

    // * Validate circuit version compatibility (should be beta.3)
    if (circuitData.noir_version && !circuitData.noir_version.includes('1.0.0-beta.3')) {
      console.warn('🔴 [VEILED] Version warning:', `Circuit compiled with Noir ${circuitData.noir_version}, but recommended version is 1.0.0-beta.3`);
    }

    // * Step 2: Initialize UltraHonkBackend with circuit bytecode
    // * UltraHonkBackend constructor: (acirBytecode: string, backendOptions?: BackendOptions, circuitOptions?: CircuitOptions)
    // * It creates its own Barretenberg instance internally - no need to pass one
    console.log('🔵 [VEILED] Initializing UltraHonkBackend...');
    console.log('🔵 [VEILED] Circuit data structure:', {
      hasBytecode: !!circuitData.bytecode,
      bytecodeType: typeof circuitData.bytecode,
      bytecodeIsArray: Array.isArray(circuitData.bytecode),
      bytecodeLength: circuitData.bytecode?.length,
      hasAbi: !!circuitData.abi,
      hasHash: !!circuitData.hash,
      noirVersion: circuitData.noir_version
    });
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:320',message:'CIRCUIT_VERSION_CHECK',data:{noirVersion:circuitData.noir_version,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    try {
      // * UltraHonkBackend expects bytecode as base64 string (it handles decompression internally)
      // * If bytecode is already an array, we need to convert it back to base64
      let bytecodeString: string;
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:327',message:'BEFORE_BYTECODE_CONVERSION',data:{bytecodeType:typeof circuitData.bytecode,bytecodeIsArray:Array.isArray(circuitData.bytecode),bytecodeLength:circuitData.bytecode?.length,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (typeof circuitData.bytecode === 'string') {
        bytecodeString = circuitData.bytecode;
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:330',message:'BYTECODE_IS_STRING',data:{bytecodeLength:bytecodeString.length,firstChars:bytecodeString.substring(0,20),circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } else if (Array.isArray(circuitData.bytecode)) {
        // * Convert array back to base64 string (UltraHonkBackend expects base64)
        const uint8Array = new Uint8Array(circuitData.bytecode);
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:335',message:'BEFORE_ARRAY_TO_BASE64',data:{arrayLength:uint8Array.length,firstBytes:Array.from(uint8Array.slice(0,5)),hasBuffer:typeof Buffer!=='undefined',circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (typeof Buffer !== 'undefined') {
          bytecodeString = Buffer.from(uint8Array).toString('base64');
        } else {
          bytecodeString = btoa(String.fromCharCode(...uint8Array));
        }
        // #region agent log
        fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:342',message:'AFTER_ARRAY_TO_BASE64',data:{base64Length:bytecodeString.length,firstChars:bytecodeString.substring(0,20),circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } else {
        throw new Error('Circuit bytecode must be a string or array');
      }
      
      const backendOptions: BackendOptions = { threads: 1 };
      const circuitOptions: CircuitOptions = { recursive: false };
      
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:349',message:'BEFORE_ULTRAHONK_CONSTRUCTOR',data:{bytecodeStringLength:bytecodeString.length,backendOptions,circuitOptions,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      backendInstances[circuitType] = new UltraHonkBackend(
        bytecodeString,
        backendOptions,
        circuitOptions
      );
      // #region agent log
      fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:355',message:'AFTER_ULTRAHONK_CONSTRUCTOR',data:{success:true,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('🔵 [VEILED] ✅ UltraHonkBackend created successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:357',message:'ULTRAHONK_CONSTRUCTOR_ERROR',data:{error:message,stack:error instanceof Error?error.stack:undefined,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('🔴 [VEILED] ❌ Failed to create UltraHonkBackend:', message);
    console.error('🔴 [VEILED] Stack:', error instanceof Error ? error.stack : undefined);
    throw new Error(`Failed to initialize UltraHonkBackend: ${message}. Make sure the circuit is compiled with nargo 1.0.0-beta.3: cd packages/circuit && nargo compile`);
  }

    // * Step 3: Initialize Noir instance with the full circuit object
    // * Beta.3: Noir constructor takes circuit directly, no backend parameter
    console.log(`🔵 [VEILED] Initializing Noir instance for ${circuitType} circuit...`);
    try {
      // * Beta.3: Noir.js uses the circuit as-is (no format conversion needed)
      noirInstances[circuitType] = new Noir(circuitData);
      // * Beta.3: Call init() to ensure Noir is ready (marked @ignore but may be needed)
      await noirInstances[circuitType]!.init();
      console.log('🔵 [VEILED] ✅ Noir instance created and initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 [VEILED] ❌ Failed to create Noir instance:', message);
      console.error('🔴 [VEILED] Stack:', error instanceof Error ? error.stack : undefined);
      throw new Error(`Failed to initialize Noir instance: ${message}`);
    }

    console.log('🔵 [VEILED] ✅ Noir initialization complete for:', circuitType);
    console.log('🔵 [VEILED] ========================================');
    return { 
      noir: noirInstances[circuitType]!, 
      backend: backendInstances[circuitType]! 
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('🔴 [VEILED] ========================================');
    console.error('🔴 [VEILED] ❌ Noir initialization FAILED');
    console.error('🔴 [VEILED] Circuit type:', circuitType);
    console.error('🔴 [VEILED] Error:', message);
    console.error('🔴 [VEILED] Stack:', stack);
    console.error('🔴 [VEILED] ========================================');
    throw new Error(`Failed to initialize Noir backend: ${message}. Make sure the circuit is compiled correctly with 'nargo compile' (using nargo 1.0.0-beta.3) and the bytecode is valid.`);
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
 * * Prepares inputs for the NFT ownership circuit
 * * Fetches NFT data from Quicknode DAS API (Solana) and formats for circuit
 * * Uses Metaplex DAS getAssetsByOwner method for Solana NFTs
 */
export async function prepareNFTOwnershipCircuitInputs(
  options: SignInOptions,
  walletSecretKey: Uint8Array,
  quicknodeClient: QuicknodeClient,
  wallet: Wallet
): Promise<NFTOwnershipProofInputs> {
  if (!options.requirements.nft?.collection) {
    throw new Error('NFT collection is required for NFT ownership circuit');
  }

  // * Fetch NFTs using DAS API (getAssetsByOwner) for Solana
  console.log('🔵 [VEILED] Fetching NFTs for wallet:', wallet.publicKey.toBase58());
  const dasData = await quicknodeClient.getAssetsByOwner(
    wallet.publicKey.toBase58(),
    { limit: 100 }
  );

  console.log('🔵 [VEILED] DAS API response:', {
    total: dasData.result?.total,
    itemsCount: dasData.result?.items?.length,
    hasError: !!dasData.error
  });

  if (dasData.error) {
    throw new Error(
      `Quicknode DAS API error: ${dasData.error.message} (code: ${dasData.error.code}). ` +
      `Wallet: ${wallet.publicKey.toBase58()}`
    );
  }

  if (!dasData.result?.items || dasData.result.items.length === 0) {
    throw new Error(
      `No NFTs found for wallet ${wallet.publicKey.toBase58()} on devnet. ` +
      `Make sure you have NFTs in your wallet. ` +
      `You can mint test NFTs using: bun run mint-devnet-nft`
    );
  }

  // * Filter by collection from grouping array
  // * Collection is stored in item.grouping where group_key === "collection"
  const collectionAddress = options.requirements.nft.collection;
  const nftsInCollection = dasData.result.items.filter(item => {
    // * Skip burnt NFTs
    if (item.burnt) return false;
    
    // * Extract collection from grouping array
    const collection = item.grouping?.find(g => g.group_key === "collection");
    return collection?.group_value === collectionAddress;
  });

  if (nftsInCollection.length === 0) {
    // * Provide helpful error message with available NFTs
    const availableNfts = dasData.result.items.filter(item => !item.burnt);
    const availableCollections = availableNfts
      .flatMap(item => item.grouping?.filter(g => g.group_key === "collection") || [])
      .map(g => g.group_value)
      .filter((v, i, arr) => arr.indexOf(v) === i); // * Unique values
    
    let errorMessage = `No NFTs found in collection ${collectionAddress}.\n`;
    errorMessage += `   Wallet: ${wallet.publicKey.toBase58()}\n`;
    errorMessage += `   Total NFTs found: ${availableNfts.length}\n`;
    
    if (availableCollections.length > 0) {
      errorMessage += `   Available collections: ${availableCollections.join(', ')}\n`;
    } else {
      errorMessage += `   ⚠️  No verified collections found. NFTs may need collection verification.\n`;
      errorMessage += `   Found NFT IDs: ${availableNfts.slice(0, 5).map(n => n.id).join(', ')}${availableNfts.length > 5 ? '...' : ''}\n`;
    }
    
    errorMessage += `\n💡 Tip: If you just minted this NFT, the collection may need to be verified.`;
    errorMessage += `\n   Run: bun run mint-devnet-nft (with collection verification enabled)`;
    
    throw new Error(errorMessage);
  }

  // * Use first NFT from collection (or could allow user to select)
  const nft = nftsInCollection[0];
  
  // * Convert collection address and NFT mint to bytes
  // * For Solana, addresses are base58 strings - decode using PublicKey
  let collectionAddressBytes: Uint8Array;
  let nftMintAddress: Uint8Array;
  
  try {
    // * Collection address from user input
    const collectionPubkey = new PublicKey(collectionAddress);
    collectionAddressBytes = collectionPubkey.toBytes();
    
    // * NFT mint address from DAS item.id (this is the DAS asset identifier)
    // * For Solana NFTs, item.id is the mint address
    const nftMintPubkey = new PublicKey(nft.id);
    nftMintAddress = nftMintPubkey.toBytes();
  } catch (error) {
    throw new Error(
      `Invalid address format: ${error instanceof Error ? error.message : String(error)}. ` +
      `Collection: ${collectionAddress}, NFT ID: ${nft.id}`
    );
  }

  // * Reuse domain/wallet hash + nullifier logic
  const randomSecret = generateRandomSecret();
  const domainHash = await hashDomain(options.domain);
  const walletPubkeyHash = await computeWalletPubkeyHash(walletSecretKey);
  const nullifier = await computeNullifier(walletPubkeyHash, domainHash, randomSecret);

  return {
    walletSecretKey,
    randomSecret,
    walletPubkeyHash,
    domainHash,
    nullifier,
    nftMintAddress,      // * Private - specific NFT (not revealed) - now correctly using item.id
    collectionAddress: collectionAddressBytes    // * Public - collection address (revealed)
  };
}

/**
 * * Prepares inputs for the balance range circuit
 */
export async function prepareBalanceRangeCircuitInputs(
  options: SignInOptions,
  walletSecretKey: Uint8Array,
  connection: Connection,
  wallet: Wallet
): Promise<BalanceRangeProofInputs> {
  // * Fetch actual balance in lamports
  const balanceLamports = BigInt(await connection.getBalance(wallet.publicKey));

  const minimumConfig = options.requirements.balance?.minimum ?? 0;
  const minimumBalance = BigInt(minimumConfig);

  if (balanceLamports < minimumBalance) {
    throw new Error(
      `Insufficient balance: ${balanceLamports} lamports < ${minimumBalance} required`
    );
  }

  // * Reuse domain/wallet hash + nullifier logic
  const randomSecret = generateRandomSecret();
  const domainHash = await hashDomain(options.domain);
  const walletPubkeyHash = await computeWalletPubkeyHash(walletSecretKey);
  const nullifier = await computeNullifier(walletPubkeyHash, domainHash, randomSecret);

  const balanceRangeBucket = computeRangeBucket(balanceLamports);

  return {
    walletSecretKey,
    randomSecret,
    walletPubkeyHash,
    domainHash,
    nullifier,
    actualBalance: balanceLamports, // * Include actual balance for circuit
    minimumBalance,
    balanceRangeBucket
  };
}

/**
 * * Generates a ZK proof using the compiled Noir circuit
 * * Uses Noir WASM backend for actual proof generation
 */
export async function generateProof(
  inputs: ProofInputs | BalanceRangeProofInputs | NFTOwnershipProofInputs,
  circuitType: CircuitType = 'wallet_ownership'
): Promise<ProofResult> {
  // #region agent log
  fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:455',message:'generateProof_ENTRY',data:{circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  console.log('🔵 [VEILED] ========================================');
  console.log('🔵 [VEILED] generateProof() called');
  console.log('🔵 [VEILED] Circuit type:', circuitType);
  console.log('🔵 [VEILED] Inputs:', inputs);
  
  logger.group(`Generating proof for circuit: ${circuitType}`);
  
  try {
  // * Initialize Noir if not already done
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:470',message:'BEFORE_INITIALIZE_NOIR',data:{circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] Initializing Noir backend...');
    logger.info('Initializing Noir backend...');
    const { noir, backend } = await initializeNoir(circuitType);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:473',message:'AFTER_INITIALIZE_NOIR',data:{hasNoir:!!noir,hasBackend:!!backend,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] Noir backend initialized:', { noir: !!noir, backend: !!backend });
    logger.debug('Noir backend initialized');

  // * Prepare inputs in format expected by Noir circuit
    // * Noir.js expects InputMap which is Record<string, InputValue>
    // * InputValue can be: string | number | bigint | boolean | InputValue[] | { [key: string]: InputValue }
    let circuitInputs: Record<string, string | number | number[]> | null = null;

    console.log('🔵 [VEILED] Preparing circuit inputs...');
    logger.debug('Preparing circuit inputs...');
    if (circuitType === 'wallet_ownership') {
    // * Wallet ownership circuit expects:
  // * - wallet_secret_key: [u8; 32] (private)
  // * - random_secret: Field (private)
  // * - wallet_pubkey_hash: Field (public)
  // * - domain_hash: Field (public)
  // * - nullifier: Field (public)
    circuitInputs = {
    wallet_secret_key: Array.from(inputs.walletSecretKey),
    random_secret: inputs.randomSecret.toString(),
    wallet_pubkey_hash: inputs.walletPubkeyHash.toString(),
    domain_hash: inputs.domainHash.toString(),
    nullifier: inputs.nullifier.toString()
  };
    logger.debug('Wallet ownership inputs prepared:', {
      wallet_secret_key_length: Array.isArray(circuitInputs.wallet_secret_key) ? circuitInputs.wallet_secret_key.length : 0,
      has_random_secret: !!circuitInputs.random_secret,
      has_wallet_pubkey_hash: !!circuitInputs.wallet_pubkey_hash,
      has_domain_hash: !!circuitInputs.domain_hash,
      has_nullifier: !!circuitInputs.nullifier
    });
  } else if (circuitType === 'balance_range') {
    const balanceInputs = inputs as BalanceRangeProofInputs;
    // * Balance range circuit expects:
    // * - wallet_secret_key: [u8; 32] (private)
    // * - actual_balance: u64 (private)
    // * - random_secret: Field (private)
    // * - wallet_pubkey_hash: Field (public)
    // * - minimum_balance: u64 (public)
    // * - balance_range_bucket: u64 (public)
    // * - domain_hash: Field (public)
    // * - nullifier: Field (public)
    circuitInputs = {
      wallet_secret_key: Array.from(balanceInputs.walletSecretKey),
      actual_balance: balanceInputs.actualBalance.toString(),
      random_secret: balanceInputs.randomSecret.toString(),
      wallet_pubkey_hash: balanceInputs.walletPubkeyHash.toString(),
      minimum_balance: balanceInputs.minimumBalance.toString(),
      balance_range_bucket: balanceInputs.balanceRangeBucket.toString(), // * Convert to string for u64 type
      domain_hash: balanceInputs.domainHash.toString(),
      nullifier: balanceInputs.nullifier.toString()
    };
    logger.debug('Balance range inputs prepared:', {
      wallet_secret_key_length: Array.isArray(circuitInputs.wallet_secret_key) ? circuitInputs.wallet_secret_key.length : 0,
      actual_balance: circuitInputs.actual_balance,
      minimum_balance: circuitInputs.minimum_balance,
      balance_range_bucket: circuitInputs.balance_range_bucket,
      has_domain_hash: !!circuitInputs.domain_hash,
      has_nullifier: !!circuitInputs.nullifier
    });
  } else if (circuitType === 'nft_ownership') {
    const nftInputs = inputs as NFTOwnershipProofInputs;
    // * NFT ownership circuit expects:
    // * - wallet_secret_key: [u8; 32] (private)
    // * - nft_mint_address: [u8; 32] (private)
    // * - random_secret: Field (private)
    // * - wallet_pubkey_hash: Field (public)
    // * - collection_address: [u8; 32] (public)
    // * - domain_hash: Field (public)
    // * - nullifier: Field (public)
    circuitInputs = {
      wallet_secret_key: Array.from(nftInputs.walletSecretKey),
      nft_mint_address: Array.from(nftInputs.nftMintAddress),
      random_secret: nftInputs.randomSecret.toString(),
      wallet_pubkey_hash: nftInputs.walletPubkeyHash.toString(),
      collection_address: Array.from(nftInputs.collectionAddress),
      domain_hash: nftInputs.domainHash.toString(),
      nullifier: nftInputs.nullifier.toString()
    };
    logger.debug('NFT ownership inputs prepared:', {
      wallet_secret_key_length: Array.isArray(circuitInputs.wallet_secret_key) ? circuitInputs.wallet_secret_key.length : 0,
      nft_mint_address_length: Array.isArray(circuitInputs.nft_mint_address) ? circuitInputs.nft_mint_address.length : 0,
      collection_address_length: Array.isArray(circuitInputs.collection_address) ? circuitInputs.collection_address.length : 0,
      has_random_secret: !!circuitInputs.random_secret,
      has_wallet_pubkey_hash: !!circuitInputs.wallet_pubkey_hash,
      has_domain_hash: !!circuitInputs.domain_hash,
      has_nullifier: !!circuitInputs.nullifier
    });
  }

  if (!circuitInputs) {
    throw new Error(`Failed to prepare circuit inputs for type: ${circuitType}`);
  }

  console.log('🔵 [VEILED] Circuit inputs prepared:', circuitInputs);
  logger.debug('Circuit inputs:', circuitInputs);
  logger.table(circuitInputs);

  // * Validate inputs match circuit ABI
  console.log('🔵 [VEILED] Loading circuit to validate inputs...');
  const { circuit } = await loadCircuit(circuitType);
  const expectedParams = circuit.abi.parameters.map((p: any) => p.name);
  const providedKeys = Object.keys(circuitInputs);
  
  console.log('🔵 [VEILED] Input validation:', {
    expectedParams,
    providedKeys,
    match: expectedParams.every((p: string) => providedKeys.includes(p)) && 
           providedKeys.every((k: string) => expectedParams.includes(k))
  });
  
  logger.debug('Input validation:', {
    expectedParams,
    providedKeys,
    match: expectedParams.every((p: string) => providedKeys.includes(p)) && 
           providedKeys.every((k: string) => expectedParams.includes(k))
  });
  
  const missingParams = expectedParams.filter((p: string) => !providedKeys.includes(p));
  const extraParams = providedKeys.filter((k: string) => !expectedParams.includes(k));
  
  if (missingParams.length > 0 || extraParams.length > 0) {
    console.error('🔴 [VEILED] Input mismatch detected!', {
      missingParams,
      extraParams,
      expectedParams,
      providedKeys
    });
    logger.error('Input mismatch detected!', {
      missingParams,
      extraParams,
      expectedParams,
      providedKeys
    });
    throw new Error(
      `Input mismatch for ${circuitType} circuit. ` +
      `Missing: ${missingParams.join(', ')}. ` +
      `Extra: ${extraParams.join(', ')}`
    );
  }

  // * Use Noir.execute() to get witness
  // * Then pass witness to backend.generateProof()
  console.log('🔵 [VEILED] Executing circuit to generate witness...');
  console.log('🔵 [VEILED] Calling noir.execute() with inputs:', circuitInputs);
  logger.info('Executing circuit to generate witness...');
  logger.debug('Calling noir.execute() with inputs...');
  logger.debug('Input types:', Object.entries(circuitInputs).map(([k, v]) => ({
    key: k,
    type: typeof v,
    isArray: Array.isArray(v),
    value: Array.isArray(v) ? `[${(v as any[]).length} items]` : String(v).substring(0, 50)
  })));
  
  let witness: Uint8Array;
  try {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:601',message:'BEFORE_NOIR_EXECUTE',data:{circuitType,inputKeys:Object.keys(circuitInputs)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] About to call noir.execute()...');
    const result = await noir.execute(circuitInputs);
    witness = result.witness;
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:605',message:'AFTER_NOIR_EXECUTE',data:{witnessLength:witness.length,witnessIsUint8Array:witness instanceof Uint8Array,firstBytes:Array.from(witness.slice(0,5)),circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] ✅ Witness generated successfully, length:', witness.length);
    logger.debug('Witness generated successfully, length:', witness.length);
  } catch (executeError) {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:608',message:'NOIR_EXECUTE_ERROR',data:{error:executeError instanceof Error?executeError.message:String(executeError),circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    const executeMsg = executeError instanceof Error ? executeError.message : String(executeError);
    console.error('🔴 [VEILED] ❌ noir.execute() FAILED:', executeMsg);
    console.error('🔴 [VEILED] Error stack:', executeError instanceof Error ? executeError.stack : undefined);
    console.error('🔴 [VEILED] Inputs that failed:', circuitInputs);
    logger.error('noir.execute() failed:', {
      error: executeMsg,
      stack: executeError instanceof Error ? executeError.stack : undefined,
      inputs: circuitInputs,
      circuitType
    });
    throw executeError;
  }

    // * Generate proof using backend (backend.generateProof returns ProofData)
  // * CRITICAL: Ensure backend is fully ready before generating proof
  console.log('🔵 [VEILED] Generating proof using backend...');
  console.log('🔵 [VEILED] Witness length:', witness.length);
  logger.info('Generating proof using backend...');
  logger.debug('Calling backend.generateProof() with witness...');
  logger.debug('Witness details:', {
    length: witness.length,
    firstBytes: Array.from(witness.slice(0, 10)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
  });
  
  // * Additional wait to ensure WASM is fully loaded
  console.log('🔵 [VEILED] Waiting additional 500ms for WASM to be fully ready...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let proofData: any;
  try {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:641',message:'BEFORE_BACKEND_GENERATE_PROOF',data:{witnessLength:witness.length,circuitType,backendType:backend.constructor.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] About to call backend.generateProof()...');
    console.log('🔵 [VEILED] Backend type:', backend.constructor.name);
    console.log('🔵 [VEILED] Witness is Uint8Array?', witness instanceof Uint8Array);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:663',message:'BEFORE_BACKEND_GENERATE_PROOF',data:{witnessLength:witness.length,witnessType:typeof witness,witnessIsUint8Array:witness instanceof Uint8Array,backendType:backend.constructor.name,circuitType,witnessFirst10Bytes:Array.from(witness.slice(0,10)),witnessLast10Bytes:Array.from(witness.slice(-10)),isGzip:witness.length>=2&&witness[0]===0x1f&&witness[1]===0x8b},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    proofData = await backend.generateProof(witness);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:666',message:'AFTER_BACKEND_GENERATE_PROOF',data:{hasProof:!!proofData,proofType:typeof proofData,hasProofField:!!proofData?.proof,hasPublicInputs:!!proofData?.publicInputs,proofLength:proofData?.proof?.length,publicInputsLength:proofData?.publicInputs?.length,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:644',message:'AFTER_BACKEND_GENERATE_PROOF',data:{hasProof:!!proofData,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] ✅ Proof generated successfully');
    logger.debug('Proof generated successfully');
  } catch (proofError) {
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generator.ts:675',message:'BACKEND_GENERATE_PROOF_ERROR',data:{error:proofError instanceof Error?proofError.message:String(proofError),errorStack:proofError instanceof Error?proofError.stack:undefined,witnessLength:witness.length,witnessType:typeof witness,circuitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const proofMsg = proofError instanceof Error ? proofError.message : String(proofError);
    console.error('🔴 [VEILED] ❌ backend.generateProof() FAILED:', proofMsg);
    console.error('🔴 [VEILED] Error stack:', proofError instanceof Error ? proofError.stack : undefined);
    console.error('🔴 [VEILED] Witness length:', witness.length);
    console.error('🔴 [VEILED] Circuit type:', circuitType);
    
    logger.error('backend.generateProof() failed:', {
      error: proofMsg,
      stack: proofError instanceof Error ? proofError.stack : undefined,
      witnessLength: witness.length,
      circuitType
    });
    
    // * Check if this is the "unreachable" error
    if (proofMsg.includes('unreachable')) {
      console.error('🔴 [VEILED] ===========================================');
      console.error('🔴 [VEILED] UNREACHABLE ERROR DIAGNOSIS');
      console.error('🔴 [VEILED] This WASM panic indicates a VERSION MISMATCH:');
      console.error('🔴 [VEILED] Witness format is incompatible with backend (version mismatch)');
      console.error('🔴 [VEILED]');
      console.error('🔴 [VEILED] SOLUTION: Use compatible versions:');
      console.error('🔴 [VEILED] - nargo: 1.0.0-beta.15');
      console.error('🔴 [VEILED] - @noir-lang/noir_js: 1.0.0-beta.15');
      console.error('🔴 [VEILED] - @aztec/bb.js: 3.0.0-nightly.20251104');
      console.error('🔴 [VEILED]');
      console.error('🔴 [VEILED] OR upgrade JavaScript libraries to match nargo 1.0.0-beta.18');
      console.error('🔴 [VEILED]');
      console.error('🔴 [VEILED] Current versions:');
      console.error('🔴 [VEILED] - nargo: 1.0.0-beta.18 (from nargo --version)');
      console.error('🔴 [VEILED] - @noir-lang/noir_js: ^1.0.0-beta.18 (from package.json)');
      console.error('🔴 [VEILED] - @noir-lang/backend_barretenberg: ^0.36.0 (from package.json)');
      console.error('🔴 [VEILED]');
      console.error('🔴 [VEILED] This is a known compatibility issue - witness format mismatch');
      console.error('🔴 [VEILED] 3. Backend initialization issue - backend not properly initialized');
      console.error('🔴 [VEILED] 4. Version incompatibility - Noir/Barretenberg version mismatch');
      console.error('🔴 [VEILED]');
      console.error('🔴 [VEILED] Current state:');
      console.error(`🔴 [VEILED] - Circuit type: ${circuitType}`);
      console.error(`🔴 [VEILED] - Backend initialized: ${!!backend}`);
      console.error(`🔴 [VEILED] - Noir instance initialized: ${!!noir}`);
      console.error(`🔴 [VEILED] - Witness length: ${witness.length}`);
      console.error(`🔴 [VEILED] - Input keys: ${Object.keys(circuitInputs).join(', ')}`);
      console.error('🔴 [VEILED] ===========================================');
      
      logger.error('=== UNREACHABLE ERROR DIAGNOSIS ===');
      logger.error('This WASM panic usually indicates:');
      logger.error('1. Circuit bytecode mismatch - wrong circuit loaded');
      logger.error('2. Input format mismatch - inputs dont match circuit signature');
      logger.error('3. Backend initialization issue - backend not properly initialized');
      logger.error('4. Version incompatibility - Noir/Barretenberg version mismatch');
      logger.error('');
      logger.error('Current state:');
      logger.error(`- Circuit type: ${circuitType}`);
      logger.error(`- Backend initialized: ${!!backend}`);
      logger.error(`- Noir instance initialized: ${!!noir}`);
      logger.error(`- Witness length: ${witness.length}`);
      logger.error(`- Input keys: ${Object.keys(circuitInputs).join(', ')}`);
      logger.error('===================================');
    }
    
    throw proofError;
  }
  
    const proof = proofData.proof; // * Uint8Array
    const publicInputs = proofData.publicInputs; // * string[]

  logger.debug('Proof data:', {
    proofLength: proof.length,
    publicInputsCount: publicInputs.length,
    publicInputs: publicInputs
  });

    // * Proof is already Uint8Array from ProofData
    const proofBytes = proof;

    // * Extract public inputs (they're returned as string array)
    const publicInputsArray = publicInputs;
    
  // * Map public inputs based on circuit type
  let result: ProofResult;
  
  if (circuitType === 'wallet_ownership') {
    result = {
      proof: proofBytes,
      publicInputs: {
        walletPubkeyHash:
          publicInputsArray[0]?.toString() || inputs.walletPubkeyHash.toString(),
        domainHash:
          publicInputsArray[1]?.toString() || inputs.domainHash.toString(),
        nullifier:
          publicInputsArray[2]?.toString() || inputs.nullifier.toString()
      },
      publicInputsArray: publicInputsArray,
      circuitType: circuitType
    };
  } else if (circuitType === 'balance_range') {
    // * For balance_range:
    // * public_inputs = [
    // *   wallet_pubkey_hash,
    // *   minimum_balance,
    // *   balance_range_bucket,
    // *   domain_hash,
    // *   nullifier
    // * ]
    const balanceInputs = inputs as BalanceRangeProofInputs;
    result = {
      proof: proofBytes,
      publicInputs: {
        walletPubkeyHash:
          publicInputsArray[0]?.toString() || inputs.walletPubkeyHash.toString(),
        domainHash:
          publicInputsArray[3]?.toString() || inputs.domainHash.toString(),
        nullifier:
          publicInputsArray[4]?.toString() || inputs.nullifier.toString()
      },
      publicInputsArray: publicInputsArray,
      circuitType: circuitType
    };
  } else {
    // * For nft_ownership:
    // * public_inputs = [
    // *   wallet_pubkey_hash,
    // *   collection_address (as bytes, but serialized as string),
    // *   domain_hash,
    // *   nullifier
    // * ]
    result = {
      proof: proofBytes,
      publicInputs: {
        walletPubkeyHash:
          publicInputsArray[0]?.toString() || inputs.walletPubkeyHash.toString(),
        domainHash:
          publicInputsArray[2]?.toString() || inputs.domainHash.toString(),
        nullifier:
          publicInputsArray[3]?.toString() || inputs.nullifier.toString()
      },
      publicInputsArray: publicInputsArray,
      circuitType: circuitType
    };
  }
  
  logger.info('Proof generation completed successfully');
  logger.groupEnd();
  return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error('🔴 [VEILED] ========================================');
    console.error('🔴 [VEILED] Proof generation FAILED');
    console.error('🔴 [VEILED] Circuit type:', circuitType);
    console.error('🔴 [VEILED] Error:', message);
    console.error('🔴 [VEILED] Stack:', stack);
    console.error('🔴 [VEILED] ========================================');
    
    logger.error('Proof generation failed:', {
      circuitType,
      error: message,
      stack
    });
    
    // * Provide more helpful error messages for common issues
    if (message.includes('unreachable')) {
      console.error('🔴 [VEILED] WebAssembly panic detected!');
      console.error('🔴 [VEILED] This usually means:');
      console.error('🔴 [VEILED] 1. Circuit bytecode mismatch (wrong circuit type)');
      console.error('🔴 [VEILED] 2. Backend version incompatibility');
      console.error('🔴 [VEILED] 3. Invalid input format');
      console.error('🔴 [VEILED] 4. Circuit not properly initialized');
      
      logger.error('WebAssembly panic detected! This usually means:');
      logger.error('1. Circuit bytecode mismatch (wrong circuit type)');
      logger.error('2. Backend version incompatibility');
      logger.error('3. Invalid input format');
      logger.error('4. Circuit not properly initialized');
      logger.error('Check the logs above for initialization details.');
    }
    
    // * Handle deserialization errors (version mismatch)
    if (message.includes('Failed to deserialize circuit') || message.includes('differing serialization formats')) {
      console.error('🔴 [VEILED] Circuit deserialization failed!');
      console.error('🔴 [VEILED] This means the circuit bytecode format does not match ACVM_JS expectations.');
      console.error('🔴 [VEILED] Solution:');
      console.error('🔴 [VEILED] 1. Ensure nargo version matches: nargo --version (should be 1.0.0-beta.3)');
      console.error('🔴 [VEILED] 2. Recompile circuit: cd packages/circuit && rm -rf target/ && nargo compile');
      console.error('🔴 [VEILED] 3. Copy to static: cp packages/circuit/target/veiled_circuit.json apps/demo/static/circuit/');
      console.error('🔴 [VEILED] 4. Hard refresh browser to clear cache');
      
      logger.error('Circuit deserialization failed - version mismatch detected');
      logger.error('Recompile circuit with nargo 1.0.0-beta.3 and ensure all versions match');
    }
    
    logger.groupEnd();
    throw new Error(`Proof generation failed: ${message}`);
  }
}

/**
 * * Verifies UltraHonk proof using WASM backend
 * * This is the off-chain verification that happens before submitting to Solana
 * * 
 * * Uses the same UltraHonkBackend that generated the proof for verification
 * * This ensures format compatibility
 * * 
 * * @param proof - The proof bytes (Uint8Array) from generateProof()
 * * @param publicInputsArray - The full public inputs array from generateProof() (required for verification)
 * * @param circuitType - The circuit type used to generate the proof (required to use correct circuit for verification)
 * * @returns Promise<boolean> - true if proof is valid, false otherwise
 */
export async function verifyProof(
  proof: Uint8Array,
  publicInputsArray: string[],
  circuitType: CircuitType
): Promise<boolean> {
  try {
    console.log('🔍 Verifying proof using UltraHonkBackend...');
    console.log('🔵 [VEILED] Circuit type:', circuitType);
    console.log('🔵 [VEILED] Public inputs count:', publicInputsArray.length);
    
    // * Use the same backend that generated the proof for verification
    // * This ensures format compatibility - MUST use the same circuit type!
    const { noir, backend } = await initializeNoir(circuitType);
    
    // * Load circuit to get verification key (must match the circuit type used for proof generation)
    const { circuit } = await loadCircuit(circuitType);
    
    if (!circuit || !circuit.bytecode) {
      throw new Error('Circuit bytecode not found. Make sure the circuit is compiled.');
    }
    
    // * UltraHonkBackend.verifyProof expects ProofData object, not just Uint8Array
    // * ProofData has structure: { proof: Uint8Array, publicInputs: string[] }
    // * Use the full public inputs array directly from proof generation
    const proofData = {
      proof: proof,
      publicInputs: publicInputsArray
    };
    
    console.log('🔵 [VEILED] Verifying with public inputs:', {
      count: publicInputsArray.length,
      inputs: publicInputsArray.map((pi, i) => `[${i}]: ${pi.substring(0, 20)}...`)
    });
    
    const isValid = await backend.verifyProof(proofData as any);
      
    if (isValid) {
      console.log('✅ Proof verified successfully!');
    } else {
      console.log('❌ Proof verification failed!');
    }
      
    return isValid;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('🔴 [VEILED] Proof verification error:', message);
    console.error('🔴 [VEILED] Circuit type:', circuitType);
    console.error('🔴 [VEILED] Public inputs count:', publicInputsArray.length);
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

/**
 * * Compute which balance range bucket the balance falls into (same as circuit)
 * * 0: [0, 10 SOL)
 * * 1: [10, 100 SOL)
 * * 2: [100, 1000 SOL)
 * * 3: [1000 SOL, +inf)
 */
function computeRangeBucket(balanceLamports: bigint): number {
  const SOL = 1_000_000_000n;

  if (balanceLamports < 10n * SOL) return 0;
  if (balanceLamports < 100n * SOL) return 1;
  if (balanceLamports < 1000n * SOL) return 2;
  return 3;
}
