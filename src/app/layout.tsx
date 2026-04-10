import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Firmem — Manage 50 clients with the memory of one.",
  description:
    "For small accounting, law, HR, marketing, and consulting firms. A workspace that remembers every client relationship your team manages.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
