#!/usr/bin/env bun
/**
 * * Test runner for all Node.js tests
 * * Runs tests that don't require Solana validator or browser
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

async function runTest(name: string, command: string, cwd?: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Running: ${name}`);
  console.log(`   Command: ${command}`);
  console.log('='.repeat(60) + '\n');

  try {
    const { stdout, stderr } = await exec(command, {
      cwd: cwd || process.cwd(),
      env: { ...process.env }
    });

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);

    console.log(`✅ ${name} PASSED\n`);
    return { success: true, name };
  } catch (error: any) {
    console.error(`❌ ${name} FAILED`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    console.error(`   Error: ${error.message}\n`);
    return { success: false, name, error: error.message };
  }
}

async function main() {
  console.log('🚀 Running Node.js Test Suite\n');
  console.log('='.repeat(60));

  const results = [];

  // * Test 1: Balance Range Circuit Integration (No dependencies)
  results.push(
    await runTest(
      'Balance Range Circuit Integration',
      'bun run test-balance-range.ts',
      'packages/core'
    )
  );

  // * Test 2: TypeScript Compilation Check
  results.push(
    await runTest(
      'TypeScript Compilation',
      'bun run check',
      'packages/core'
    )
  );

  // * Test 3: Circuit Compilation (Noir)
  results.push(
    await runTest(
      'Wallet Ownership Circuit',
      'nargo test',
      'packages/circuit'
    )
  );

  results.push(
    await runTest(
      'Balance Range Circuit',
      'nargo test',
      'packages/circuit-balance-range'
    )
  );

  // * Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error.substring(0, 100)}...`);
    }
  });

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${results.length}`);
  }

  // * Note about Anchor tests
  console.log('\n' + '='.repeat(60));
  console.log('ℹ️  ANCHOR TESTS REQUIRE SOLANA VALIDATOR');
  console.log('='.repeat(60));
  console.log(`
To run Anchor integration tests, you need:

1. Start local Solana validator:
   solana-test-validator

2. Set environment variables:
   export ANCHOR_PROVIDER_URL=http://localhost:8899
   export ANCHOR_WALLET=~/.config/solana/id.json

3. Deploy program:
   cd packages/anchor
   anchor build
   anchor deploy

4. Run tests:
   cd packages/anchor
   bun test tests/*.ts
`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
