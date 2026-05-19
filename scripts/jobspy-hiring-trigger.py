#!/usr/bin/env python
"""
JobSpy-based hiring trigger detection for Practiq.

Why: A boutique accounting/CPA/legal firm posting "Senior Accountant",
"Bookkeeper", "Office Manager", or "Tax Manager" jobs is in the highest-
intent window we know of:
  - they hit context-switching pain (need extra hands)
  - new hire onboarding (4-6 weeks of partner re-explaining client books)
  - capital for tools (HR budget unlocks adjacent tooling budget)

Source: github.com/speedyapply/JobSpy (MIT) — scrapes LinkedIn / Indeed /
Glassdoor / ZipRecruiter / Google Jobs concurrently with NO signups, NO API
keys, NO paid plan.

Output goes to .cycle/research/2026-05-17-customer-discovery-kit/
signals-{date}-jobspy.csv in the standard CSV format that merge-all-sources.mjs
already understands. From there:
  1. merge-all-sources.mjs unions it into master-inventory + master-signals
  2. lenient-icp 4-tier classifier picks up new companies
  3. firm-name-resolver eventually finds firm_url
  4. web-enrich extracts emails from firm contact pages
  5. discovery-draft personalizes using the "hiring trigger" anchor:
       "Saw {firm_name} is hiring {role}. The week-2 to week-6 stretch
        usually breaks somebody — how do you handle client context
        transfer to a new hire?"

Crash-safe:
- Idempotent: re-run skips already-seen companies (using existing
  signals-{date}-jobspy.csv as deduplication source)
- Per-query try/except so one rate-limit doesn't kill the whole run
- Writes incrementally — partial output survives SIGINT

Usage:
    python scripts/jobspy-hiring-trigger.py
    python scripts/jobspy-hiring-trigger.py --max=50 --hours=168
    python scripts/jobspy-hiring-trigger.py --queries="senior accountant CPA,bookkeeper CPA firm"
"""
import sys
import csv
import os
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from jobspy import scrape_jobs
except ImportError:
    print("✗ Install: pip install python-jobspy")
    sys.exit(1)

KIT = Path(__file__).parent.parent / ".cycle" / "research" / "2026-05-17-customer-discovery-kit"
KIT.mkdir(parents=True, exist_ok=True)

# Queries that signal Practiq's ICP (boutique accounting/CPA firms)
DEFAULT_QUERIES = [
    "CPA firm senior accountant",
    "CPA firm bookkeeper",
    "CPA firm tax manager",
    "CPA firm office manager",
    "boutique accounting firm staff accountant",
    "tax preparer CPA",
    "EA enrolled agent",
]

# Major US metros where boutique accounting/CPA firms concentrate
CITIES = [
    "United States",   # USA-wide search
    "New York, NY",
    "Los Angeles, CA",
    "Chicago, IL",
    "Houston, TX",
    "Phoenix, AZ",
    "Philadelphia, PA",
    "Dallas, TX",
    "Atlanta, GA",
    "Boston, MA",
]

# Output schema — must match merge-all-sources.mjs expected columns
CSV_COLUMNS = [
    "firm_name", "contact_name", "role", "vertical", "location",
    "team_size", "client_count_estimate", "email", "linkedin_url",
    "linkedin_snippet", "firm_url", "firm_snippet", "source_channel",
    "personalization_note", "outreach_status", "outreach_date",
    "reply_status", "reply_date", "interview_date", "pilot_status",
    "pilot_outcome",
]


def parse_args():
    args = {"max": 25, "hours": 168, "queries": DEFAULT_QUERIES, "cities": CITIES}
    for a in sys.argv[1:]:
        if a.startswith("--max="):
            args["max"] = int(a[len("--max="):])
        elif a.startswith("--hours="):
            args["hours"] = int(a[len("--hours="):])
        elif a.startswith("--queries="):
            args["queries"] = [q.strip() for q in a[len("--queries="):].split(",")]
        elif a.startswith("--cities="):
            args["cities"] = [c.strip() for c in a[len("--cities="):].split(",")]
    return args


def load_existing_companies(out_path):
    """Idempotent: skip companies already in output file."""
    seen = set()
    if not out_path.exists():
        return seen
    try:
        with open(out_path, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                fn = row.get("firm_name", "").strip().lower()
                if fn:
                    seen.add(fn)
    except Exception:
        pass
    return seen


def append_row(out_path, row, write_header):
    """Append-only with header on first write."""
    mode = "a" if out_path.exists() and not write_header else "w"
    with open(out_path, mode, newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        if write_header:
            writer.writeheader()
        writer.writerow(row)


def main():
    args = parse_args()
    today = datetime.now(timezone.utc).date().isoformat()
    out_path = KIT / f"signals-{today}-jobspy.csv"

    print(f"🎯 JobSpy hiring trigger detection")
    print(f"   queries={len(args['queries'])} cities={len(args['cities'])} "
          f"max_per_query={args['max']} hours_old={args['hours']}")
    print(f"   output={out_path}")
    print()

    seen = load_existing_companies(out_path)
    print(f"Already collected: {len(seen)} unique firms")

    new_rows = 0
    errors = 0
    write_header = not out_path.exists()
    total_pairs = len(args["queries"]) * len(args["cities"])
    pair_idx = 0

    for query in args["queries"]:
        for city in args["cities"]:
            pair_idx += 1
            print(f"  [{pair_idx}/{total_pairs}] {query} @ {city}")
            try:
                jobs = scrape_jobs(
                    site_name=["indeed", "linkedin", "glassdoor", "zip_recruiter"],
                    search_term=query,
                    location=city,
                    results_wanted=args["max"],
                    hours_old=args["hours"],
                    country_indeed="usa",
                    verbose=0,
                )
                if jobs is None or len(jobs) == 0:
                    print(f"      → 0 results")
                    continue

                got_this_pair = 0
                for _, job in jobs.iterrows():
                    company = str(job.get("company", "")).strip()
                    if not company or company.lower() in seen:
                        continue
                    seen.add(company.lower())

                    title = str(job.get("title", "")).strip()
                    location_str = str(job.get("location", "")).strip()
                    company_url = str(job.get("company_url", "")).strip()
                    job_url = str(job.get("job_url", "")).strip()
                    date_posted = str(job.get("date_posted", "")).strip()

                    row = {
                        "firm_name": company,
                        "contact_name": "",
                        "role": "",
                        "vertical": "accounting",
                        "location": location_str,
                        "team_size": "",
                        "client_count_estimate": "",
                        "email": "",
                        "linkedin_url": "",
                        "linkedin_snippet": "",
                        "firm_url": company_url,
                        "firm_snippet": f"Hiring: {title}" + (f" (posted {date_posted})" if date_posted else ""),
                        "source_channel": "jobspy_hiring",
                        "personalization_note": (
                            f"{company} is hiring {title}. Recent posting "
                            "indicates context-switching pain — new hire onboarding "
                            f"often takes 4-6 weeks of partner re-explaining client books. Job: {job_url}"
                        ),
                        "outreach_status": "",
                        "outreach_date": "",
                        "reply_status": "",
                        "reply_date": "",
                        "interview_date": "",
                        "pilot_status": "",
                        "pilot_outcome": "",
                    }
                    append_row(out_path, row, write_header)
                    write_header = False
                    got_this_pair += 1
                    new_rows += 1
                print(f"      → {got_this_pair} new firms")
            except Exception as e:
                print(f"      ⚠ error: {str(e)[:100]}")
                errors += 1
                continue
            time.sleep(3)  # politeness pause between API calls

    print()
    print(f"📊 Run complete")
    print(f"   New unique firms added: {new_rows}")
    print(f"   Errors: {errors}")
    print(f"   Total firms in {out_path.name}: {len(seen)}")
    print()
    print(f"Next steps:")
    print(f"   1. node --env-file=../../.env.local scripts/merge-all-sources.mjs")
    print(f"   2. firm-name-resolver will pick up these firm_urls and find websites")
    print(f"   3. web-enrich will extract emails from contact pages")
    print(f"   4. discovery-draft will personalize with hiring-trigger anchor")


if __name__ == "__main__":
    main()
