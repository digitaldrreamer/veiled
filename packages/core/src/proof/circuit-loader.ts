// * Circuit loader for Noir WASM integration
// * Loads compiled circuit and prepares it for proof generation
// * With beta.15 + @aztec/bb.js, the circuit bytecode is already in the correct format

console.log('🔵 [VEILED] ========================================');
console.log('🔵 [VEILED] circuit-loader.ts MODULE LOADED');
console.log('🔵 [VEILED] ========================================');

import { logger } from '../utils/logger.js';

export type CircuitType =
  | 'wallet_ownership'
  | 'balance_range'
  | 'nft_ownership';

// * Type for compiled circuit (matches Noir.js expected format)
export interface CompiledCircuit {
  circuit: any; // Noir.js circuit object
  abi: CircuitABI;
}

export interface CircuitABI {
  parameters: Array<{
    name: string;
    type: string;
    visibility: 'private' | 'public';
  }>;
  return_type: string | null;
}

// * Cached circuit instances per type
const circuitCache: Partial<Record<CircuitType, CompiledCircuit>> = {};

/**
 * * Loads compiled Noir circuit from JSON file
 * * Beta.3: Circuit JSON is already in correct format, no processing needed
 * * Just load and return - framework handles bytecode format automatically
 */
export async function loadCircuit(type: CircuitType = 'wallet_ownership'): Promise<CompiledCircuit> {
  console.log('🔵 [VEILED] loadCircuit() called for type:', type);
  logger.group(`Loading circuit: ${type}`);
  
  // * Return cached circuit if already loaded
  if (circuitCache[type]) {
    console.log('🔵 [VEILED] Using cached circuit:', type);
    logger.debug('Using cached circuit:', type);
    logger.groupEnd();
    return circuitCache[type] as CompiledCircuit;
  }

  console.log('🔵 [VEILED] Loading circuit from file system...');
  logger.info('Loading circuit from file system...');
  
  // * Load circuit JSON
  // * In browser: fetch from public path
  // * In Node: read from file system
  let circuitData: any;
  
  const walletOwnershipPath = {
    browser: '/circuit/veiled_circuit.json',
    node: ['packages', 'circuit', 'target', 'veiled_circuit.json'] as const
  };

  const balanceRangePath = {
    browser: '/circuit-balance-range/veiled_balance_range.json',
    node: ['packages', 'circuit-balance-range', 'target', 'veiled_balance_range.json'] as const
  };

  const nftOwnershipPath = {
    browser: '/circuit-nft-ownership/veiled_nft_ownership.json',
    node: ['packages', 'circuit-nft-ownership', 'target', 'veiled_nft_ownership.json'] as const
  };

  const selected = 
    type === 'wallet_ownership' ? walletOwnershipPath :
    type === 'balance_range' ? balanceRangePath :
    nftOwnershipPath;
  
  logger.debug('Circuit path:', selected);
  
  if (typeof window !== 'undefined') {
    // Browser: fetch from public path with cache-busting to ensure fresh circuit
    const cacheBuster = `?v=${Date.now()}`;
    const circuitUrl = selected.browser + cacheBuster;
    console.log('🔵 [VEILED] Fetching circuit from:', circuitUrl);
    logger.debug('Fetching circuit from:', circuitUrl);
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'circuit-loader.ts:76',message:'BEFORE_CIRCUIT_FETCH',data:{url:circuitUrl,type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const response = await fetch(circuitUrl, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error('🔴 [VEILED] Failed to fetch circuit:', response.status, response.statusText);
      logger.error('Failed to fetch circuit:', response.status, response.statusText);
      logger.groupEnd();
      throw new Error(
        `Failed to load circuit (${type}): ${response.statusText}. Expected at ${selected.browser}`
      );
    }
    circuitData = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7253/ingest/7771b592-8da6-468a-80be-e69122580b2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'circuit-loader.ts:86',message:'CIRCUIT_FETCHED',data:{noirVersion:circuitData.noir_version,bytecodeLength:circuitData.bytecode?.length,type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [VEILED] Circuit fetched successfully, size:', JSON.stringify(circuitData).length, 'bytes');
    console.log('🔵 [VEILED] Circuit Noir version:', circuitData.noir_version);
    logger.debug('Circuit fetched successfully, size:', JSON.stringify(circuitData).length, 'bytes');
    logger.debug('Circuit Noir version:', circuitData.noir_version);
  } else {
    // Node.js: read from file system
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const circuitPath = path.join(process.cwd(), ...selected.node);
    logger.debug('Reading circuit from:', circuitPath);
    const fileContent = await fs.readFile(circuitPath, 'utf-8');
    circuitData = JSON.parse(fileContent);
    logger.debug('Circuit loaded successfully, size:', fileContent.length, 'bytes');
  }

  // * Validate circuit structure
  console.log('🔵 [VEILED] Validating circuit structure...');
  if (!circuitData.bytecode) {
    console.error('🔴 [VEILED] Circuit missing bytecode!', {
      hasAbi: !!circuitData.abi,
      keys: Object.keys(circuitData),
      circuitType: type
    });
    logger.error('Circuit missing bytecode!', {
      hasAbi: !!circuitData.abi,
      keys: Object.keys(circuitData),
      circuitType: type
    });
    logger.groupEnd();
    throw new Error(`Circuit ${type} is missing bytecode. Make sure it's compiled with nargo compile`);
  }

  // * With beta.15 + @aztec/bb.js, the bytecode format is handled automatically
  // * No manual conversion needed - the circuit JSON is used as-is
  console.log('🔵 [VEILED] Circuit bytecode format:', {
    type: typeof circuitData.bytecode,
    isArray: Array.isArray(circuitData.bytecode),
    length: circuitData.bytecode?.length || 0,
    noirVersion: circuitData.noir_version || 'unknown'
  });
  logger.debug('Circuit bytecode format:', {
    type: typeof circuitData.bytecode,
    isArray: Array.isArray(circuitData.bytecode),
    length: circuitData.bytecode?.length || 0
  });

  // * Validate ABI structure
  if (!circuitData.abi || !circuitData.abi.parameters) {
    console.error('🔴 [VEILED] Circuit missing ABI or parameters!', {
      hasAbi: !!circuitData.abi,
      hasParameters: !!circuitData.abi?.parameters,
      circuitType: type
    });
    logger.error('Circuit missing ABI or parameters!', {
      hasAbi: !!circuitData.abi,
      hasParameters: !!circuitData.abi?.parameters,
      circuitType: type
    });
    logger.groupEnd();
    throw new Error(`Circuit ${type} is missing ABI parameters. Make sure it's compiled correctly`);
  }

  console.log('🔵 [VEILED] Circuit validation passed:', {
    bytecodeLength: circuitData.bytecode.length,
    abiParamsCount: circuitData.abi.parameters.length,
    abiParams: circuitData.abi.parameters.map((p: any) => ({
      name: p.name,
      visibility: p.visibility,
      type: JSON.stringify(p.type)
    }))
  });
  logger.debug('Circuit validation passed:', {
    bytecodeLength: circuitData.bytecode.length,
    abiParamsCount: circuitData.abi.parameters.length,
    abiParams: circuitData.abi.parameters.map((p: any) => ({
      name: p.name,
      visibility: p.visibility,
      type: JSON.stringify(p.type)
    }))
  });

  // * Extract ABI from circuit data
  const abi: CircuitABI = {
    parameters: circuitData.abi.parameters.map((p: any) => ({
      name: p.name,
      type: JSON.stringify(p.type),
      visibility: p.visibility
    })),
    return_type: circuitData.abi.return_type
  };

  // * Circuit is used as-is - @aztec/bb.js handles format conversion automatically
  const compiled: CompiledCircuit = { circuit: circuitData, abi };
  circuitCache[type] = compiled;
  
  logger.info('Circuit loaded and cached successfully');
  logger.groupEnd();
  return compiled;
}
