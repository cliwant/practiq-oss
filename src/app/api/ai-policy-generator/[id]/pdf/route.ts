/**
 * GET /api/ai-policy-generator/[id]/pdf
 *
 * Lazy PDF generator for the AI policy generator. The POST /generate
 * route only persists the policy JSON to keep itself under the Vercel
 * Hobby 60s timeout; rendering the PDF is offloaded here so it runs
 * only when someone actually wants the file.
 *
 * Flow:
 *   1. Load the policy row from practiq.policy_generations by id.
 *   2. If pdf_url already set in Storage → 302 redirect to the cached
 *      public URL (~50ms response).
 *   3. Otherwise render the PDF with @react-pdf/renderer, upload to
 *      Supabase Storage, persist pdf_url back to the row (fire and
 *      forget so we can stream the bytes immediately), fire the Resend
 *      "your policy is ready" email exactly once, and stream the PDF
 *      as application/pdf. First-call latency ~8-15s (cold) or
 *      ~5-10s warm.
 *
 * Anti-abuse: 30 requests / 10 min / IP. Higher than POST because
 * legitimate visitors may click Download a few times, but tight enough
 * to deter scripted enumeration of UUIDs.
 *
 * Public endpoint — no auth, no session check. The row id is a
 * server-issued UUID; anyone with the link can fetch the PDF (this
 * matches how the Resend email link is shared).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";
import { reportUserError } from "@/lib/notifications/user-error";
import { VERTICAL_LABELS } from "@/lib/policy-generator/frameworks";
import type { GeneratedPolicy } from "@/lib/policy-generator/types";

export const runtime = "nodejs";
// LLM is out of the picture here, but @react-pdf cold-start fonts +
// Storage upload can take 10-15s. 60s is plenty.
export const maxDuration = 60;

interface PolicyRow {
  id: string;
  email: string;
  name: string | null;
  firm_name: string | null;
  firm_vertical: keyof typeof VERTICAL_LABELS;
  policy: GeneratedPolicy;
  pdf_url: string | null;
  email_sent_at: string | null;
}

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function uploadPdf(
  supabase: ReturnType<typeof supabaseClient>,
  pdfBuffer: Buffer,
  rowId: string,
): Promise<string | null> {
  if (!supabase) return null;
  const key = `${rowId}.pdf`;
  const { error } = await supabase.storage
    .from("policy-pdfs")
    .upload(key, pdfBuffer, {
      contentType: "application/pdf",
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) {
    console.error("[ai-policy-generator/pdf] upload error:", error);
    return null;
  }
  const { data } = supabase.storage.from("policy-pdfs").getPublicUrl(key);
  return data.publicUrl;
}

async function sendPolicyEmail(
  to: string,
  name: string | null,
  firmName: string | null,
  policyTitle: string,
  pdfUrl: string,
): Promise<void> {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const firmLine = firmName ? ` for ${firmName}` : "";

  const text = [
    greeting,
    "",
    `Your draft AI usage policy${firmLine} is ready.`,
    "",
    `Title: ${policyTitle}`,
    "",
    `Download the PDF: ${pdfUrl}`,
    "",
    "Important: this document is a starting draft, not legal advice.",
    "Please review it with qualified counsel licensed in your firm's",
    "jurisdiction before adopting it.",
    "",
    "If you'd like the same review-state tracking, source provenance,",
    "and approval workflow this policy describes built into every",
    "AI-assisted task at your firm — see how Practiq fits:",
    "https://practiq.dev/professional-services-ai-evidence-layer",
    "",
    "— The Practiq team",
  ].join("\n");

  // Plain HTML mirror so Resend can track opens via its tracking pixel.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;font-size:14px;">
    <p>${esc(greeting)}</p>
    <p>Your draft AI usage policy${esc(firmLine)} is ready.</p>
    <p><strong>Title:</strong> ${esc(policyTitle)}</p>
    <p><a href="${esc(pdfUrl)}" style="color:#2563eb;">Download the PDF</a></p>
    <p style="color:#6b7280;font-size:13px;">Important: this document is a starting draft, not legal advice. Please review it with qualified counsel licensed in your firm's jurisdiction before adopting it.</p>
    <p>If you'd like the same review-state tracking, source provenance, and approval workflow this policy describes built into every AI-assisted task at your firm — see how Practiq fits: <a href="https://practiq.dev/professional-services-ai-evidence-layer" style="color:#2563eb;">practiq.dev/professional-services-ai-evidence-layer</a></p>
    <p>— The Practiq team</p>
  </body></html>`;

  const result = await sendEmail({
    to,
    subject: `Your draft AI usage policy${firmLine}`,
    html,
    text,
    tag: "ai-policy-completion",
  });
  if (!result.ok && result.provider === "resend") {
    console.error(`[ai-policy-generator/pdf] Resend send failed: ${result.error}`);
    await reportUserError({
      surface: "policy-generator",
      endpoint: `GET /api/ai-policy-generator/[id]/pdf`,
      status: 500,
      errorMessage: `Resend send (ai-policy-completion): ${result.error ?? "unknown"}`,
      userContext: { email: to },
      stepIfApplicable: "Resend sendEmail (ai-policy-completion)",
    });
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const rl = await checkRateLimit({
    namespace: "ai-policy-generator/pdf",
    identity: identityFromRequest(request),
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const supabase = supabaseClient();
  if (!supabase) {
    console.error("[ai-policy-generator/pdf] Missing Supabase env vars.");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }

  // 1. Load the row.
  const { data, error } = await supabase
    .schema("practiq")
    .from("policy_generations")
    .select(
      "id, email, name, firm_name, firm_vertical, policy, pdf_url, email_sent_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[ai-policy-generator/pdf] fetch error:", error);
    return NextResponse.json(
      { error: "Could not load policy." },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const row = data as PolicyRow;

  // 2. Fast path: cached PDF in Storage → 302 redirect.
  if (row.pdf_url) {
    return NextResponse.redirect(row.pdf_url, 302);
  }

  // 3. Render PDF. Dynamic-import keeps @react-pdf/renderer + fonts off
  //    the build's webpack graph (the same reason the original POST
  //    route lazy-loaded them).
  let pdfBuffer: Buffer;
  try {
    const generatedOn = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const [{ renderToBuffer }, { PolicyPdfDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/policy-generator/pdf-document"),
    ]);
    pdfBuffer = await renderToBuffer(
      PolicyPdfDocument({
        policy: row.policy,
        firmName: row.firm_name ?? "",
        vertical: VERTICAL_LABELS[row.firm_vertical] ?? row.firm_vertical,
        generatedOn,
      }),
    );
  } catch (err) {
    console.error("[ai-policy-generator/pdf] render failed:", err);
    await reportUserError({
      surface: "policy-generator",
      endpoint: `GET /api/ai-policy-generator/${id}/pdf`,
      status: 500,
      errorMessage:
        err instanceof Error ? err.message : "PDF render failed",
      errorStack: err instanceof Error ? err.stack : undefined,
      userContext: {
        email: row.email,
        ip_country: request.headers.get("x-vercel-ip-country") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      },
      stepIfApplicable: "@react-pdf renderToBuffer",
    });
    return NextResponse.json(
      { error: "Could not render PDF. Please try again in a moment." },
      { status: 500 },
    );
  }

  // 4. Upload to Storage. If this fails, still stream the rendered
  //    bytes so the visitor gets their PDF — the next call will retry.
  const pdfUrl = await uploadPdf(supabase, pdfBuffer, row.id);

  // 5. Persist pdf_url + email_sent_at, then send the Resend email
  //    exactly once. Fire-and-forget so the visitor's download starts
  //    immediately — but we must await on serverless (per memory note:
  //    bare `void` at end of handler gets dropped). We chain both into
  //    a single awaited promise and intentionally swallow errors so a
  //    Storage / Resend hiccup never breaks the download.
  const sideEffects = (async () => {
    if (!pdfUrl) return;
    try {
      await supabase
        .schema("practiq")
        .from("policy_generations")
        .update({ pdf_url: pdfUrl })
        .eq("id", row.id);
    } catch (err) {
      console.error("[ai-policy-generator/pdf] pdf_url update error:", err);
    }
    if (!row.email_sent_at) {
      await sendPolicyEmail(
        row.email,
        row.name,
        row.firm_name,
        row.policy.policy_title,
        pdfUrl,
      );
      try {
        await supabase
          .schema("practiq")
          .from("policy_generations")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", row.id);
      } catch (err) {
        console.error(
          "[ai-policy-generator/pdf] email_sent_at update error:",
          err,
        );
      }
    }
  })();

  await sideEffects;

  const filename = (row.firm_name || "ai-usage-policy")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  // Convert Node Buffer to Uint8Array — NextResponse only types the
  // latter (BodyInit). Buffer is structurally compatible at runtime
  // but TS rightly flags it under the SharedArrayBuffer/Buffer split.
  const body = new Uint8Array(pdfBuffer);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename || "policy"}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
