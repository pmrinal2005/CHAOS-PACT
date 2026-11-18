import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control | CHAOS-PACT",
  description:
    "CHAOS-PACT: an adversarial revenue guard. A Red-Team saboteur breaks the build, Kane CLI referees it in a real browser, and a Blue-Team healer repairs it under an anti-cheat audit.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#101112" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
