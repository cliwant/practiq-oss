import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

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

    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email,
        firm_vertical: firmVertical,
        firm_name: body.firm_name ?? null,
        firm_size: body.firm_size ?? null,
        client_count: body.client_count ?? null,
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

    // Fire-and-forget Slack notification
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      const verticalLabel: Record<string, string> = {
        accounting: "Accounting / Tax",
        law: "Law",
        hr: "HR Advisory",
        marketing: "Marketing / Agency",
        consulting: "Consulting",
        other: "Other",
      };
      fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🎉 *New early access signup*\n• Email: ${email}\n• Industry: ${verticalLabel[firmVertical] ?? firmVertical}\n• Country: ${ipCountry ?? "unknown"}\n• Source: ${utmSource ? `${utmSource} / ${utmMedium ?? "-"} / ${utmCampaign ?? "-"}` : "direct"}`,
        }),
      }).catch((err) => console.error("[early-access] Slack error:", err));
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[early-access] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
