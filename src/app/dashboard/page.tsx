// Dashboard is a fully client-side interactive workspace. Mark it dynamic
// so Next.js does not attempt to statically prerender it — the layout reads
// from useSearchParams() which requires a runtime render.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // Content is rendered by layout.tsx's DashboardContent router
  return null;
}
