#!/usr/bin/env tsx
// * Quick script to find a demo transaction for viewing on Solscan
// * Usage: npx tsx scripts/find-demo-tx.ts

import { Connection } from '@solana/web3.js';
import { showDemoTransaction, getNullifierPdaAddress } from '../packages/core/src/solana/find-demo-transaction.js';

async function main() {
  // * Use devnet RPC (or pass custom RPC as argument)
  const rpcUrl = process.argv[2] || 'https://api.devnet.solana.com';
  
  console.log('🚀 Finding demo transaction...\n');
  
  const result = await showDemoTransaction(rpcUrl);
  
  if (!result) {
    console.log('\n💡 No transactions found. Make sure you have:');
    console.log('   1. Deployed your program to devnet');
    console.log('   2. Made at least one authentication call');
    console.log('   3. Using the correct RPC URL\n');
    process.exit(1);
  }
  
  // * Example: If you have a nullifier, you can also look it up
  if (process.argv[3]) {
    const nullifierHex = process.argv[3];
    console.log('\n🔍 Looking up nullifier PDA...');
    getNullifierPdaAddress(nullifierHex);
  }
}

main().catch(console.error);
