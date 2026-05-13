/**
 * /app/clients (index) — no such page exists in the workspace; the live
 * surfaces are /app/clients/[id] and /app/clients/new. The R3 dogfood
 * report (2026-05-13) flagged that authenticated users who typed or
 * pasted /app/clients verbatim landed on the public marketing 404, with
 * "Back to Homepage / Pricing" suggestions instead of "Back to your
 * workspace". This redirect closes that hole server-side so we never
 * paint a marketing surface to an authenticated /app/* visitor.
 *
 * Why /app and not a real index page: the workspace shell already lists
 * every client in its left rail. A dedicated "all clients" index would
 * duplicate that and confuse the navigation model.
 */
import { redirect } from "next/navigation";

export default function ClientsIndexRedirect() {
  redirect("/app");
}
