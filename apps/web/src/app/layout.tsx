import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EdTech SaaS",
  description: "Vietnam-focused education center operations SaaS",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
