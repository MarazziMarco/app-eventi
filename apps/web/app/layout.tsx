import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Eventi",
  description: "Gli eventi piu' hype vicino a te.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // riempie tutto lo schermo incl. area Dynamic Island / notch
  viewportFit: "cover",
  themeColor: "#0E0E13",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="it" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
