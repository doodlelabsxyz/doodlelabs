import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL

export const metadata: Metadata = {
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  title: 'AgencyOS',
  description: 'Content planning and workflow management for digital marketing agencies',
  manifest: '/manifest.json',
  // Set NEXT_PUBLIC_NOINDEX=true on demo and staging deployments to keep them out of search results.
  ...(process.env.NEXT_PUBLIC_NOINDEX === 'true' ? { robots: { index: false, follow: false } } : {}),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#070D09' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", plusJakarta.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        <div id="app-root">
          {children}
        </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
