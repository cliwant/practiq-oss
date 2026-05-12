import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { safeNotify } from "@/lib/notifications/slack";

/**
 * Early access signup API route.
 * Inserts into the Supabase waitlist table and sends a confirmation email.
 * Lives directly in the mockup so no CORS needed.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    const email = body.email?.trim();
    const firmVertical = body.firm_vertical || "other";
    const landingVariant = body.landing_variant || "mockup-demo";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const validVerticals = ["accounting", "law", "hr", "marketing", "consulting", "other"];
    if (!validVerticals.includes(firmVertical)) {
      return NextResponse.json(
        { error: "Invalid industry selection" },
        { status: 400 }
      );
    }

    // Supabase insert
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[early-access] Missing Supabase env vars");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Server-side attribution
    const referrer = request.headers.get("referer") ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;
    const ipCountry = request.headers.get("x-vercel-ip-country") ?? null;

    // UTM: prefer client-side values (from page URL), fall back to referrer header
    let utmSource = body.utm_source ?? null;
    let utmMedium = body.utm_medium ?? null;
    let utmCampaign = body.utm_campaign ?? null;
    const pageUrl = body.page_url ?? null;

    // Fallback: extract UTM from referrer if client didn't send them
    if (!utmSource && referrer) {
      try {
        const url = new URL(referrer);
        utmSource = url.searchParams.get("utm_source");
        utmMedium = url.searchParams.get("utm_medium");
        utmCampaign = url.searchParams.get("utm_campaign");
      } catch { /* ignore bad referrer */ }
    }

    // Topic landing pages (professional-services-ai-evidence-layer,
    // legal-ai-review-workflow, client-context-memory) send `name` and
    // `workflow_pain` as first-class fields. Founding-member form sends
    // bottleneck/notes/firm_name etc. inside `metadata`. We accept both
    // shapes and merge them — top-level `metadata` from the caller wins
    // on key collisions, but we also fold `workflow_pain` into the
    // metadata blob so it sits next to the other free-text fields.
    const incomingMetadata =
      typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as Record<string, unknown>)
        : {};
    const workflowPain =
      typeof body.workflow_pain === "string" && body.workflow_pain.trim().length > 0
        ? body.workflow_pain.trim().slice(0, 2000)
        : null;
    const contactName =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim().slice(0, 200)
        : null;
    const mergedMetadata: Record<string, unknown> = {
      ...incomingMetadata,
      ...(workflowPain ? { workflow_pain: workflowPain } : {}),
      ...(contactName ? { contact_name: contactName } : {}),
    };

    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email,
        firm_vertical: firmVertical,
        firm_name: body.firm_name ?? null,
        firm_size: body.firm_size ?? null,
        client_count: body.client_count ?? null,
        contact_name: contactName,
        metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : null,
        landing_variant: landingVariant,
        referrer: pageUrl ?? referrer,
        user_agent: userAgent,
        ip_country: ipCountry,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .select("id")
      .single();

    if (error) {
      // Duplicate email = still success (idempotent)
      if (error.code === "23505") {
        return NextResponse.json({ success: true, duplicate: true });
      }
      console.error("[early-access] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save signup" },
        { status: 500 }
      );
    }

    // Fire-and-forget confirmation email via AWS SES
    const awsKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
    const fromEmail = process.env.SES_FROM_EMAIL || "hello@practiq.dev";
    if (awsKey && awsSecret) {
      const ses = new SESClient({
        region: process.env.AWS_SES_REGION || "us-east-1",
        credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
      });
      ses.send(new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "You're in — early access confirmed" },
          Body: {
            Text: {
              Data: [
                "Thanks for requesting early access to Practiq.",
                "",
                "Manage 50 clients with the memory of one.",
                "",
                "We're building a workspace that remembers every client relationship",
                "your team manages — so the expertise in your head doesn't get lost",
                "in the tab-switching.",
                "",
                "We'll be in touch as we get closer to launch.",
                "",
                "— The Practiq team",
              ].join("\n"),
            },
          },
        },
      })).catch((err) => console.error("[early-access] SES error:", err));
    }

    // RUN 24 audit fix #1: switched from a raw `fetch(SLACK_WEBHOOK_URL,
    // …)` shim to the unified `safeNotify("early_access", …)` so the
    // shared Block Kit formatter actually fires (the previous raw
    // POST built a one-line plain text and bypassed the formatter
    // entirely — the structured fields the team relies on for triage
    // were silently dropped).
    safeNotify("early_access", {
      email,
      vertical: firmVertical,
      source: utmSource
        ? `${utmSource} / ${utmMedium ?? "-"} / ${utmCampaign ?? "-"}`
        : "direct",
      country: ipCountry ?? "unknown",
    });

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[early-access] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
