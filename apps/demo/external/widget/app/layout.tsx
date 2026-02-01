import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Silver Electric Border",
  description: "Dramatic silver electric border effect in Next.js",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <svg style={{ display: 'none' }}>
          <defs>
            <filter id="turbulent-displace-modal">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="2" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  )
}
