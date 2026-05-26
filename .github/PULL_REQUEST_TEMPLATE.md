<!-- Thanks for the PR! See CONTRIBUTING.md for the full rules.
     A few quick reminders so this PR can land fast: -->

## What & why

<!-- 1-3 sentences. The maintainer reads this first.
     Bad: "Improved morning_briefing."
     Good: "morning_briefing previously returned only the first 10 clients sorted
            alphabetically. Now it sorts by priority score so a 120-client firm sees
            their urgent clients first." -->

## How tested

<!-- Be honest about what you actually exercised.
     - [ ] Manual smoke against my own ~/.practiq/ data
     - [ ] Vitest unit test (commit hash)
     - [ ] Playwright e2e (commit hash)
     - [ ] CI green
     - [ ] None — please review carefully -->

## Breaking change?

<!-- - [ ] No
     - [ ] Yes — describe what callers must change.
     If yes, also add the `breaking` label and bump the next release accordingly. -->

## Linked issue(s)

<!-- Closes #N / Refs #N -->

## Checklist

- [ ] Followed Conventional Commits in the PR title (`feat:`, `fix:`, `docs:`, ...)
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] New code has tests (or there's a good reason it doesn't)
- [ ] Docs updated if behavior changed
- [ ] No `.env`, secrets, or customer data added to the diff
- [ ] AGPL-3.0 compatible (no closed-source deps, no binary blobs without source)
