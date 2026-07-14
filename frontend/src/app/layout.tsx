import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NyFirmasjekk | Leads og virksomhetsanalyse",
  description: "Finn, vurder og følg opp norske virksomheter med åpne registerdata og forklarbare signaler.",
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
