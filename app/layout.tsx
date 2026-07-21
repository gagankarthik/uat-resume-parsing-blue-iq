import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { NavBar } from "@/components/NavBar";

// Match the Blue-IQ Parser product UI: editorial grotesque display, humanist
// sans for UI, technical mono for keys/code.
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Blue-IQ Parser - UAT Console",
  description: "Exercise every Resume Parser API endpoint with live requests, status codes, and latency.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="paper-grain flex min-h-full flex-col">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 text-center text-xs text-ink-soft sm:px-6">
          Blue-IQ Parser - internal UAT console
        </footer>
      </body>
    </html>
  );
}
