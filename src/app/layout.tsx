import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CritTable",
  description: "Event operations for local game stores and nerdy hobby communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

