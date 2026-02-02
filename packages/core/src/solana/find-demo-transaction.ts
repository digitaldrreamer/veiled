// * Utility to find a demo transaction for viewing on Solscan
// * Shows how to look up transactions by program ID or nullifier PDA

import { Connection, PublicKey } from '@solana/web3.js';
import { VEILED_PROGRAM_ID } from './program.js';

/**
 * * Finds a recent transaction from your Veiled program for demo purposes
 * * Returns transaction signature that can be viewed on Solscan
 */
export async function findDemoTransaction(
  connection: Connection,
  limit: number = 10
): Promise<{
  signature: string;
  slot: number;
  blockTime: number | null;
  explorerUrl: string;
} | null> {
  try {
    // * Get recent signatures for your program
    const signatures = await connection.getSignaturesForAddress(
      VEILED_PROGRAM_ID,
      { limit }
    );

    if (signatures.length === 0) {
      console.log('❌ No transactions found for program:', VEILED_PROGRAM_ID.toBase58());
      return null;
    }

    // * Get the most recent transaction
    const mostRecent = signatures[0];
    
    const explorerUrl = `https://solscan.io/tx/${mostRecent.signature}?cluster=devnet`;
    const programUrl = `https://solscan.io/account/${VEILED_PROGRAM_ID.toBase58()}?cluster=devnet`;

    console.log('\n✅ Found demo transaction!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Transaction Signature:');
    console.log(`   ${mostRecent.signature}`);
    console.log('\n🔗 View on Solscan:');
    console.log(`   ${explorerUrl}`);
    console.log('\n📊 View all program transactions:');
    console.log(`   ${programUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      signature: mostRecent.signature,
      slot: mostRecent.slot,
      blockTime: mostRecent.blockTime ?? null,
      explorerUrl
    };
  } catch (error) {
    console.error('❌ Error finding transaction:', error);
    return null;
  }
}

/**
 * * Finds the PDA account for a nullifier and shows how to view it on Solscan
 * * This is useful for checking if a specific nullifier was used
 */
export function getNullifierPdaAddress(nullifierHex: string): {
  pda: PublicKey;
  explorerUrl: string;
} {
  // * Convert hex string to bytes
  const nullifierBytes = hexToBytes(nullifierHex);
  
  // * Derive PDA (same as in program.ts)
  const [nullifierPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('nullifier'), Buffer.from(nullifierBytes)],
    VEILED_PROGRAM_ID
  );

  const explorerUrl = `https://solscan.io/account/${nullifierPda.toBase58()}?cluster=devnet`;

  console.log('\n🔍 Nullifier PDA Account:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Nullifier (hex):', nullifierHex);
  console.log('🏦 PDA Address:', nullifierPda.toBase58());
  console.log('\n🔗 View on Solscan:');
  console.log(`   ${explorerUrl}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    pda: nullifierPda,
    explorerUrl
  };
}

/**
 * * Helper to convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * * Quick demo function - finds and displays a transaction
 */
export async function showDemoTransaction(rpcUrl: string = 'https://api.devnet.solana.com') {
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('🔍 Searching for demo transaction...');
  console.log('📋 Program ID:', VEILED_PROGRAM_ID.toBase58());
  console.log('🌐 RPC:', rpcUrl);
  console.log('');
  
  const result = await findDemoTransaction(connection);
  
  if (result) {
    console.log('💡 Tip: You can also search by nullifier PDA address on Solscan');
    console.log('   Use getNullifierPdaAddress(nullifierHex) to get the PDA address\n');
  }
  
  return result;
}
