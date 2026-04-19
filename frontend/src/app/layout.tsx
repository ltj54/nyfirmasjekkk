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
  title: "nyfirmasjekk — virksomhetssøk",
  description: "Søk i norske virksomheter med åpne BRREG-data, filtre og forklarbar score.",
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
      <body className="min-h-full bg-background text-foreground selection:bg-primary/10 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
