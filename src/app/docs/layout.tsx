import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export const metadata: Metadata = {
  title: {
    default: "Docs",
    template: "%s | Practiq Docs",
  },
  description:
    "Documentation for Practiq — the AI workspace for boutique professional services firms managing 30-200 client relationships.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-bg-base">
        <div className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:gap-10">
              <DocsSidebar />
              <div className="flex-1 min-w-0">{children}</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
