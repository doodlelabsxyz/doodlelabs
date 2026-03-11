import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Public_Sans } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'})

export const metadata: Metadata = {
  title: 'AgencyOS',
  description: 'Content planning and workflow management for digital marketing agencies',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: 'hsl(38, 3%, 97%)',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", publicSans.variable)}>
      <body>
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  )
}
