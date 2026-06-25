import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vault Exchange",
  description: "Fractional ownership of vaulted PSA-graded cards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
