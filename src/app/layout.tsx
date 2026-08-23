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

  title: "AYZO Hub | AI + Web3 on Solana",

  description:
    "AYZO Hub brings AI research, wallet intelligence and Web3 tools together in one simple product experience on Solana.",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "AYZO Hub | AI + Web3 on Solana",
    description:
      "AI research, wallet intelligence and Web3 tools in one AYZO experience.",
    url: "/",
    siteName: "AYZO",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "AYZO Hub | AI + Web3 on Solana",
    description:
      "AI research, wallet intelligence and Web3 tools in one AYZO experience.",
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
        <GoogleAnalytics />
      </body>
    </html>
  );
}
