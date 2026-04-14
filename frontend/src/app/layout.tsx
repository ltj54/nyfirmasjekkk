import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "nyfirmasjekk — B2B-vurdering av nye selskaper",
  description: "Presis risikovisning for nye aksjeselskaper basert på åpne data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#fafafa] text-[#171717] selection:bg-[#064e3b]/10 selection:text-[#064e3b]">
        {children}
      </body>
    </html>
  );
}
