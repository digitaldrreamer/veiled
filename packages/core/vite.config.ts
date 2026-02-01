// * Vite configuration for bundling the Veiled SDK
// * Bundles React internally so consumers don't need to install it

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Veiled',
      formats: ['es'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      // * Externalize peer dependencies - these should NOT be bundled
      external: [
        '@noir-lang/noir_js',
        '@noir-lang/noirc_abi',
        '@noir-lang/acvm_js',
        '@coral-xyz/anchor',
        '@solana/wallet-adapter-base',
        '@solana/web3.js',
        'bn.js',
        '@aztec/bb.js'
      ],
      output: {
        // * Provide globals for UMD build (if needed in future)
        globals: {}
      }
    },
    // * Bundle React and React DOM internally
    // * This ensures consumers don't need to install React
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
