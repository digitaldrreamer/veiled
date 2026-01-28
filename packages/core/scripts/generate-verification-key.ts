// * Script to generate verification key from Noir circuit
// * Usage: bun run packages/core/scripts/generate-verification-key.ts
// * 
// * NOTE: This requires the circuit to be compiled first:
// *   cd packages/circuit && nargo compile

import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// * Get the workspace root (3 levels up from scripts/)
const workspaceRoot = join(__dirname, '../../..');

async function generateVerificationKey() {
  console.log('🔑 Generating verification key from Noir circuit...\n');

  try {
    // * Load compiled circuit directly
    const circuitPath = join(workspaceRoot, 'packages/circuit/target/veiled_circuit.json');
    console.log(`📂 Loading circuit from: ${circuitPath}`);
    
    const circuitData = JSON.parse(readFileSync(circuitPath, 'utf-8'));
    console.log('✅ Circuit loaded\n');

    // * Initialize Barretenberg backend
    console.log('🔧 Initializing Barretenberg backend...');
    const backend = new BarretenbergBackend(circuitData);
    console.log('✅ Backend initialized\n');

    // * Get verification key
    console.log('🔑 Extracting verification key...');
    const verificationKey = await backend.getVerificationKey();
    console.log(`✅ Verification key extracted (${verificationKey.length} bytes)\n`);

    // * Save verification key as binary
    const outputPath = join(workspaceRoot, 'packages/anchor/programs/veiled/src/verification_key.bin');
    console.log(`💾 Saving verification key to: ${outputPath}`);
    writeFileSync(outputPath, verificationKey);
    console.log('✅ Verification key saved!\n');

    // * Also save as hex for inspection
    const hexPath = join(workspaceRoot, 'packages/anchor/programs/veiled/src/verification_key.hex');
    const hexString = Array.from(verificationKey)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    writeFileSync(hexPath, hexString);
    console.log(`📝 Also saved as hex: ${hexPath}\n`);

    // * Save first 100 bytes as preview
    const preview = Array.from(verificationKey.slice(0, 100))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log(`📋 Verification key preview (first 100 bytes):`);
    console.log(`   ${preview}...\n`);

    console.log('🎉 Verification key generation complete!');
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Update groth16.rs to load verification_key.bin`);
    console.log(`   2. Implement actual verification logic`);
    console.log(`   3. Test with real proofs\n`);

    // * Cleanup
    await backend.destroy();
  } catch (error) {
    console.error('❌ Error generating verification key:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. Circuit is compiled: cd packages/circuit && nargo compile');
    console.error('   2. Node.js environment has proper WASM support');
    console.error('   3. All dependencies are installed: bun install\n');
    process.exit(1);
  }
}

generateVerificationKey();
