import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="no" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground selection:bg-primary/10 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
