import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FractionalOS — The AI Workspace for Boutique Firms",
  description:
    "Manage 20 clients with the memory of one. The OS for boutique professional services.",
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
