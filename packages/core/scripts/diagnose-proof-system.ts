// * Diagnostic script to determine proof system type
// * Usage: bun run packages/core/scripts/diagnose-proof-system.ts

import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function diagnoseProofSystem() {
  console.log('🔍 Diagnosing Proof System Type...\n');

  try {
    // Load circuit
    // Script is in packages/core/scripts/, so go up 3 levels to workspace root
    const workspaceRoot = join(__dirname, '../../..');
    const circuitPath = join(workspaceRoot, 'packages/circuit/target/veiled_circuit.json');
    console.log(`📂 Loading circuit from: ${circuitPath}`);
    const circuitData = JSON.parse(readFileSync(circuitPath, 'utf-8'));
    console.log('✅ Circuit loaded\n');

    // Initialize backend
    console.log('🔧 Initializing Barretenberg backend...');
    const backend = new BarretenbergBackend(circuitData);
    console.log('✅ Backend initialized\n');

    // Get verification key
    console.log('🔑 Getting verification key...');
    const vk = await backend.getVerificationKey();
    console.log('✅ Verification key retrieved\n');

    // Diagnose VK format
    console.log('📊 Verification Key Analysis:');
    console.log('  Type:', typeof vk);
    console.log('  Is Uint8Array?', vk instanceof Uint8Array);
    console.log('  Is Buffer?', Buffer.isBuffer(vk));
    console.log('  Length:', vk instanceof Uint8Array ? vk.length : 'N/A');
    
    if (vk instanceof Uint8Array) {
      console.log('  First 32 bytes (hex):', Buffer.from(vk.slice(0, 32)).toString('hex'));
      console.log('  Format: BINARY');
    } else if (typeof vk === 'object') {
      console.log('  Keys:', Object.keys(vk));
      console.log('  Format: JSON');
      console.log('  Structure:', JSON.stringify(vk, null, 2).substring(0, 500));
    }

    // Initialize Noir and generate a test proof
    console.log('\n🔧 Initializing Noir instance...');
    const noir = new Noir(circuitData);
    console.log('✅ Noir initialized\n');

    // Create dummy witness for testing
    console.log('🧪 Generating test witness...');
    const testInputs = {
      wallet_secret_key: Array(32).fill(0).map(() => Math.floor(Math.random() * 256)),
      random_secret: '123456789',
      wallet_pubkey_hash: '987654321',
      domain_hash: '111111111',
      nullifier: '222222222'
    };

    try {
      const witness = await noir.generateWitness(testInputs);
      console.log('✅ Witness generated\n');

      console.log('🔐 Generating test proof...');
      const proof = await backend.generateProof(witness);
      console.log('✅ Proof generated\n');

      // Diagnose proof format
      console.log('📊 Proof Analysis:');
      console.log('  Type:', typeof proof);
      console.log('  Constructor:', proof?.constructor?.name || 'N/A');
      
      if (proof instanceof Uint8Array) {
        console.log('  Format: BINARY');
        console.log('  Length:', proof.length);
        console.log('  Expected Groth16: 256 bytes');
        console.log('  Expected UltraHonk: variable size');
      } else if (typeof proof === 'object') {
        console.log('  Format: JSON/OBJECT');
        console.log('  Keys:', Object.keys(proof));
      }

      // Check if it's Groth16 or UltraHonk
      if (proof instanceof Uint8Array && proof.length === 256) {
        console.log('\n🎯 DIAGNOSIS: Likely GROTH16 (256 bytes)');
      } else if (proof instanceof Uint8Array) {
        console.log('\n🎯 DIAGNOSIS: Likely ULTRAHONK (variable size)');
      } else {
        console.log('\n🎯 DIAGNOSIS: Unknown format - needs inspection');
      }

    } catch (error) {
      console.log('⚠️  Could not generate test proof (this is OK for diagnosis)');
      console.log('  Error:', error instanceof Error ? error.message : String(error));
    }

    // Cleanup
    await backend.destroy();
    console.log('\n✅ Diagnosis complete');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

diagnoseProofSystem();
