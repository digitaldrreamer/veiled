<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// * Landing page for Veiled - Privacy-preserving authentication for Solana

	let codeBlockElement: HTMLElement | null = null;

	// * 3D tilt state for the code card
	let codeCardTransform = 'rotateX(0deg) rotateY(0deg) translateZ(0)';

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
							<span class="card-list-icon" style="color: oklch(0.696 0.17 162.48);">✅</span>
							<span>Wallet ownership (proven)</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.696 0.17 162.48);">✅</span>
							<span>Balance requirements (proven)</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.696 0.17 162.48);">✅</span>
							<span>NFT ownership (proven)</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.696 0.17 162.48);">✅</span>
							<span>Zero wallet exposure</span>
						</li>
						<li class="card-list-item">
							<span class="card-list-icon" style="color: oklch(0.696 0.17 162.48);">✅</span>
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
