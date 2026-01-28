// * Circuit loader for Noir WASM integration
// * Loads compiled circuit and prepares it for proof generation

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

// * Cached circuit instance
let cachedCircuit: CompiledCircuit | null = null;

/**
 * * Loads compiled Noir circuit from JSON file
 * * The circuit JSON should be copied to a public location for browser access
 * * In production, this would be served from a CDN or bundled
 */
export async function loadCircuit(): Promise<CompiledCircuit> {
  // * Return cached circuit if already loaded
  if (cachedCircuit) {
    return cachedCircuit;
  }

  // * Load circuit JSON
  // * In browser: fetch from public path
  // * In Node: read from file system
  let circuitData: any;
  
  if (typeof window !== 'undefined') {
    // Browser: fetch from public path
    // Circuit JSON should be in apps/demo/static/circuit/
    const response = await fetch('/circuit/veiled_circuit.json');
    if (!response.ok) {
      throw new Error(`Failed to load circuit: ${response.statusText}. Make sure veiled_circuit.json is in static/circuit/`);
    }
    circuitData = await response.json();
  } else {
    // Node.js: read from file system
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const circuitPath = path.join(
      process.cwd(),
      'packages/circuit/target/veiled_circuit.json'
    );
    const fileContent = await fs.readFile(circuitPath, 'utf-8');
    circuitData = JSON.parse(fileContent);
  }

  // * Extract ABI from circuit data
  const abi: CircuitABI = {
    parameters: circuitData.abi.parameters.map((p: any) => ({
      name: p.name,
      type: JSON.stringify(p.type),
      visibility: p.visibility
    })),
    return_type: circuitData.abi.return_type
  };

  // * Create circuit object compatible with Noir.js
  // * Noir.js expects the circuit JSON structure directly
  const circuit = circuitData;

  cachedCircuit = { circuit, abi };
  return cachedCircuit;
}

/**
 * * Generates witness from inputs using Noir
 * * This is handled by Noir.js internally, but we expose it for testing
 */
export async function generateWitness(
  circuit: CompiledCircuit,
  inputs: Record<string, unknown>
): Promise<Uint8Array> {
  // * Witness generation is handled by Noir.js in generateProof()
  // * This function is kept for compatibility but not used directly
  // * The Noir instance will generate witness internally
  return new Uint8Array(0);
}
