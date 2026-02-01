#!/usr/bin/env tsx
/**
 * * Mints a test NFT collection and NFT on Solana devnet
 * * Used for testing the nft_ownership circuit
 * * 
 * * Usage:
 * *   1. Ensure dependencies are installed: bun install
 * *   2. Set your wallet keypair path or use SOLANA_KEYPAIR env var
 * *   3. Run: bun run mint-devnet-nft
 * * 
 * * The script will:
 * *   - Create a collection NFT
 * *   - Mint an NFT into that collection
 * *   - Verify the collection
 * *   - Output the collection address for use in the demo app
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  generateSigner, 
  keypairIdentity, 
  percentAmount,
  publicKey,
} from '@metaplex-foundation/umi';
import { 
  createNft,
  verifyCollectionV1,
  fetchDigitalAsset,
  findMetadataPda,
  transferV1,
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSplAssociatedTokenProgram,
  createSplTokenProgram,
} from '@metaplex-foundation/mpl-toolbox';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Keypair } from '@solana/web3.js';

// * Target wallet address for NFT ownership circuit testing
const TARGET_WALLET_ADDRESS = 'DeNHPhqeniWaLqMgD91fnpVK6CUoqx6aK1aQrFoULgHo';

// * Get wallet keypair
function getWalletKeypair(): Keypair {
  // * Option 1: Use SOLANA_KEYPAIR env var
  const keypairPath = process.env.SOLANA_KEYPAIR;
  if (keypairPath) {
    try {
      const keypairData = JSON.parse(readFileSync(keypairPath, 'utf-8'));
      return Keypair.fromSecretKey(Uint8Array.from(keypairData));
    } catch (error) {
      throw new Error(`Failed to load keypair from ${keypairPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // * Option 2: Use default Solana CLI keypair location
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
  console.log('🎨 Minting Devnet NFT Collection and NFT for Circuit Testing\n');

  // * 1. Setup Umi with devnet RPC
  // * Use Helius devnet if available, fallback to public devnet
  const heliusApiKey = process.env.HELIUS_API_KEY || '7e89c8e8-ccd1-43c3-bd7f-73c5a1d9fe54';
  const rpcUrl = process.env.HELIUS_DEVNET_URL || `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  const umi = createUmi(rpcUrl);
  
  // * Register SPL programs using proper helpers (required for NFT minting)
  // * These helpers create full Program objects with all required methods
  umi.programs.add(createSplTokenProgram());
  umi.programs.add(createSplAssociatedTokenProgram());
  
  console.log('✅ Connected to Solana devnet');
  console.log('   RPC:', rpcUrl, '\n');

  // * 2. Load wallet keypair
  const walletKeypair = getWalletKeypair();
  const walletPublicKey = walletKeypair.publicKey.toString();
  console.log('💰 Wallet Address:', walletPublicKey);
  console.log('   (Make sure this wallet has devnet SOL!)\n');

  // * Convert Solana Keypair to Umi format
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
    walletKeypair.secretKey
  );
  umi.use(keypairIdentity(umiKeypair));

  try {
    // * 3. Create Collection NFT
    console.log('📦 Step 1: Creating Collection NFT...');
    const collectionMint = generateSigner(umi);
    
    await createNft(umi, {
      mint: collectionMint,
      name: 'Veiled Circuit Test Collection',
      uri: 'https://example.com/collection.json',
      sellerFeeBasisPoints: percentAmount(0),
      isCollection: true,
    }).sendAndConfirm(umi);

    const collectionAddress = collectionMint.publicKey.toString();
    console.log('✅ Collection created!');
    console.log('   Collection Address:', collectionAddress);
    console.log('   👆 COPY THIS ADDRESS FOR YOUR DEMO APP\n');

    // * 4. Mint an NFT into that collection
    console.log('🎨 Step 2: Minting NFT into collection...');
    const nftMint = generateSigner(umi);
    
    const mintResult = await createNft(umi, {
      mint: nftMint,
      name: 'Veiled Circuit Test NFT #1',
      uri: 'https://example.com/nft.json',
      sellerFeeBasisPoints: percentAmount(0),
      collection: {
        verified: false,
        key: collectionMint.publicKey,
      },
    }).sendAndConfirm(umi);

    console.log('✅ NFT minted!');
    console.log('   NFT Mint Address:', nftMint.publicKey.toString());
    console.log('   Transaction Signature:', mintResult.signature);
    console.log('   Current Owner:', walletPublicKey);

    // * 4.5. Verify collection on NFT (required for DAS API grouping)
    console.log('\n🔍 Step 2.5: Verifying collection on NFT...');
    try {
      const nftMetadata = findMetadataPda(umi, { mint: nftMint.publicKey });
      await verifyCollectionV1(umi, {
        metadata: nftMetadata,
        collectionMint: collectionMint.publicKey,
        authority: umi.identity,
      }).sendAndConfirm(umi);
      console.log('✅ Collection verified on NFT!');
      console.log('   This ensures the NFT appears in DAS API grouping array\n');
    } catch (verifyError) {
      console.warn('⚠️  Collection verification failed:', verifyError instanceof Error ? verifyError.message : String(verifyError));
      console.warn('   The NFT may not appear in collection filters until verified.\n');
    }

    // * 5. Transfer NFT to target wallet
    console.log('\n📤 Step 3: Transferring NFT to target wallet...');
    
    // * Wait for the mint transaction to fully propagate on the network
    console.log('   Waiting for transaction to fully confirm on network...');
    let nftAsset;
    let retries = 10;
    while (retries > 0) {
      try {
        nftAsset = await fetchDigitalAsset(umi, nftMint.publicKey);
        console.log('   ✅ NFT account found!');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('   ❌ Failed to fetch NFT after multiple attempts');
          throw error;
        }
        console.log(`   Waiting for account propagation (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // * Create PublicKey for target wallet
    const targetWalletPubkey = publicKey(TARGET_WALLET_ADDRESS);
    console.log('   Target wallet:', TARGET_WALLET_ADDRESS);
    console.log('   NFT Mint:', nftMint.publicKey.toString()); // * Use the known-good PublicKey
    
    // * Try transferV1 - if it fails, we'll catch and provide manual instructions
    try {
      const transferResult = await transferV1(umi, {
        asset: nftAsset,
        newOwner: targetWalletPubkey,
      }).sendAndConfirm(umi);
      
      console.log('✅ NFT transferred!');
      console.log('   Transfer signature:', transferResult.signature);
      console.log('   New Owner:', TARGET_WALLET_ADDRESS);
      console.log('   👆 This is the wallet you should connect in the demo app\n');
    } catch (transferError) {
      console.error('   ❌ Transfer failed:', transferError instanceof Error ? transferError.message : String(transferError));
      console.log('\n⚠️  Manual Transfer Required:');
      console.log('   NFT Mint:', nftMint.publicKey.toString());
      console.log('   Current Owner:', walletPublicKey);
      console.log('   Target Owner:', TARGET_WALLET_ADDRESS);
      console.log('   Collection:', collectionAddress);
      console.log('\n   You can transfer manually using Phantom wallet or Solana CLI.\n');
      // * Don't throw - allow script to continue and show collection address
    }

    // * 6. Verify collection (optional - skip if you already have a collection)
    // * Uncomment below if you want to verify the collection
    // console.log('\n🔍 Step 3: Verifying collection...');
    // const nftMetadata = findMetadataPda(umi, { mint: nftMint.publicKey });
    // await verifyCollectionV1(umi, {
    //   metadata: nftMetadata,
    //   collectionMint: collectionMint.publicKey,
    //   authority: umi.identity,
    // }).sendAndConfirm(umi);
    // console.log('✅ Collection verified!\n');

    // * 7. Verify the NFT was created correctly
    console.log('🔍 Step 4: Verifying NFT ownership...');
    const nft = await fetchDigitalAsset(umi, nftMint.publicKey);
    console.log('✅ NFT verified!');
    console.log('   Name:', nft.metadata.name);
    const collectionKey = nft.metadata.collection?.key;
    console.log('   Collection:', collectionKey ? collectionKey.toString() : 'None');
    console.log('   Collection Verified:', nft.metadata.collection?.verified || false);
    const owner = nft.ownership?.owner;
    if (owner) {
      console.log('   Current Owner:', owner.toString());
      console.log('   ✅ Owner matches target wallet:', owner.toString() === TARGET_WALLET_ADDRESS);
    } else {
      console.log('   Current Owner: Unknown (ownership info not available)');
    }

    // * 8. Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Your test NFT is ready.');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the Collection Address above');
    console.log('2. Paste it into your demo app\'s "NFT Collection Address" field');
    console.log('3. Make sure your wallet (', TARGET_WALLET_ADDRESS, ') is connected');
    console.log('4. Select "NFT Ownership" circuit type');
    console.log('5. Click "Sign in with Veiled"\n');
    console.log('💡 The circuit will verify you own an NFT from this collection');
    console.log('   without revealing which specific NFT you own!\n');

  } catch (error) {
    console.error('\n❌ Error minting NFT:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.message.includes('insufficient funds') || 
          error.message.includes('no prior credit') ||
          error.message.includes('Insufficient')) {
        console.error('\n💡 Tip: You need devnet SOL! Run:');
        console.error('   solana airdrop 2', walletPublicKey, '--url devnet');
        console.error('   Or use: npm run airdrop-devnet');
      }
    }
    process.exit(1);
  }
}

main().catch(console.error);
