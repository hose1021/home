import type {Metadata, Viewport} from "next";
import {Inter, IBM_Plex_Mono, Manrope} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/components/theme-provider";
import {Toaster} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {PLATFORM_NAME} from "@/core/config";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

/* Geometric grotesque in the spirit of the storefront's Object Sans */
const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-brand",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} — MMMC`,
  description: "Multi-tenant platform for managing homeowners associations",
};

export const viewport: Viewport = {
  themeColor: [
    {media: "(prefers-color-scheme: dark)", color: "#15171E"},
    {media: "(prefers-color-scheme: light)", color: "#F2F4F8"},
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${manrope.variable} ${plexMono.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
