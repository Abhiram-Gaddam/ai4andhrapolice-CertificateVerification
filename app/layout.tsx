import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Certificate Generator & Verifier",
  description: "Generate and verify certificates with QR codes",
    generator: 'v0.dev',
    
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head><link rel="icon" href="/placeholder.png" /></head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
