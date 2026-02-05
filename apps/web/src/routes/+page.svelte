<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { createHighlighter } from 'shiki';
	import { ShikiMagicMove } from 'shiki-magic-move/svelte';
	import 'shiki-magic-move/dist/style.css';

	// * Landing page for Veiled - Privacy-preserving authentication for Solana

	let codeBlockElement: HTMLElement | null = null;

	// * 3D tilt state for the code card
	let codeCardTransform = 'rotateX(0deg) rotateY(0deg) translateZ(0)';

	// * Shiki highlighter for animated code blocks (Veiled flow)
	let veiledHighlighterPromise: Promise<unknown> | null = null;

	if (browser) {
		veiledHighlighterPromise = createHighlighter({
			themes: ['nord'],
			langs: ['typescript']
		});
	}

	type VeiledStep = {
		id: number;
		title: string;
		caption: string;
		badge: 'Client-side' | 'On-chain';
		uiHeader: string;
		uiBody: string[];
		code: string;
	};

	const veiledSteps: VeiledStep[] = [
		{
			id: 0,
			title: '1. User grants Veiled permissions',
			caption: 'The app asks for claims; Veiled shows a real permission dialog in the browser.',
			badge: 'Client-side',
			uiHeader: 'Veiled Permissions',
			uiBody: [
				'This app wants to prove:',
				'• You own a Solana wallet',
				'• Your SOL balance ≥ 1 SOL',
				'• You own an NFT from Collection X'
			],
			code: `import { VeiledAuth } from '@veiled/core';

// Public SDK surface — see packages/core/src/veiled-auth.ts
const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'helius',
  rpcUrl: 'https://your-secure-helius-url.helius-rpc.com',
});

const session = await veiled.signIn({
  requirements: { wallet: true },
  domain: 'myapp.com',
});`
		},
		{
			id: 1,
			title: '2. Veiled generates & verifies a ZK proof',
			caption: 'Noir + UltraHonk run in WASM, entirely in the browser.',
			badge: 'Client-side',
			uiHeader: 'Generating zero-knowledge proof…',
			uiBody: [
				'• Fetching minimal data from RPC',
				'• Building private + public circuit inputs',
				'• Running Noir + UltraHonk in your browser',
				'• Verifying proof locally'
			],
			code: `// Internal proof pipeline — excerpt from VeiledAuth.signIn
// See packages/core/src/veiled-auth.ts and packages/core/src/proof/generator.ts

const proofInputs = await prepareProofInputs(options, walletSecretKey);

console.log('🔵 [VEILED] Generating wallet ownership proof...');
const proofResult = await generateProof(proofInputs, 'wallet_ownership');

// Verify proof off-chain using WASM backend (UltraHonk)
const isValid = await verifyProof(
  proofResult.proof,
  proofResult.publicInputsArray,
  proofResult.circuitType,
);`
		},
		{
			id: 2,
			title: '3. Wallet signs a compact verification result',
			caption: 'The wallet signs the statement produced by ZK verification, not your raw data.',
			badge: 'Client-side',
			uiHeader: 'Sign verification result',
			uiBody: [
				'Veiled will ask your wallet to sign:',
				'• Circuit type & domain hash',
				'• Nullifier (per‑app, per‑circuit)',
				'• High‑level claims (e.g. “balance ≥ 1 SOL”)',
				'Your exact balances / NFTs are NOT signed.'
			],
			code: `// Wallet signs verification result — excerpt from VeiledAuth.signIn
// See createVerificationResult in packages/core/src/proof/generator.ts

// Build message to sign: [proof_hash (32) | is_valid (1) | timestamp (8)]
const messageToSign = new Uint8Array(41);
messageToSign.set(proofHash, 0);
messageToSign[32] = isValid ? 1 : 0;

let signature: Uint8Array;
if (this.walletAdapter && typeof this.walletAdapter.signMessage === 'function') {
  signature = await this.walletAdapter.signMessage(messageToSign);
  // Ensure Ed25519 signature is 64 bytes
  if (signature.length !== 64) {
    const paddedSignature = new Uint8Array(64);
    paddedSignature.set(signature.slice(0, 64));
    signature = paddedSignature;
  }
} else {
  signature = new Uint8Array(64);
}

const verificationResult = await createVerificationResult(
  proofResult.proof,
  isValid,
  signature,
);`
		},
		{
			id: 3,
			title: '4. Veiled program records the proof on Solana',
			caption: 'Cheap Ed25519 verification + nullifier replay protection on-chain.',
			badge: 'On-chain',
			uiHeader: 'On-chain verification (Veiled program)',
			uiBody: [
				'• Check wallet signature over verificationResult',
				'• Derive nullifier PDA from domain + circuit + nullifier',
				'• Reject if nullifier already exists (replay)',
				'• Store claims + expiry in the nullifier account'
			],
			code: `// Submit signed verification result to Veiled program
// See submitVerificationResultToChain in packages/core/src/solana/program.ts

const submitResult = await submitVerificationResultToChain({
  verificationResult,
  nullifier: proofResult.publicInputs.nullifier,
  domain: options.domain,
  connection: this.connection,
  wallet: this.wallet,
});

const txSignature = submitResult.signature;`
		}
	];

	let veiledActiveStep = 0;

	function setVeiledStep(index: number) {
		veiledActiveStep = index;
	}

	function nextVeiledStep() {
		veiledActiveStep = (veiledActiveStep + 1) % veiledSteps.length;
	}

	function prevVeiledStep() {
		veiledActiveStep =
			(veiledActiveStep - 1 + veiledSteps.length) % veiledSteps.length;
	}

	function handleCodeMouseMove(event: MouseEvent) {
		const card = event.currentTarget as HTMLElement;
		const rect = card.getBoundingClientRect();

		// * Normalize mouse position to [-0.5, 0.5]
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const percentX = x / rect.width - 0.5;
		const percentY = y / rect.height - 0.5;

		const maxRotate = 8;
		const rotateX = -percentY * maxRotate;
		const rotateY = percentX * maxRotate;

		codeCardTransform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`;
	}

	function handleCodeMouseLeave() {
		codeCardTransform = 'rotateX(0deg) rotateY(0deg) translateZ(0)';
	}

	onMount(async () => {
		// * Client-only: Dynamically import speed-highlight to avoid SSR issues
		if (browser && codeBlockElement) {
			try {
				const { highlightElement } = await import('@speed-highlight/core');
				highlightElement(codeBlockElement, 'ts');
			} catch (error) {
				// * Gracefully degrade if speed-highlight fails to load
				console.warn('Failed to load syntax highlighter:', error);
			}
		}
	});
</script>

<div class="page">
	<!-- SVG Filter for Electric Border -->
	<svg class="svg-container">
		<defs>
			<filter
				id="turbulent-displace"
				color-interpolation-filters="sRGB"
				x="-20%"
				y="-20%"
				width="140%"
				height="140%"
			>
				<feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
				<feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
					<animate
						attributeName="dy"
						values="700; 0"
						dur="6s"
						repeatCount="indefinite"
						calcMode="linear"
					/>
				</feOffset>

				<feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
				<feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
					<animate
						attributeName="dy"
						values="0; -700"
						dur="6s"
						repeatCount="indefinite"
						calcMode="linear"
					/>
				</feOffset>

				<feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="2" />
				<feOffset in="noise1" dx="0" dy="0" result="offsetNoise3">
					<animate
						attributeName="dx"
						values="490; 0"
						dur="6s"
						repeatCount="indefinite"
						calcMode="linear"
					/>
				</feOffset>

				<feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="2" />
				<feOffset in="noise2" dx="0" dy="0" result="offsetNoise4">
					<animate
						attributeName="dx"
						values="0; -490"
						dur="6s"
						repeatCount="indefinite"
						calcMode="linear"
					/>
				</feOffset>

				<feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
				<feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
				<feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />

				<feDisplacementMap
					in="SourceGraphic"
					in2="combinedNoise"
					scale="5"
					xChannelSelector="R"
					yChannelSelector="B"
				/>
			</filter>
		</defs>
	</svg>
	<!-- Navigation -->
	<nav>
		<div class="nav-logo">Veiled</div>
		<div class="nav-links">
			<a href="https://veiled.drreamer.digital" target="_blank" class="nav-link">Demo</a>
			<a href="https://veiled.drreamer.digital/use-cases" target="_blank" class="nav-link">Use cases</a>
			<a href="https://github.com/digitaldrreamer/veiled" target="_blank" class="nav-link">GitHub</a>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="hero">
		<h1 class="hero-title">
			OAuth-level privacy<br />for Web3
		</h1>
		<p class="hero-subtitle">
			Authenticate on Solana without exposing your wallet address, balance, or transaction history.
		</p>
		<div class="hero-cta">
			<a href="https://veiled.drreamer.digital" target="_blank" class="btn-primary">
				Try Demo
			</a>
			<a
				href="https://github.com/digitaldrreamer/veiled#quick-start"
				target="_blank"
				class="btn-secondary"
			>
				Get Started
			</a>
		</div>
	</section>

	<!-- Visual Comparison -->
	<section class="section">
		<div class="visual-comparison">
			<div class="comparison-image-wrapper">
				<div class="image-label traditional">Traditional Auth</div>
				<img
					src="/ai_chat_showing_exposed_credentials.png"
					alt="AI chat showing exposed wallet credentials"
					class="comparison-image"
				/>
			</div>
			<div class="comparison-image-wrapper">
				<div class="image-label veiled">Veiled Auth</div>
				<img
					src="/ai_chat_showing_secure_zk_by_veiled.png"
					alt="AI chat with secure ZK by Veiled"
					class="comparison-image"
				/>
			</div>
		</div>
	</section>

	<!-- Problem/Solution -->
	<section class="section">
		<div class="comparison-grid">
			<!-- Traditional Auth -->
			<div class="comparison-card">
				<div class="card-label traditional">Traditional Auth</div>
				<h3 class="card-title">Exposes Everything</h3>
				<ul class="card-list">
					<li class="card-list-item">
						<span class="card-list-icon" style="color: rgb(248 113 113);">❌</span>
						<span>Wallet address</span>
					</li>
					<li class="card-list-item">
						<span class="card-list-icon" style="color: rgb(248 113 113);">❌</span>
						<span>Complete balance</span>
					</li>
					<li class="card-list-item">
						<span class="card-list-icon" style="color: rgb(248 113 113);">❌</span>
						<span>NFT collection</span>
					</li>
					<li class="card-list-item">
						<span class="card-list-icon" style="color: rgb(248 113 113);">❌</span>
						<span>Transaction history</span>
					</li>
					<li class="card-list-item">
						<span class="card-list-icon" style="color: rgb(248 113 113);">❌</span>
						<span>Trackable across sites</span>
					</li>
				</ul>
			</div>

			<!-- Veiled Auth -->
			<div class="comparison-card featured">
				<div class="glow-layer-1"></div>
				<div class="glow-layer-2"></div>
				<div class="overlay-1"></div>
				<div class="overlay-2"></div>
				<div class="background-glow"></div>
				<div class="card-inner">
					<div class="card-label veiled">Veiled Auth</div>
					<h3 class="card-title">Proves Without Revealing</h3>
					<ul class="card-list">
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.985 0 0);">✅</span>
							<span>Wallet ownership (proven)</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.985 0 0);">✅</span>
							<span>Balance requirements (proven)</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.985 0 0);">✅</span>
							<span>NFT ownership (proven)</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.985 0 0);">✅</span>
							<span>Zero wallet exposure</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.985 0 0);">✅</span>
							<span>Unlinkable across sites and completely clientside (no backend required)</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Key Features -->
	<section class="section">
		<div class="features-container">
			<h2 class="section-title">Why Veiled?</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">🎭</div>
					<h3 class="feature-title">Anonymous Auth</h3>
					<p class="feature-description">
						Prove ownership without revealing your wallet address
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🎯</div>
					<h3 class="feature-title">Selective Disclosure</h3>
					<p class="feature-description">
						Share only what's needed—balance range, NFT ownership
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🔗</div>
					<h3 class="feature-title">Unlinkable</h3>
					<p class="feature-description">
						Different anonymous ID per dApp—can't be tracked
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Code Example -->
	<section class="section">
		<div class="code-section">
			<h2 class="code-section-title">
				Anonymous, untrackable authentication with selective disclosure in three lines of code
			</h2>
			<div
				class="code-block-wrapper"
				style={`transform: ${codeCardTransform};`}
				on:mousemove={handleCodeMouseMove}
				on:mouseleave={handleCodeMouseLeave}
				role="presentation"
				aria-hidden="true"
			>
				<div class="code-card-header">
					<div class="code-card-dots">
						<span class="code-card-dot code-card-dot-red" aria-hidden="true"></span>
						<span class="code-card-dot code-card-dot-amber" aria-hidden="true"></span>
						<span class="code-card-dot code-card-dot-green" aria-hidden="true"></span>
					</div>
					<div class="code-card-title" aria-hidden="true">example.ts</div>
					<div class="code-card-spacer" aria-hidden="true"></div>
				</div>
				<div class="code-card-body">
					<div
						bind:this={codeBlockElement}
						class="shj-lang-ts code-block"
					>{`import { VeiledAuth } from '@veiled-auth/core';

const veiled = new VeiledAuth({ chain: 'solana', rpcProvider: 'helius' });
const { nullifier } = await veiled.signIn({ 
  requirements: { wallet: true }, 
  domain: 'myapp.com' 
});`}</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Veiled Behind-the-Scenes Flow -->
	<section class="section">
		<div class="veiled-flow-container">
			<div class="veiled-flow">
				<div class="veiled-flow-header">
					<h2>How Veiled Works Behind the Scenes</h2>
					<p>Visual trace of what Veiled does in the browser and on Solana.</p>
				</div>

				<div class="veiled-flow-grid">
					<!-- Left: Veiled widget UI mock -->
					<div class="veiled-widget">
						<div class="veiled-widget-header">
							<span class="veiled-badge">{veiledSteps[veiledActiveStep].badge}</span>
							<span class="veiled-step-label">{veiledSteps[veiledActiveStep].title}</span>
						</div>

						<div class="veiled-widget-window">
							<div class="veiled-widget-title-bar">
								<div class="veiled-dots">
									<span class="veiled-dot veiled-dot-red"></span>
									<span class="veiled-dot veiled-dot-yellow"></span>
									<span class="veiled-dot veiled-dot-green"></span>
								</div>
								<span class="veiled-widget-title">{veiledSteps[veiledActiveStep].uiHeader}</span>
							</div>

							<div class="veiled-widget-body">
								{#each veiledSteps[veiledActiveStep].uiBody as line}
									<p>{line}</p>
								{/each}
							</div>

							<div class="veiled-widget-footer">
								<button class="btn-secondary" type="button">
									Cancel
								</button>
								<button class="btn-primary" type="button">
									Continue with Veiled
								</button>
							</div>
						</div>

						<p class="veiled-widget-caption">
							{veiledSteps[veiledActiveStep].caption}
						</p>
					</div>

					<!-- Right: Animated code using Shiki Magic Move -->
					<div class="veiled-code">
						{#if veiledHighlighterPromise}
							{#await veiledHighlighterPromise}
								<div class="veiled-code-placeholder">
									Initializing syntax highlighter…
								</div>
							{:then highlighter}
								<div class="veiled-code-frame">
									<ShikiMagicMove
										lang="ts"
										theme="nord"
										{highlighter}
										code={veiledSteps[veiledActiveStep].code}
										options={{ duration: 900, stagger: 0.25, lineNumbers: true }}
									/>
								</div>
							{/await}
						{:else}
							<div class="veiled-code-placeholder">
								Available in the browser.
							</div>
						{/if}

						<div class="veiled-step-actions">
							<button
								type="button"
								class="btn-secondary veiled-step-btn"
								on:click={prevVeiledStep}
							>
								Previous
							</button>
							<button
								type="button"
								class="btn-primary veiled-step-btn"
								on:click={nextVeiledStep}
							>
								Next
							</button>
						</div>

						<div class="veiled-steps-nav" aria-label="Veiled flow steps">
							{#each veiledSteps as step, index}
								<button
									type="button"
									class:veiled-active={index === veiledActiveStep}
									on:click={() => setVeiledStep(index)}
									aria-label={`Go to step ${index + 1}: ${step.title}`}
								>
									{step.id + 1}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Veiled Demo Video -->
	<section class="section">
		<div class="veiled-video-container">
			<h2 class="section-title">Watch the Veiled Demo</h2>
			<p class="veiled-video-subtitle">
				Short demo showing the Veiled auth flow, how the widget behaves, and what the dApp
				experiences during sign-in.
			</p>
			<div class="veiled-video-frame">
				<iframe
					class="veiled-video-iframe"
					src="https://www.youtube.com/embed/0Xi2R70rcqQ"
					title="Veiled: OAuth-level privacy for Web3 (Demo)"
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowfullscreen
				></iframe>
			</div>
		</div>
	</section>

	<!-- ZK Proof Generation Visual -->
	<section class="section">
		<div class="proof-visual-container">
			<img
				src="/generating_zk_proof.png"
				alt="Generating zero-knowledge proof with Veiled"
				class="proof-visual-image"
			/>
		</div>
	</section>

	<!-- Performance -->
	<section class="section">
		<div class="performance-card">
			<h2 class="performance-title">Production-Ready Performance</h2>
			<div class="performance-grid">
				<div>
					<div class="performance-metric">100x</div>
					<div class="performance-label">Cost reduction</div>
				</div>
				<div>
					<div class="performance-metric">&lt;1s</div>
					<div class="performance-label">Verification time</div>
				</div>
				<div>
					<div class="performance-metric">&lt;$0.01</div>
					<div class="performance-label">Per authentication</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="cta-section">
		<h2 class="cta-title">Ready to protect your privacy?</h2>
		<p class="cta-subtitle">
			3-line integration. No backend required.
		</p>
		<a
			href="https://github.com/digitaldrreamer/veiled#quick-start"
			target="_blank"
			class="btn-primary"
		>
			Get Started
		</a>
	</section>

	<!-- Footer -->
	<footer>
		<div class="footer-content">
			<div class="footer-text">
				Built for Solana Privacy Hack 2026
			</div>
			<div class="footer-links">
				<a
					href="https://github.com/digitaldrreamer/veiled"
					target="_blank"
					class="footer-link"
				>
					GitHub
				</a>
				<a
					href="https://veiled.drreamer.digital"
					target="_blank"
					class="footer-link"
				>
					Demo
				</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.page {
		min-height: 100vh;
		background-color: oklch(0.145 0 0);
		color: oklch(0.985 0 0);
	}
</style>
