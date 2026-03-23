import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FinanceProvider } from "@/contexts/finance-context";
import { UIProvider } from "@/contexts/ui-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FinanceKJ",
  description: "Control de finanzas personales",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <FinanceProvider>
          <UIProvider>
            <main className="mx-auto min-h-screen max-w-lg pb-28">
              {children}
            </main>
            <BottomNav />
            <Toaster position="top-center" richColors />
          </UIProvider>
        </FinanceProvider>
      </body>
    </html>
  );
}
