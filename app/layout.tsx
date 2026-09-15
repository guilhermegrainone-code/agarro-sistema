import type { Metadata, Viewport } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

const body = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AGARRÔ · Sistema",
  description: "Controle de vendas e estoque da AGARRÔ.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Faz o site abrir em tela cheia (sem barra do navegador) quando adicionado
  // à tela de início do iPhone.
  appleWebApp: {
    capable: true,
    title: "AGARRÔ",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#EFE3D8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} font-body bg-paper text-ink`}>
        {children}
      </body>
    </html>
  );
}
