const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const { google } = await import("googleapis");
const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key, scopes: ["https://www.googleapis.com/auth/webmasters.readonly"] });
await jwt.authorize();
const sc = google.searchconsole({ version: 'v1', auth: jwt });

// Wider window — 90 days — to overcome per-query anonymization
const end = new Date().toISOString().slice(0,10);
const start = new Date(Date.now() - 90*86400_000).toISOString().slice(0,10);

const queries = [
  'gusto and bamboohr consultant',
  'clio vs practicepanther vs mycase trust accounting',
  'clio vs practicepanther vs mycase for immigration',
  'clio manage vs mycase vs practicepanther',
  'peo vs hr consultant vs software for small business',
  'clio vs practicepanther vs mycase client intake',
  'as a accountant best quickbooks alternative',
  'fractional hr services with bamboohr or gusto',
];

console.log(`Window: ${start} ~ ${end}\n`);
for (const q of queries) {
  const r = await sc.searchanalytics.query({
    siteUrl: 'https://practiq.dev/',
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: ['page', 'query'],
      rowLimit: 10,
      dataState: 'all',
      dimensionFilterGroups: [{
        filters: [{ dimension: 'query', operator: 'equals', expression: q }],
      }],
    },
  });
  const rows = r.data.rows || [];
  console.log(`=== "${q}" ===`);
  if (!rows.length) {
    console.log('  (no page-dimension data — query may be anonymized)\n');
    continue;
  }
  rows.sort((a, b) => b.impressions - a.impressions);
  for (const row of rows) {
    const [page] = row.keys || [];
    console.log(`  ${page}`);
    console.log(`    impr=${row.impressions}  clicks=${row.clicks}  ctr=${(row.ctr*100).toFixed(2)}%  pos=${row.position.toFixed(1)}`);
  }
  console.log('');
}
