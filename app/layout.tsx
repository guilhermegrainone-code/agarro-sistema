import type { Metadata } from "next";
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
