/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // * Enable standalone output for Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // * Headers to allow circuit files, WASM loading, and wallet connections
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // * Allow RPC connections (HTTP, HTTPS, WebSocket)
              "connect-src 'self' data: blob: https: wss: http://127.0.0.1:* ws://127.0.0.1:*",
              // * Allow wallet extension scripts and WASM
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              // * Allow wallet popups and iframes
              "frame-src 'self' https:",
              // * Allow wallet child sources
              "child-src 'self' blob: https:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
