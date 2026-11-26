import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Self-hosted at build time by next/font: no runtime font requests, no 404s, no layout shift.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mission Control | CHAOS-PACT",
  description:
    "CHAOS-PACT: an adversarial revenue guard. A Red-Team saboteur breaks the build, Kane CLI referees it in a real browser, and a Blue-Team healer repairs it under an anti-cheat audit.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = {
  themeColor: "#07070d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
