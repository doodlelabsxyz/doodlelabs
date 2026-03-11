import type { Metadata, Viewport } from 'next'
import './globals.css'
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider"

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
    <html lang="en" className={cn("font-sans")} suppressHydrationWarning>
      <body>
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
