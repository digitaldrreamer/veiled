import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
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
	optimizeDeps: {
		// * Exclude WASM packages from optimization - they need to be loaded as-is
		exclude: [
			'@noir-lang/noir_js',
			'@noir-lang/backend_barretenberg',
			'@noir-lang/noirc_abi',
			'@noir-lang/acvm_js'
		]
	},
	assetsInclude: ['**/*.wasm']
});
