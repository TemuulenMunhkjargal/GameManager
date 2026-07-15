import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameHall",
  description: "A simple personal workspace for planning game nights.",
  applicationName: "GameHall",
};

const themeScript = `(function(){try{var t=localStorage.getItem('gamehall-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'default';}catch(e){document.documentElement.dataset.theme='default';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-theme="default" lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}

