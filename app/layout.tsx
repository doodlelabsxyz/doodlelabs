import type { Metadata } from "next";
import {
  Caveat,
  Cormorant_Infant,
  DM_Mono,
  Nanum_Pen_Script,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { ImageKitProvider } from "@/components/providers/imagekit-provider";

const fontDisplay = Cormorant_Infant({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontBody = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fontLabel = DM_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontLogo = Nanum_Pen_Script({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const fontDoodle = Caveat({
  variable: "--font-doodle",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Doodle Labs — Design as a Service · Pune",
  description:
    "Design as a Service for local businesses in Pune. Graphic posts, reels and web UI — first deliverable in 48 hours.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        fontDisplay.variable,
        fontBody.variable,
        fontLabel.variable,
        fontLogo.variable,
        fontDoodle.variable
      )}
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} storageKey="dl-theme">
          <ImageKitProvider>
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
          </ImageKitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
