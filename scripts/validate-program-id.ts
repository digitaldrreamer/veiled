#!/usr/bin/env tsx
// * Validates Program ID consistency across all files
// * Prevents "DeclaredProgramIdMismatch" errors by ensuring all Program IDs match
// * Usage: npm run validate-program-id

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// * Get expected Program ID from lib.rs (source of truth)
function getExpectedProgramId(): string {
  const libRsPath = join(process.cwd(), 'packages/anchor/programs/veiled/src/lib.rs');
  if (!existsSync(libRsPath)) {
    throw new Error('lib.rs not found - cannot determine expected Program ID');
  }
  const content = readFileSync(libRsPath, 'utf-8');
  const match = content.match(/declare_id!\("([^"]+)"\)/);
  if (!match) {
    throw new Error('declare_id! not found in lib.rs');
  }
  return match[1];
}

const EXPECTED_PROGRAM_ID = getExpectedProgramId();

interface ValidationResult {
  file: string;
  valid: boolean;
  found?: string;
  error?: string;
}

const results: ValidationResult[] = [];
let hasErrors = false;

function validateFile(file: string, checkFn: (content: string) => { valid: boolean; found?: string; error?: string }) {
  const filePath = join(process.cwd(), file);
  if (!existsSync(filePath)) {
    results.push({ file, valid: false, error: 'File not found' });
    hasErrors = true;
    return;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const result = checkFn(content);
    results.push({ file, ...result });
    if (!result.valid) {
      hasErrors = true;
    }
  } catch (error: any) {
    results.push({ file, valid: false, error: error.message });
    hasErrors = true;
  }
}

console.log('🔍 Validating Program ID consistency...\n');

// 1. Check lib.rs (source of truth)
validateFile('packages/anchor/programs/veiled/src/lib.rs', (content) => {
  const match = content.match(/declare_id!\("([^"]+)"\)/);
  if (!match) {
    return { valid: false, error: 'declare_id! not found' };
  }
  const found = match[1];
  if (found !== EXPECTED_PROGRAM_ID) {
    return { valid: false, found, error: `Mismatch: found ${found}, expected ${EXPECTED_PROGRAM_ID}` };
  }
  return { valid: true, found };
});

// 2. Check Anchor.toml
validateFile('packages/anchor/Anchor.toml', (content) => {
  const lines = content.split('\n');
  const programIdLines = lines.filter(line => line.includes('veiled =') && line.includes('"'));
  const allMatch = programIdLines.every(line => line.includes(EXPECTED_PROGRAM_ID));
  
  if (!allMatch) {
    const found = programIdLines.map(line => {
      const match = line.match(/veiled\s*=\s*"([^"]+)"/);
      return match ? match[1] : 'not found';
    }).join(', ');
    return { valid: false, found, error: `Mismatch in Anchor.toml: found ${found}` };
  }
  return { valid: true, found: EXPECTED_PROGRAM_ID };
});

// 3. Check IDL (if exists - optional, may not exist before first build)
const idlPath = join(process.cwd(), 'packages/anchor/target/idl/veiled.json');
if (existsSync(idlPath)) {
  validateFile('packages/anchor/target/idl/veiled.json', (content) => {
    try {
      const idl = JSON.parse(content);
      if (!idl.address) {
        return { valid: false, error: 'IDL missing address field' };
      }
      if (idl.address !== EXPECTED_PROGRAM_ID) {
        return { valid: false, found: idl.address, error: `Mismatch: found ${idl.address}, expected ${EXPECTED_PROGRAM_ID}` };
      }
      return { valid: true, found: idl.address };
    } catch (error: any) {
      return { valid: false, error: `Failed to parse IDL: ${error.message}` };
    }
  });
} else {
  results.push({ file: 'packages/anchor/target/idl/veiled.json', valid: true, found: 'Not built yet (will be validated after build)' });
}

// 4. Check demo app IDL (if exists - optional)
const demoIdlPath = join(process.cwd(), 'apps/demo/static/idl/veiled.json');
if (existsSync(demoIdlPath)) {
  validateFile('apps/demo/static/idl/veiled.json', (content) => {
    try {
      const idl = JSON.parse(content);
      if (!idl.address) {
        return { valid: false, error: 'IDL missing address field' };
      }
      if (idl.address !== EXPECTED_PROGRAM_ID) {
        return { valid: false, found: idl.address, error: `Mismatch: found ${idl.address}, expected ${EXPECTED_PROGRAM_ID}` };
      }
      return { valid: true, found: idl.address };
    } catch (error: any) {
      return { valid: false, error: `Failed to parse IDL: ${error.message}` };
    }
  });
} else {
  results.push({ file: 'apps/demo/static/idl/veiled.json', valid: true, found: 'Not found (optional)' });
}

// 5. Check program.ts constant
validateFile('packages/core/src/solana/program.ts', (content) => {
  const match = content.match(/VEILED_PROGRAM_ID\s*=\s*new\s+PublicKey\(['"]([^'"]+)['"]\)/);
  if (!match) {
    return { valid: false, error: 'VEILED_PROGRAM_ID constant not found' };
  }
  const found = match[1];
  if (found !== EXPECTED_PROGRAM_ID) {
    return { valid: false, found, error: `Mismatch: found ${found}, expected ${EXPECTED_PROGRAM_ID}` };
  }
  return { valid: true, found };
});

// Print results
console.log('Results:');
results.forEach(result => {
  if (result.valid) {
    console.log(`  ✅ ${result.file}: ${result.found || 'OK'}`);
  } else {
    console.log(`  ❌ ${result.file}: ${result.error || 'Invalid'}`);
    if (result.found) {
      console.log(`     Found: ${result.found}`);
    }
  }
});

console.log('');

if (hasErrors) {
  console.error('❌ Program ID validation FAILED!');
  console.error('   Fix mismatches before deploying.');
  console.error(`   Expected Program ID: ${EXPECTED_PROGRAM_ID}`);
  process.exit(1);
} else {
  console.log('✅ All Program IDs match!');
  console.log(`   Program ID: ${EXPECTED_PROGRAM_ID}`);
  process.exit(0);
}
