#!/usr/bin/env tsx
/**
 * * Verifies a collection on an existing NFT
 * * This is needed for the NFT to appear in DAS API grouping array
 * * 
 * * Usage:
 * *   bun run verify-nft-collection <NFT_MINT_ADDRESS> <COLLECTION_MINT_ADDRESS>
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  keypairIdentity, 
  publicKey,
} from '@metaplex-foundation/umi';
import { 
  verifyCollectionV1,
  findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSplAssociatedTokenProgram,
  createSplTokenProgram,
} from '@metaplex-foundation/mpl-toolbox';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Keypair } from '@solana/web3.js';

// * Get wallet keypair
function getWalletKeypair(): Keypair {
  const keypairPath = process.env.SOLANA_KEYPAIR;
  if (keypairPath) {
    try {
      const keypairData = JSON.parse(readFileSync(keypairPath, 'utf-8'));
      return Keypair.fromSecretKey(Uint8Array.from(keypairData));
    } catch (error) {
      throw new Error(`Failed to load keypair from ${keypairPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const defaultPath = join(process.env.HOME || '', '.config/solana/id.json');
  try {
    const keypairData = JSON.parse(readFileSync(defaultPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (error) {
    throw new Error(
      `Could not find wallet keypair. Set SOLANA_KEYPAIR env var or ensure default keypair exists at ${defaultPath}`
    );
  }
}

async function main() {
  const nftMintAddress = process.argv[2];
  const collectionMintAddress = process.argv[3];

  if (!nftMintAddress || !collectionMintAddress) {
    console.error('Usage: bun run verify-nft-collection <NFT_MINT_ADDRESS> <COLLECTION_MINT_ADDRESS>');
    console.error('\nExample:');
    console.error('  bun run verify-nft-collection Bxp1KQ1yBD7KaZw9AAxENdXWAziduZxBPb6PzZkBoSU9 3PcvomKABrxWJdJzajKEP4hQXxfqWVtKVXWc6aLSMsdE');
    process.exit(1);
  }

  console.log('🔍 Verifying Collection on NFT\n');
  console.log('   NFT Mint:', nftMintAddress);
  console.log('   Collection:', collectionMintAddress, '\n');

  // * Setup Umi
  const heliusApiKey = process.env.HELIUS_API_KEY || '7e89c8e8-ccd1-43c3-bd7f-73c5a1d9fe54';
  const rpcUrl = process.env.HELIUS_DEVNET_URL || `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  const umi = createUmi(rpcUrl);
  
  umi.programs.add(createSplTokenProgram());
  umi.programs.add(createSplAssociatedTokenProgram());

  // * Load wallet keypair (must be collection authority or NFT owner)
  const walletKeypair = getWalletKeypair();
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(walletKeypair.secretKey);
  umi.use(keypairIdentity(umiKeypair));

  console.log('💰 Using wallet:', walletKeypair.publicKey.toString());
  console.log('   (This wallet must be the collection authority)\n');

  try {
    const nftMint = publicKey(nftMintAddress);
    const collectionMint = publicKey(collectionMintAddress);
    
    const nftMetadata = findMetadataPda(umi, { mint: nftMint });
    
    console.log('📝 Verifying collection...');
    const result = await verifyCollectionV1(umi, {
      metadata: nftMetadata,
      collectionMint: collectionMint,
      authority: umi.identity,
    }).sendAndConfirm(umi);

    console.log('✅ Collection verified successfully!');
    console.log('   Transaction Signature:', result.signature);
    console.log('\n💡 The NFT should now appear in DAS API grouping array.');
    console.log('   Wait a few seconds for the API to update, then try the circuit again.\n');

  } catch (error) {
    console.error('\n❌ Error verifying collection:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.message.includes('Incorrect account owner')) {
        console.error('\n💡 Tip: The wallet must be the collection authority.');
        console.error('   Make sure you\'re using the wallet that created the collection.');
      }
    }
    process.exit(1);
  }
}

main().catch(console.error);
