const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const { google } = await import("googleapis");
const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key, scopes: ["https://www.googleapis.com/auth/webmasters.readonly"] });
await jwt.authorize();
const sc = google.searchconsole({ version: 'v1', auth: jwt });
const end = new Date().toISOString().slice(0,10);
const start = new Date(Date.now() - 28*86400_000).toISOString().slice(0,10);
const r = await sc.searchanalytics.query({
  siteUrl: 'https://practiq.dev/',
  requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 500, dataState: 'all' },
});
const rows = r.data.rows || [];
console.log(`Top 30 queries (${start} ~ ${end}):`);
console.log(`${'query'.padEnd(48)} ${'impr'.padStart(7)} ${'clicks'.padStart(7)} ${'CTR'.padStart(7)} ${'pos'.padStart(6)}`);
console.log('-'.repeat(80));
rows.sort((a,b) => b.impressions - a.impressions);
for (const row of rows.slice(0, 30)) {
  const q = (row.keys?.[0] ?? '').slice(0, 46).padEnd(48);
  console.log(`${q} ${String(row.impressions).padStart(7)} ${String(row.clicks).padStart(7)} ${(row.ctr*100).toFixed(2).padStart(6)}% ${row.position.toFixed(1).padStart(6)}`);
}
