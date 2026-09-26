import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Parkir Binus - Smart Campus Parking",
  description:
    "Reserve your parking slot at BINUS Anggrek. Live availability, QR check-in/out, wallet & refunds - dark premium redesign.",
  keywords: ["BINUS", "parking", "Parkir Binus", "campus", "reservation"],
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
    shortcut: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Parkir Binus",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        {/* Frost fix - Turbopack's Lightning CSS pass strips the standard
            `backdrop-filter` declaration from every stylesheet rule (keeping
            only the -webkit- form, which Chromium discards), so all .glass
            surfaces rendered flat. An inline <style> bypasses the CSS
            pipeline entirely and guarantees the frost in every browser. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `.glass{--glass-fx:blur(20px) saturate(1.4);backdrop-filter:var(--glass-fx);-webkit-backdrop-filter:var(--glass-fx)}`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ServiceWorkerRegistration />
          {children}
          <Toaster />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
