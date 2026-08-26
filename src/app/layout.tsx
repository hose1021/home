import type {Metadata} from "next";
import {Inter, Archivo, IBM_Plex_Mono} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/components/theme-provider";
import {Toaster} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {PLATFORM_NAME} from "@/core/config";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${archivo.variable} ${plexMono.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
