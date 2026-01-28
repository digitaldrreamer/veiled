<script lang="ts">
  import { VeiledAuth } from '@veiled/core';
  import { Connection, clusterApiUrl } from '@solana/web3.js';
  import { Wallet } from '@coral-xyz/anchor';
  import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
  import type { WalletAdapter as SolanaWalletAdapter } from '@solana/wallet-adapter-base';
  import { createWalletAdapter } from '../lib/wallet.js';
  
  // * Helper to create Anchor Wallet from Solana wallet adapter
  function createAnchorWallet(adapter: SolanaWalletAdapter): Wallet {
    if (!adapter.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    return {
      publicKey: adapter.publicKey,
      signTransaction: (adapter as any).signTransaction?.bind(adapter),
      signAllTransactions: (adapter as any).signAllTransactions?.bind(adapter),
      payer: adapter as any
    } as Wallet;
  }

  let domain = $state<string>(typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  let rpcProvider = $state<'helius' | 'quicknode' | 'custom'>('helius');
  let nullifier = $state<string | null>(null);
  let txSignature = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);
  let isSigningIn = $state(false);
  let walletConnected = $state(false);
  let walletAddress = $state<string | null>(null);
  let veiled: VeiledAuth | null = null;
  let solanaAdapter: SolanaWalletAdapter | null = null;

  // * Initialize wallet adapter
  $effect(() => {
    if (typeof window !== 'undefined') {
      solanaAdapter = new PhantomWalletAdapter();
      
      solanaAdapter.on('connect', () => {
        walletConnected = true;
        walletAddress = solanaAdapter?.publicKey?.toBase58() || null;
      });
      
      solanaAdapter.on('disconnect', () => {
        walletConnected = false;
        walletAddress = null;
      });
    }
  });

  // Initialize VeiledAuth when rpcProvider changes
  $effect(() => {
    if (solanaAdapter) {
      veiled = new VeiledAuth({ rpcProvider });
      
      // * Set wallet adapter
      const veiledAdapter = createWalletAdapter(solanaAdapter);
      veiled.setWalletAdapter(veiledAdapter);
      
      // * Set Solana connection for on-chain submission
      // * Note: On-chain submission requires proper wallet setup
      // * For now, we'll skip it until Anchor IDL is generated
      // if (solanaAdapter.publicKey) {
      //   const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      //   const wallet = {
      //     publicKey: solanaAdapter.publicKey,
      //     signTransaction: (solanaAdapter as any).signTransaction?.bind(solanaAdapter) as any,
      //     signAllTransactions: (solanaAdapter as any).signAllTransactions?.bind(solanaAdapter) as any,
      //     payer: solanaAdapter as any
      //   } as Wallet;
      //   
      //   veiled.setSolanaConnection(connection, wallet);
      // }
    }
  });

  async function connectWallet() {
    if (!solanaAdapter) {
      errorMessage = 'Wallet adapter not initialized';
      return;
    }

    try {
      await solanaAdapter.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errorMessage = message;
    }
  }

  async function disconnectWallet() {
    if (!solanaAdapter) return;
    
    try {
      await solanaAdapter.disconnect();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errorMessage = message;
    }
  }

  async function handleSignIn() {
    if (!walletConnected || !solanaAdapter) {
      await connectWallet();
      if (!walletConnected) return;
    }

    isSigningIn = true;
    errorMessage = null;
    txSignature = null;

    try {
      if (!veiled || !solanaAdapter) {
        if (!solanaAdapter) {
          errorMessage = 'Wallet adapter not initialized';
          return;
        }
        veiled = new VeiledAuth({ rpcProvider });
        const veiledAdapter = createWalletAdapter(solanaAdapter);
        veiled.setWalletAdapter(veiledAdapter);
        
        // * Set Solana connection for on-chain submission
        if (solanaAdapter.publicKey) {
          const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
          const wallet = createAnchorWallet(solanaAdapter);
          veiled.setSolanaConnection(connection, wallet);
        }
      }

      const result = await veiled.signIn({
        requirements: { wallet: true },
        domain
      });

      nullifier = result.nullifier;
      txSignature = result.txSignature || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errorMessage = message;
    } finally {
      isSigningIn = false;
    }
  }
</script>

<main class="mx-auto max-w-2xl px-6 py-10">
  <section class="space-y-2">
    <h1 class="text-3xl font-semibold tracking-tight">Veiled Demo</h1>
    <p class="text-sm text-neutral-600">
      Privacy-preserving authentication using zero-knowledge proofs. Connect your Solana wallet to sign in.
    </p>
  </section>

  <section class="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
    <div class="grid gap-4">
      <div class="grid gap-1">
        <label class="text-sm font-medium" for="domain">Domain (nullifier scope)</label>
        <input
          id="domain"
          class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          bind:value={domain}
          placeholder="myapp.com"
        />
      </div>

      <div class="grid gap-1">
        <label class="text-sm font-medium" for="rpcProvider">RPC Provider</label>
        <select
          id="rpcProvider"
          class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          bind:value={rpcProvider}
        >
          <option value="helius">Helius</option>
          <option value="quicknode">Quicknode</option>
          <option value="custom">Custom</option>
        </select>
        <p class="text-xs text-neutral-500">
          RPC config is a placeholder here — the real flow will fetch NFT/balance data via the selected provider.
        </p>
      </div>

      {#if !walletConnected}
        <button
          class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          onclick={connectWallet}
        >
          Connect Phantom Wallet
        </button>
      {:else}
        <div class="rounded-lg bg-green-50 p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-green-700">Wallet Connected</div>
              <div class="mt-1 break-all font-mono text-xs text-green-900">{walletAddress}</div>
            </div>
            <button
              class="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
              onclick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        </div>
      {/if}

      <div class="flex items-center gap-3">
        <button
          class="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={handleSignIn}
          disabled={isSigningIn || !walletConnected}
        >
          {isSigningIn ? 'Generating Proof…' : 'Sign in with Veiled'}
        </button>

        {#if nullifier}
          <span class="text-xs text-neutral-600">✅ Authenticated</span>
        {/if}
      </div>

      {#if nullifier}
        <div class="rounded-lg bg-neutral-50 p-3">
          <div class="text-xs font-medium text-neutral-700">Nullifier</div>
          <div class="mt-1 break-all font-mono text-xs text-neutral-900">{nullifier}</div>
        </div>
      {/if}

      {#if txSignature}
        <div class="rounded-lg bg-blue-50 p-3">
          <div class="text-xs font-medium text-blue-700">Transaction Signature</div>
          <div class="mt-1 break-all font-mono text-xs text-blue-900">{txSignature}</div>
          <a
            href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 inline-block text-xs text-blue-600 hover:text-blue-800"
          >
            View on Solscan →
          </a>
        </div>
      {/if}

      {#if errorMessage}
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      {/if}
    </div>
  </section>
</main>
