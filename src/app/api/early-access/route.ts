import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { safeNotify } from "@/lib/notifications/slack";
import { reportUserError } from "@/lib/notifications/user-error";
import { trackEvent } from "@/lib/analytics/track";

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
      await reportUserError({
        surface: "early-access",
        endpoint: "POST /api/early-access",
        status: 500,
        errorMessage: `Supabase waitlist insert: ${error.message}`,
        userContext: {
          email,
          ip_country: ipCountry,
          user_agent: userAgent,
        },
        requestBody: {
          firm_vertical: firmVertical,
          landing_variant: landingVariant,
        },
        stepIfApplicable: "Supabase insert (waitlist)",
      });
      return NextResponse.json(
        { error: "Failed to save signup" },
        { status: 500 }
      );
    }

    // Server-side waitlist_signed_up event — fired here, NOT from the
    // client, so ad-blockers can't drop it and the event is guaranteed
    // to match the waitlist row we just inserted. Carries every
    // ops-contract field (lane / cta / fmt / v / topic / src / post /
    // campaign) so analytics_events can be joined with the Postiz post
    // ledger.
    const metaLane =
      typeof incomingMetadata.lane === "string" ? incomingMetadata.lane : "practiq";
    const metaCta =
      typeof incomingMetadata.cta === "string" ? incomingMetadata.cta : null;
    const metaFmt =
      typeof incomingMetadata.fmt === "string" ? incomingMetadata.fmt : null;
    const metaV =
      typeof incomingMetadata.v === "string" ? incomingMetadata.v : null;
    const metaTopic =
      typeof incomingMetadata.topic === "string"
        ? incomingMetadata.topic
        : landingVariant;
    const metaSourcePlatform =
      typeof incomingMetadata.source_platform === "string"
        ? incomingMetadata.source_platform
        : null;
    const metaSourcePostId =
      typeof incomingMetadata.source_post_id === "string"
        ? incomingMetadata.source_post_id
        : null;
    const metaCampaign =
      typeof incomingMetadata.campaign === "string"
        ? incomingMetadata.campaign
        : null;
    const metaFirmType =
      typeof incomingMetadata.firm_type === "string"
        ? incomingMetadata.firm_type
        : null;

    void trackEvent({
      type: "waitlist_signed_up",
      userId: null,
      properties: {
        landing_slug: landingVariant,
        landing_variant: landingVariant,
        firm_type: metaFirmType,
        firm_vertical: firmVertical,
        had_workflow_pain: !!workflowPain,
        lane: metaLane,
        cta: metaCta,
        source_platform: metaSourcePlatform,
        source_post_id: metaSourcePostId,
        campaign: metaCampaign,
        topic: metaTopic,
        fmt: metaFmt,
        v: metaV,
      },
      url: pageUrl,
      referrer,
      userAgent,
      utmSource,
      utmMedium,
      utmCampaign,
      geoCountry: ipCountry,
    });

    // Confirmation email via Resend (sendEmail handles dev-log fallback
    // when RESEND_API_KEY is missing). We await — fire-and-forget gets
    // dropped by Vercel serverless freezing on response close. The send
    // is fast (~300ms) so blocking the response is acceptable; in return
    // we get tracking + reportUserError on failure.
    const confirmText = [
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
    ].join("\n");
    const confirmHtml = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.6;font-size:14px;">
      <p>Thanks for requesting early access to Practiq.</p>
      <p><strong>Manage 50 clients with the memory of one.</strong></p>
      <p>We're building a workspace that remembers every client relationship your team manages — so the expertise in your head doesn't get lost in the tab-switching.</p>
      <p>We'll be in touch as we get closer to launch.</p>
      <p>— The Practiq team</p>
    </body></html>`;
    const sendResult = await sendEmail({
      to: email,
      subject: "You're in — early access confirmed",
      html: confirmHtml,
      text: confirmText,
      tag: "early-access-confirm",
    });
    if (!sendResult.ok && sendResult.provider === "resend") {
      console.error(`[early-access] Resend send failed: ${sendResult.error}`);
      await reportUserError({
        surface: "early-access",
        endpoint: "POST /api/early-access",
        status: 500,
        errorMessage: `Resend send (early-access-confirm): ${sendResult.error ?? "unknown"}`,
        userContext: { email, ip_country: ipCountry, user_agent: userAgent },
        stepIfApplicable: "Resend sendEmail (early-access-confirm)",
      });
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
    await reportUserError({
      surface: "early-access",
      endpoint: "POST /api/early-access",
      status: 500,
      errorMessage:
        err instanceof Error ? err.message : "Unexpected exception",
      errorStack: err instanceof Error ? err.stack : undefined,
      userContext: {
        ip_country: request.headers.get("x-vercel-ip-country") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      },
      stepIfApplicable: "early-access route exception",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
