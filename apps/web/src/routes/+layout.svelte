<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>Veiled - Privacy-Preserving Authentication for Solana</title>
	<meta
		name="description"
		content="Authenticate on Solana without exposing your wallet address, balance, or transaction history. OAuth-level privacy for Web3 with zero-knowledge proofs."
	/>
	<link rel="icon" href={favicon} />
	<link
		rel="stylesheet"
		href="https://unpkg.com/@speed-highlight/core/dist/themes/github-dark.css"
	/>
</svelte:head>
{@render children()}
