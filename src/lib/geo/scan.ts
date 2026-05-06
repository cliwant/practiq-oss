/**
 * GEO citation scanner — submits probe queries to one or more AI search
 * engines and records whether practiq.dev was cited.
 *
 * Available engines (each engine is enabled iff its API key env var is
 * present; missing keys produce a clean skip, never an error):
 *
 *   - perplexity     → PERPLEXITY_API_KEY  (paid, ~$0.005/query)
 *   - brave_ai       → BRAVE_SEARCH_API_KEY (free tier + AI summary)
 *   - openrouter     → OPENROUTER_API_KEY  (we already use this for the
 *                      cycle's auto-provider; uses the gpt-4o online
 *                      search-preview model)
 *   - google_aio     → SKIPPED (no public API)
 *
 * Each successful scan inserts a row into public.geo_citations.
 * Per-run cost is capped at $0.50 (configurable) — once the cap is
 * reached the remaining queries are skipped with a `cost_cap` note.
 *
 * Auth-token-by-name only — never log token VALUES, only names.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  GEO_PROBE_QUERIES,
  detectCompetitors,
  detectPractiqCitation,
} from "./probe-queries";

export type GeoEngine = "perplexity" | "brave_ai" | "openrouter";

interface ScanResult {
  source: GeoEngine;
  query: string;
  cited_practiq: boolean;
  cited_url: string | null;
  competitors_cited: string[];
  cost_usd: number;
  response_text: string;
  raw_response: unknown;
  notes?: string;
}

interface RunSummary {
  engines_attempted: GeoEngine[];
  engines_skipped: { name: string; reason: string }[];
  queries_run: number;
  queries_total: number;
  citations_found: number;
  cost_usd_total: number;
  results: ScanResult[];
  cost_cap_hit: boolean;
}

const COST_CAP_USD_DEFAULT = 0.5;

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Engine: Perplexity ──────────────────────────────────────────────
async function scanPerplexity(query: string): Promise<ScanResult | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: query }],
        return_citations: true,
      }),
    });
    if (!res.ok) {
      return {
        source: "perplexity",
        query,
        cited_practiq: false,
        cited_url: null,
        competitors_cited: [],
        cost_usd: 0,
        response_text: "",
        raw_response: { error: `${res.status} ${res.statusText}` },
        notes: `perplexity_http_${res.status}`,
      };
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      citations?: string[];
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const sourcesText = (json.citations ?? []).join(" ");
    const combined = `${text}\n${sourcesText}`;
    const citation = detectPractiqCitation(combined);
    return {
      source: "perplexity",
      query,
      cited_practiq: citation.cited,
      cited_url: citation.url,
      competitors_cited: detectCompetitors(text),
      cost_usd: 0.005,
      response_text: text.slice(0, 4000),
      raw_response: json,
    };
  } catch (err) {
    return {
      source: "perplexity",
      query,
      cited_practiq: false,
      cited_url: null,
      competitors_cited: [],
      cost_usd: 0,
      response_text: "",
      raw_response: { error: String(err) },
      notes: "perplexity_exception",
    };
  }
}

// ── Engine: Brave Search AI ─────────────────────────────────────────
async function scanBraveAI(query: string): Promise<ScanResult | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("summary", "1");
    const res = await fetch(url.toString(), {
      headers: {
        "X-Subscription-Token": apiKey,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return {
        source: "brave_ai",
        query,
        cited_practiq: false,
        cited_url: null,
        competitors_cited: [],
        cost_usd: 0,
        response_text: "",
        raw_response: { error: `${res.status} ${res.statusText}` },
        notes: `brave_http_${res.status}`,
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    // Brave's summarizer puts AI summary in `summarizer.summary` (varies
    // by tier). Fall back to web result snippets if absent.
    const summarizer = (json["summarizer"] ?? {}) as { summary?: string };
    const web = (json["web"] ?? {}) as {
      results?: Array<{ url?: string; description?: string; title?: string }>;
    };
    const text =
      summarizer.summary ??
      (web.results ?? [])
        .slice(0, 5)
        .map((r) => `${r.title ?? ""}: ${r.description ?? ""} (${r.url ?? ""})`)
        .join("\n");
    const citation = detectPractiqCitation(text);
    return {
      source: "brave_ai",
      query,
      cited_practiq: citation.cited,
      cited_url: citation.url,
      competitors_cited: detectCompetitors(text),
      cost_usd: 0,
      response_text: text.slice(0, 4000),
      raw_response: json,
    };
  } catch (err) {
    return {
      source: "brave_ai",
      query,
      cited_practiq: false,
      cited_url: null,
      competitors_cited: [],
      cost_usd: 0,
      response_text: "",
      raw_response: { error: String(err) },
      notes: "brave_exception",
    };
  }
}

// ── Engine: OpenRouter (ChatGPT with web search) ────────────────────
async function scanOpenRouter(query: string): Promise<ScanResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // `:online` suffix instructs OpenRouter to enable web search
        // grounding for any model that supports it.
        model: "openai/gpt-4o-mini:online",
        messages: [
          {
            role: "user",
            content: `${query}\n\nList specific products by name and include any URLs you reference.`,
          },
        ],
        max_tokens: 600,
      }),
    });
    if (!res.ok) {
      return {
        source: "openrouter",
        query,
        cited_practiq: false,
        cited_url: null,
        competitors_cited: [],
        cost_usd: 0,
        response_text: "",
        raw_response: { error: `${res.status} ${res.statusText}` },
        notes: `openrouter_http_${res.status}`,
      };
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const citation = detectPractiqCitation(text);
    // Rough cost estimate: gpt-4o-mini online ~ $0.15/1M input + $0.60/1M
    // output. Treat the whole call as ~700 tokens average → ~$0.0005.
    const tokens = json.usage?.total_tokens ?? 700;
    const cost = (tokens / 1_000_000) * 0.45;
    return {
      source: "openrouter",
      query,
      cited_practiq: citation.cited,
      cited_url: citation.url,
      competitors_cited: detectCompetitors(text),
      cost_usd: cost,
      response_text: text.slice(0, 4000),
      raw_response: json,
    };
  } catch (err) {
    return {
      source: "openrouter",
      query,
      cited_practiq: false,
      cited_url: null,
      competitors_cited: [],
      cost_usd: 0,
      response_text: "",
      raw_response: { error: String(err) },
      notes: "openrouter_exception",
    };
  }
}

const ENGINES: Array<{
  name: GeoEngine;
  envKey: string;
  fn: (q: string) => Promise<ScanResult | null>;
}> = [
  { name: "perplexity", envKey: "PERPLEXITY_API_KEY", fn: scanPerplexity },
  { name: "brave_ai", envKey: "BRAVE_SEARCH_API_KEY", fn: scanBraveAI },
  { name: "openrouter", envKey: "OPENROUTER_API_KEY", fn: scanOpenRouter },
];

export async function runGeoScan(opts?: {
  costCapUsd?: number;
  queries?: readonly string[];
}): Promise<RunSummary> {
  const costCap = opts?.costCapUsd ?? COST_CAP_USD_DEFAULT;
  const queries = opts?.queries ?? GEO_PROBE_QUERIES;

  const enginesAttempted: GeoEngine[] = [];
  const enginesSkipped: { name: string; reason: string }[] = [];
  for (const eng of ENGINES) {
    if (process.env[eng.envKey]?.trim()) enginesAttempted.push(eng.name);
    else enginesSkipped.push({ name: eng.name, reason: `${eng.envKey} missing` });
  }
  // Google AIO has no public API — always declared as skipped.
  enginesSkipped.push({ name: "google_aio", reason: "no_public_api" });

  const summary: RunSummary = {
    engines_attempted: enginesAttempted,
    engines_skipped: enginesSkipped,
    queries_run: 0,
    queries_total: queries.length * Math.max(enginesAttempted.length, 1),
    citations_found: 0,
    cost_usd_total: 0,
    results: [],
    cost_cap_hit: false,
  };

  if (enginesAttempted.length === 0) return summary;

  const supabase = getSupabase();

  outer: for (const query of queries) {
    for (const engName of enginesAttempted) {
      if (summary.cost_usd_total >= costCap) {
        summary.cost_cap_hit = true;
        break outer;
      }
      const eng = ENGINES.find((e) => e.name === engName)!;
      const result = await eng.fn(query);
      if (!result) continue;
      summary.results.push(result);
      summary.queries_run += 1;
      summary.cost_usd_total += result.cost_usd;
      if (result.cited_practiq) summary.citations_found += 1;

      // Insert into Supabase (best-effort — never abort the run on insert
      // failure).
      if (supabase) {
        await supabase
          .from("geo_citations")
          .insert({
            source: result.source,
            query: result.query,
            response_text: result.response_text,
            cited_practiq: result.cited_practiq,
            cited_url: result.cited_url,
            competitors_cited: result.competitors_cited,
            raw_response: result.raw_response,
            cost_usd: result.cost_usd,
            notes: result.notes ?? null,
          })
          .then(({ error }) => {
            if (error) console.warn("[geo-scan] insert failed:", error.message);
          });
      }
    }
  }

  return summary;
}
