/**
 * Retargeting pixel scaffolding — Meta / LinkedIn / X.
 *
 * Purpose: Start building warm audiences from organic traffic NOW so that
 * when paid retargeting spend starts (post cycle-1), the audiences already
 * contain every blog/docs/landing visitor. Cost today: $0 (pixel scripts
 * are free; no ad account spend is incurred just by firing pixel loads).
 *
 * Each pixel is env-gated: if the ID is unset, the component renders
 * nothing and adds zero runtime cost. Set IDs when Meta Business Manager /
 * LinkedIn Campaign Manager / X Ads accounts are created.
 *
 * Env vars (studio-root .env.local):
 *   NEXT_PUBLIC_META_PIXEL_ID
 *   NEXT_PUBLIC_LINKEDIN_PARTNER_ID
 *   NEXT_PUBLIC_X_PIXEL_ID
 *
 * NOTE: all three vars MUST use the NEXT_PUBLIC_ prefix — these values
 * ship to the browser, which is expected for ad pixels.
 */
import Script from "next/script";

export function AnalyticsPixels() {
  const metaId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const linkedInId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID?.trim();
  const xId = process.env.NEXT_PUBLIC_X_PIXEL_ID?.trim();

  return (
    <>
      {metaId ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaId}');
              fbq('track', 'PageView');`}
          </Script>
          {/* noscript fallback — no-op if NextJS Script loaded */}
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}

      {linkedInId ? (
        <>
          <Script id="linkedin-insight" strategy="afterInteractive">
            {`_linkedin_partner_id = "${linkedInId}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l) {
              if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
              window.lintrk.q=[]}
              var s = document.getElementsByTagName("script")[0];
              var b = document.createElement("script");
              b.type = "text/javascript";b.async = true;
              b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b, s);})(window.lintrk);`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://px.ads.linkedin.com/collect/?pid=${linkedInId}&fmt=gif`}
            />
          </noscript>
        </>
      ) : null}

      {xId ? (
        <Script id="x-pixel" strategy="afterInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
            a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
            twq('config','${xId}');`}
        </Script>
      ) : null}
    </>
  );
}
