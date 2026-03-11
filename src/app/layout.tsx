import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { FinanceProvider } from "@/contexts/finance-context";
import { UIProvider } from "@/contexts/ui-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <FinanceProvider>
          <UIProvider>
            <main className="mx-auto min-h-screen max-w-lg pb-20">
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
