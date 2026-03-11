import type { Metadata } from "next";
import { platformName } from "@comtouz/domain";
import "./globals.css";

export const metadata: Metadata = {
  title: `${platformName} | Trust Network`,
  description: "Verified identity, proof-of-encounter, and graph-native reputation for fair reviews."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}