import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Doto } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"
// * Import Veiled widget styles
import "@veiled/core/style.css"
// * Import Solana wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css"

const doto = Doto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-doto",
})

export const metadata: Metadata = {
  title: "Veiled Demo Chat",
  description: "Privacy-preserving authentication using zero-knowledge proofs.",
  generator: "Veiled",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${doto.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
  --font-doto: ${doto.style.fontFamily};
}
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
