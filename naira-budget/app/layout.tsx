import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orjar",
  description: "Nigerian-first budgeting and wealth planning app.",
  metadataBase: new URL("https://orjar.app"),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/Orjar-logo.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body
        className={`${GeistSans.className} relative z-[1] min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton theme="dark" />
      </body>
    </html>
  );
}
