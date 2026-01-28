// * Extract VK from backend after proof generation
// * This script generates a proof and then tries to extract VK from backend internals

import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '../../..');

async function extractVKFromProof() {
  console.log('🔍 Attempting to extract VK from proof generation...\n');

  try {
    // Load circuit
    const circuitPath = join(workspaceRoot, 'packages/circuit/target/veiled_circuit.json');
    console.log(`📂 Loading circuit: ${circuitPath}`);
    const circuitData = JSON.parse(readFileSync(circuitPath, 'utf-8'));
    console.log('✅ Circuit loaded\n');

    // Initialize backend
    console.log('🔧 Initializing backend...');
    const backend = new BarretenbergBackend(circuitData);
    const noir = new Noir(circuitData);
    console.log('✅ Backend initialized\n');

    // Generate a proof first
    console.log('🔐 Generating proof to initialize backend state...');
    const testInputs = {
      wallet_secret_key: Array(32).fill(1),
      random_secret: '0x1',
      wallet_pubkey_hash: '0x1',
      domain_hash: '0x1',
      nullifier: '0x1',
    };

    const witness = await noir.generateWitness(testInputs);
    const { proof, publicInputs } = await backend.generateProof(witness);
    console.log('✅ Proof generated\n');

    // Now try to extract VK - check all possible methods
    console.log('🔑 Attempting VK extraction...');
    
    // Method 1: Direct getVerificationKey
    try {
      const vk1 = await (backend as any).getVerificationKey();
      if (vk1) {
        console.log('✅ Method 1 (getVerificationKey) succeeded!');
        saveVK(vk1, 'method1');
        return;
      }
    } catch (e) {
      console.log('❌ Method 1 failed:', (e as Error).message);
    }

    // Method 2: Check backend internals
    console.log('\n🔍 Inspecting backend internals...');
    const backendKeys = Object.keys(backend);
    console.log('Backend keys:', backendKeys);
    
    // Check for VK in various properties
    const possibleVKProps = ['vk', 'verificationKey', 'verification_key', '_vk', '_verificationKey'];
    for (const prop of possibleVKProps) {
      if ((backend as any)[prop]) {
        console.log(`✅ Found VK in property: ${prop}`);
        saveVK((backend as any)[prop], `property_${prop}`);
        return;
      }
    }

    // Method 3: Check proof object for VK
    console.log('\n🔍 Checking proof object...');
    if (proof && typeof proof === 'object') {
      const proofKeys = Object.keys(proof);
      console.log('Proof keys:', proofKeys);
      
      for (const key of ['vk', 'verificationKey', 'verification_key']) {
        if ((proof as any)[key]) {
          console.log(`✅ Found VK in proof.${key}`);
          saveVK((proof as any)[key], `proof_${key}`);
          return;
        }
      }
    }

    // Method 4: Try to access WASM module directly
    console.log('\n🔍 Checking WASM module...');
    const wasmModule = (backend as any).wasm || (backend as any).module || (backend as any)._wasm;
    if (wasmModule) {
      console.log('Found WASM module, checking exports...');
      const exports = Object.keys(wasmModule);
      console.log('WASM exports:', exports.filter(e => e.toLowerCase().includes('vk') || e.toLowerCase().includes('verif')));
    }

    console.log('\n❌ Could not extract VK from any method');
    console.log('Backend state after proof generation does not expose VK');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function saveVK(vk: any, method: string) {
  const outputPath = join(workspaceRoot, 'packages/anchor/programs/veiled/src/verification_key.bin');
  
  if (vk instanceof Uint8Array) {
    writeFileSync(outputPath, vk);
    console.log(`\n✅ VK saved (${vk.length} bytes) from ${method}`);
    console.log(`   Location: ${outputPath}`);
  } else if (typeof vk === 'object') {
    const json = JSON.stringify(vk, null, 2);
    writeFileSync(outputPath + '.json', json);
    console.log(`\n✅ VK saved as JSON from ${method}`);
    console.log(`   Location: ${outputPath}.json`);
    console.log('   Note: You may need to convert JSON to binary format');
  } else {
    console.log(`\n⚠️  VK format unknown: ${typeof vk}`);
    console.log('   Value:', vk);
  }
}

extractVKFromProof();
