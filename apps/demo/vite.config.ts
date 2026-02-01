import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// * Force Vite to resolve workspace packages from source
		{
			name: 'resolve-workspace',
			configResolved(config) {
				console.log('🔵 [VITE] Config resolved - workspace packages should be resolved from source');
			}
		},
		// * Custom plugin to handle WASM files with correct MIME type
		{
			name: 'wasm-mime-type',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					// * Set correct MIME type for WASM files
					if (req.url?.endsWith('.wasm') || req.url?.includes('wasm_bg')) {
						res.setHeader('Content-Type', 'application/wasm');
					}
					next();
				});
			}
		}
	],
	server: {
		fs: {
			// * Allow serving files from node_modules for WASM files
			allow: ['..']
		}
	},
	resolve: {
		// * Ensure workspace packages resolve from source, not dist
		preserveSymlinks: true,
		alias: {
			// * Force Vite to use source files directly, bypassing dist
			'@veiled/core': path.resolve(__dirname, '../../packages/core/src/index.ts')
		}
	},
	optimizeDeps: {
		// * Exclude WASM packages from optimization - they need to be loaded as-is
		exclude: [
			'@noir-lang/noir_js',
			'@noir-lang/noirc_abi',
			'@noir-lang/acvm_js',
			'@aztec/bb.js',
			'@veiled/core' // * Don't optimize workspace package - use source directly
		],
		// * Force re-optimization to fix stale cache issues
		force: true
	},
	assetsInclude: ['**/*.wasm']
});
