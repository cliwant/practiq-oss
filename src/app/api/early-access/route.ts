import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // UTM extraction from referrer
    let utmSource: string | null = null;
    let utmMedium: string | null = null;
    let utmCampaign: string | null = null;
    if (referrer) {
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
        referrer,
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

    // Fire-and-forget confirmation email
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    if (resendKey) {
      const resend = new Resend(resendKey);
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "You're in — early access confirmed",
        text: [
          "Thanks for requesting early access to FractionalOS.",
          "",
          "Manage 50 clients with the memory of one.",
          "",
          "We're building a workspace that remembers every client relationship",
          "your team manages — so the expertise in your head doesn't get lost",
          "in the tab-switching.",
          "",
          "We'll be in touch as we get closer to launch.",
          "",
          "— The FractionalOS team",
        ].join("\n"),
      }).catch((err) => console.error("[early-access] Resend error:", err));
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
