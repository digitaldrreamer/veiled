<script lang="ts">
  import { VeiledAuth, Permission, type VeiledRequirements, type SignInOptions, type Session } from '@veiled/core';
  import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
  import type { Transaction, VersionedTransaction } from '@solana/web3.js';
  import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
  import type { WalletAdapter as SolanaWalletAdapter } from '@solana/wallet-adapter-base';
  
  // * Enable debug logging in development
  if (typeof window !== 'undefined') {
    (window as any).__VEILED_DEBUG__ = true;
    console.log('[Veiled Demo] Debug logging enabled');
  }
  
  // * Anchor Wallet interface (matches @coral-xyz/anchor Wallet type)
  // * Uses generic types to support both Transaction and VersionedTransaction
  interface AnchorWallet {
    publicKey: PublicKey;
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
    payer: any; // Required by Anchor's Wallet type
  }
  
  // * Helper to create Anchor Wallet from Solana wallet adapter
  function createAnchorWallet(adapter: SolanaWalletAdapter): AnchorWallet {
    if (!adapter.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    return {
      publicKey: adapter.publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
        if (typeof (adapter as any).signTransaction === 'function') {
          return await (adapter as any).signTransaction(tx);
        }
        throw new Error('Wallet adapter does not support signTransaction');
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
        if (typeof (adapter as any).signAllTransactions === 'function') {
          return await (adapter as any).signAllTransactions(txs);
        }
        throw new Error('Wallet adapter does not support signAllTransactions');
      },
      payer: adapter as any
    };
  }

  // * Helius Secure URL for devnet (safe to expose - no API key needed)
  // * Get your Secure URL from: https://dashboard.helius.dev → RPCs → Secure RPC
  // * Format: https://ABC-123-fast-devnet.helius-rpc.com
  const HELIUS_SECURE_DEVNET = 'https://devnet.helius-rpc.com/?api-key=7e89c8e8-ccd1-43c3-bd7f-73c5a1d9fe54';
  
  // * Quicknode endpoint for devnet (NFT ownership circuit - DAS API)
  // * Get your endpoint from: https://dashboard.quicknode.com → Endpoints
  const QUICKNODE_DEVNET_ENDPOINT = 'https://patient-skilled-arrow.solana-devnet.quiknode.pro/6716eee99a064e95be4c29b6dc3edd130464ee66/';
  
  let domain = $state<string>(typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  let rpcProvider = $state<'helius' | 'quicknode' | 'custom'>('helius');
  let circuitType = $state<'wallet_ownership' | 'balance_range' | 'nft_ownership'>('wallet_ownership');
  let minimumBalance = $state<string>('1000000000'); // 1 SOL in lamports
  let nftCollection = $state<string>(''); // NFT collection address
  let nullifier = $state<string | null>(null);
  let txSignature = $state<string | null>(null);
  let balanceRangeBucket = $state<number | null>(null);
  let actualCircuitUsed = $state<'wallet_ownership' | 'balance_range' | 'nft_ownership' | null>(null);
  let errorMessage = $state<string | null>(null);
  let isSigningIn = $state(false);
  let walletConnected = $state(false);
  let walletAddress = $state<string | null>(null);
  let veiled: VeiledAuth | null = null;
  let solanaAdapter: SolanaWalletAdapter | null = null;
  let requestPermissions = $state(false);
  let grantedPermissions = $state<Permission[]>([]);

  // * Initialize wallet adapter
  // * PhantomWalletAdapter handles detection internally - no need to check window.solana manually
  $effect(() => {
    if (typeof window !== 'undefined') {
      // * Always create adapter - it handles Phantom detection internally
      solanaAdapter = new PhantomWalletAdapter();
      
      solanaAdapter.on('connect', () => {
        console.log('Wallet connected event fired');
        walletConnected = true;
        walletAddress = solanaAdapter?.publicKey?.toBase58() || null;
        // * VeiledAuth will be created in handleSignIn() with proper config
      });
      
      solanaAdapter.on('disconnect', () => {
        console.log('Wallet disconnected event fired');
        walletConnected = false;
        walletAddress = null;
        veiled = null;
      });

      // * Check if already connected
      if (solanaAdapter.connected && solanaAdapter.publicKey) {
        walletConnected = true;
        walletAddress = solanaAdapter.publicKey.toBase58();
      }
    }
  });

  // * VeiledAuth is created in handleSignIn() with proper config including quicknodeEndpoint
  // * No need to create it here - it will be created when needed with the correct settings

  async function connectWallet() {
    if (!solanaAdapter) {
      errorMessage = 'Wallet adapter not initialized';
      return;
    }

    // * PhantomWalletAdapter will throw an error if Phantom isn't available
    // * Let the adapter handle detection - no need to check window.solana manually
    try {
      console.log('Connecting to Phantom wallet...');
      await solanaAdapter.connect();
      console.log('Wallet connected:', solanaAdapter.publicKey?.toBase58());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Wallet connection error:', err);
      
      // * Provide helpful error message
      if (message.includes('Phantom') || message.includes('not found') || message.includes('not installed')) {
        errorMessage = 'Phantom wallet not found. Please install Phantom extension from https://phantom.app';
      } else {
        errorMessage = `Failed to connect: ${message}`;
      }
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
      if (!solanaAdapter) {
        errorMessage = 'Wallet adapter not initialized';
        return;
      }

      // * Always recreate VeiledAuth to ensure latest config (especially quicknodeEndpoint for NFT circuit)
      veiled = new VeiledAuth({
        chain: 'solana',
        rpcProvider,
        wallet: solanaAdapter,
        // * Primary RPC URL (takes precedence)
        // * For Helius: Use Secure URL (safe to expose, no API key needed)
        // * For Quicknode: Use endpoint URL
        rpcUrl: rpcProvider === 'helius' 
          ? HELIUS_SECURE_DEVNET  // ✅ Helius Secure URL - safe to expose!
          : rpcProvider === 'quicknode'
          ? QUICKNODE_DEVNET_ENDPOINT
          : undefined,
        // * Quicknode endpoint for NFT ownership circuit (DAS API)
        // * REQUIRED for NFT ownership circuit regardless of RPC provider
        quicknodeEndpoint: QUICKNODE_DEVNET_ENDPOINT
      });
      
      // * Set Solana connection for on-chain submission
      // * Connection will be auto-created from rpcUrl if not provided
      if (solanaAdapter.publicKey) {
        const wallet = createAnchorWallet(solanaAdapter);
        // * Pass wallet only - connection will be created from config.rpcUrl
        veiled.setSolanaConnection(undefined, wallet);
      }

      // * Prepare requirements based on circuit type
      // * Note: wallet: true is always required as a base requirement
      const requirements: VeiledRequirements = { wallet: true };
      
      if (circuitType === 'balance_range') {
        const minBalance = parseInt(minimumBalance, 10);
        if (isNaN(minBalance) || minBalance < 0) {
          errorMessage = 'Invalid minimum balance';
          return;
        }
        requirements.balance = { minimum: minBalance };
      } else if (circuitType === 'nft_ownership') {
        if (!nftCollection || nftCollection.trim() === '') {
          errorMessage = 'NFT collection address is required';
          return;
        }
        requirements.nft = { collection: nftCollection.trim() };
        console.log('🔵 [DEMO] NFT Ownership selected - requirements.nft:', requirements.nft);
      }
      
      console.log('🔵 [DEMO] Final requirements object:', JSON.stringify(requirements, null, 2));
      console.log('🔵 [DEMO] Circuit type selected:', circuitType);

      // * Prepare permissions if requested
      const signInOptions: SignInOptions = {
        requirements,
        domain
      };

      if (requestPermissions) {
        signInOptions.permissions = {
          permissions: [Permission.RevealWalletAddress],
          reason: 'Demo: Requesting wallet address permission to test the permission modal',
          duration: 3600 // 1 hour
        };
      }

      console.log('🔵 [DEMO] ========================================');
      console.log('🔵 [DEMO] About to call veiled.signIn()');
      console.log('🔵 [DEMO] Requirements:', JSON.stringify(requirements, null, 2));
      console.log('🔵 [DEMO] Permissions requested:', requestPermissions);
      console.log('🔵 [DEMO] Domain:', domain);
      console.log('🔵 [DEMO] Veiled instance:', veiled);
      console.log('🔵 [DEMO] ========================================');
      
      const result = await veiled.signIn(signInOptions);
      
      console.log('🔵 [DEMO] ✅ signIn() completed successfully');
      console.log('🔵 [DEMO] Result:', result);

      nullifier = result.nullifier;
      txSignature = result.txSignature || null;
      grantedPermissions = result.permissions || [];
      
      // * Extract balance range bucket if using balance range circuit
      if (circuitType === 'balance_range' && result.balanceRangeBucket !== undefined) {
        balanceRangeBucket = result.balanceRangeBucket;
      } else {
        balanceRangeBucket = null;
      }
    } catch (err) {
      let message = 'Unknown error occurred';
      
      // * Extract error message from various error formats
      if (err instanceof Error) {
        message = err.message || err.name || err.toString();
        if (err.stack) {
          console.error('🔴 [DEMO] Error stack:', err.stack);
        }
      } else if (typeof err === 'string') {
        message = err;
      } else if (err && typeof err === 'object') {
        // * Try multiple ways to extract error message
        const errorObj = err as any;
        message = errorObj.message 
          || errorObj.error?.message 
          || errorObj.errorMessage
          || errorObj.toString?.()
          || JSON.stringify(err, null, 2);
      } else {
        message = String(err);
      }
      
      // * If message is still generic, try to get more details
      if (message === 'Unknown error occurred' || message === 'Unexpected error') {
        try {
          message = `Error: ${JSON.stringify(err, Object.getOwnPropertyNames(err || {}))}`;
        } catch {
          message = `Error: ${String(err)}`;
        }
      }
      
      console.error('🔴 [DEMO] ========================================');
      console.error('🔴 [DEMO] ERROR in handleSignIn:', message);
      console.error('🔴 [DEMO] Error type:', typeof err);
      console.error('🔴 [DEMO] Error object:', err);
      try {
        console.error('🔴 [DEMO] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
      } catch {
        console.error('🔴 [DEMO] Full error (stringified):', String(err));
      }
      console.error('🔴 [DEMO] ========================================');
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
        <label class="text-sm font-medium" for="circuitType">Circuit Type</label>
        <select
          id="circuitType"
          class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          bind:value={circuitType}
        >
          <option value="wallet_ownership">Wallet Ownership (Default)</option>
          <option value="balance_range">Balance Range (Selective Disclosure)</option>
          <option value="nft_ownership">NFT Ownership (Collection Verification)</option>
        </select>
        <p class="text-xs text-neutral-500">
          Wallet Ownership: Proves you own a wallet without revealing address.
          Balance Range: Proves you have ≥X SOL and reveals range bucket (0-10, 10-100, 100-1000, 1000+ SOL).
          NFT Ownership: Proves you own an NFT from a specific collection without revealing which NFT.
        </p>
      </div>

      {#if circuitType === 'balance_range'}
        <div class="grid gap-1">
          <label class="text-sm font-medium" for="minimumBalance">Minimum Balance (lamports)</label>
          <input
            id="minimumBalance"
            type="number"
            class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            bind:value={minimumBalance}
            placeholder="1000000000"
          />
          <p class="text-xs text-neutral-500">
            1 SOL = 1,000,000,000 lamports. Example: 1 SOL = 1000000000, 10 SOL = 10000000000
          </p>
        </div>
      {/if}
      
      {#if circuitType === 'nft_ownership'}
        <div class="grid gap-1">
          <label class="text-sm font-medium" for="nftCollection">NFT Collection Address</label>
          <input
            id="nftCollection"
            type="text"
            class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Collection address (base58)"
            bind:value={nftCollection}
          />
          <p class="text-xs text-neutral-500">
            Enter the Solana collection address (base58 format). The circuit will verify you own an NFT from this collection.
          </p>
        </div>
      {/if}

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
          Used to fetch balance data for balance range circuit.
        </p>
      </div>

      <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            class="rounded border-neutral-300"
            bind:checked={requestPermissions}
          />
          <div>
            <div class="text-sm font-medium text-neutral-700">
              Request Permission (Test Permission Modal)
            </div>
            <p class="text-xs text-neutral-500">
              Enable this to test the permission request flow. The PermissionModal will appear during sign-in.
            </p>
          </div>
        </label>
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

      {#if balanceRangeBucket !== null}
        <div class="rounded-lg bg-purple-50 p-3">
          <div class="text-xs font-medium text-purple-700">Balance Range Bucket</div>
          <div class="mt-1 text-sm font-semibold text-purple-900">
            {balanceRangeBucket === 0 
              ? '0-10 SOL'
              : balanceRangeBucket === 1
              ? '10-100 SOL'
              : balanceRangeBucket === 2
              ? '100-1000 SOL'
              : balanceRangeBucket === 3
              ? '1000+ SOL'
              : `Unknown bucket: ${balanceRangeBucket}`}
          </div>
          <p class="mt-1 text-xs text-purple-600">
            ✅ You've proven your balance is in this range without revealing the exact amount!
          </p>
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

      {#if grantedPermissions.length > 0}
        <div class="rounded-lg bg-orange-50 p-3">
          <div class="text-xs font-medium text-orange-700">Granted Permissions</div>
          <div class="mt-2 space-y-1">
            {#each grantedPermissions as permission}
              <div class="text-xs text-orange-900">
                • {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            {/each}
          </div>
          <p class="mt-2 text-xs text-orange-600">
            ⚠️ These permissions reduce your privacy score. You can revoke them in the Veiled extension.
          </p>
          <p class="mt-2 text-xs text-neutral-500">
            💡 Note: Permissions are separate from circuit type. "Reveal Wallet_address" is a permission you granted (from the "Request Permission" checkbox), not the circuit used for authentication. Check the browser console (F12) to see which circuit was actually used (wallet_ownership, balance_range, or nft_ownership).
          </p>
        </div>
      {:else if nullifier}
        <div class="rounded-lg bg-green-50 p-3">
          <div class="text-xs font-medium text-green-700">Privacy Status</div>
          <p class="mt-1 text-xs text-green-600">
            ✅ No permissions granted - Maximum privacy (10/10)
          </p>
        </div>
      {/if}

      {#if errorMessage}
        <div class="rounded-lg border border-red-200 bg-red-50 p-3">
          <div class="text-sm font-medium text-red-800">Error</div>
          <div class="mt-1 text-sm text-red-700" style="word-break: break-word;">{errorMessage}</div>
          <p class="mt-2 text-xs text-red-600">
            💡 Check the browser console (F12) for detailed error logs
          </p>
        </div>
      {/if}
    </div>
  </section>
</main>
