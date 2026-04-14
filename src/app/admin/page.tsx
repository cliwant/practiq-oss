import { redirect } from "next/navigation";

// /admin → /admin/crawler. Auth is handled in middleware.
export default function AdminIndex() {
  redirect("/admin/crawler");
}
