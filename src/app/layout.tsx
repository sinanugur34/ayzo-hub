import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import GoogleAnalytics from "../components/GoogleAnalytics";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.ayzo.io"),

  title: "AYZO | On-chain Intelligence",

  description:
    "AYZO turns on-chain data into evidence-first intelligence across Solana and Ethereum.",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "AYZO | On-chain Intelligence",
    description:
      "Evidence-first token and wallet intelligence across Solana and Ethereum.",
    url: "/",
    siteName: "AYZO",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "AYZO | On-chain Intelligence",
    description:
      "Evidence-first token and wallet intelligence across Solana and Ethereum.",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}

        <footer className="mt-auto border-t border-zinc-900 px-6 py-6">
          <nav
            aria-label="Legal"
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500"
          >
            <a className="transition hover:text-zinc-300" href="/terms">
              Terms and Conditions
            </a>
            <a className="transition hover:text-zinc-300" href="/privacy">
              Privacy Policy
            </a>
            <a className="transition hover:text-zinc-300" href="/refund-policy">
              Refund Policy
            </a>
          </nav>
        </footer>

        <GoogleAnalytics />
      </body>
    </html>
  );
}
