---
title: Practiq — 90-second product demo
duration: 90s
word_count_target: 180
voice: professional-founder-direct (SD Keum persona)
voice_id_elevenlabs: TBD (choose "Antoni" or "Rachel" natural voice)
use_cases:
  - Landing page hero embed (loop muted, click-to-unmute)
  - Cold email signature video
  - Twitter/LinkedIn launch
  - PR pitch attachment
captions: required (accessibility + muted autoplay)
cta: https://practiq.dev/pricing
---

# Practiq 90-second product demo — narration script

## Structure
1. Hook (0-10s): The problem in one specific moment
2. Stakes (10-25s): The hidden cost multiplied across a firm
3. Product moment (25-60s): What an AI-Native Agent morning looks like
4. Proof (60-75s): How it's different from "AI add-ons"
5. CTA (75-90s): Founding Member + link

## Narration (target ~180 words, ~90 seconds at 120 WPM)

> [0:00-0:10] **Hook** — "It's 9:17 AM. Monday. You've just opened your practice management software for the third client today. And you cannot remember what Jennifer's case is about anymore."

> [0:10-0:25] **Stakes** — "Every time a partner at a small accounting, law, or HR advisory firm switches between clients, they lose between three and eight minutes rebuilding context in their head. Multiply that across 120 clients and the number is ugly: one hundred seventy thousand dollars of partner time, gone — every year — to context switching."

> [0:25-0:60] **Product moment** — "Practiq fixes this by flipping the work order. An AI-native agent scans every client overnight. In the morning, you don't see a blank screen. You see what changed. You see the three anomalies the AI flagged. You see the eight financial statement drafts waiting for your review. You see the five reminder emails ready for you to send — or skip. Your job becomes approval, not preparation."

> [0:60-0:75] **Proof** — "Every deliverable passes through an explicit approval queue. No send button fires without a human. This is not a ChatGPT wrapper. It's a product that understands that in regulated professional services, autonomy stops where liability begins."

> [0:75-0:90] **CTA** — "The first fifty firms lock in Founding Member pricing — forty-nine dollars a month, for life. Practiq dot dev slash pricing. Your next Monday morning starts differently."

---

## Production notes

### Voiceover (ElevenLabs)
- Voice: "Antoni" (v2) or "Adam" — male, late 30s, professional, warm-authoritative
- Stability: 0.5 · Similarity: 0.75 · Style: 0.2 (moderate)
- Speed: ~0.95x for emphasis on pain-story moments (0:00-0:25)
- Pause: natural, ~350ms between sentences
- File: `practiq-demo-90sec-v1.mp3` at 44.1kHz stereo

### Visual composition (Remotion — separate pass)
- 0:00-0:10: Muted stock footage (hand on mouse, clock showing 9:17). Text overlay appears frame 5: "It's 9:17 AM."
- 0:10-0:25: Animated number counter 0 → $170,000. Subtle red tint.
- 0:25-0:60: Mock dashboard (lift existing FractionalOS dashboard frames from `/src/app/dashboard/` screenshots). Tickmarks appear one by one: "3 anomalies" / "8 drafts" / "5 emails ready". Camera does slow push-in.
- 0:60-0:75: Zoom on Approval Queue item. "APPROVE" button highlights. Cut to sentence text for emphasis.
- 0:75-0:90: Founding Member badge appears at left. URL "practiq.dev/pricing" animates in as text. Brand lockup at 0:87.

### Branding overlay
- Font: Plus Jakarta Sans (matches product)
- Accent color: #10b981 (emerald-500, Practiq brand-accent)
- Background: #050505 (app bg-base) with subtle gradient mesh
- Logo lockup: bottom-right, 32px, opacity 70%

### Captions
- Auto-generated from narration text via AWS Transcribe or manually authored
- Position: lower-third, white text on black bar (1px), Plus Jakarta Sans 18px
- Burned into video for social-autoplay accessibility

### Distribution assets (follow-up work)
- Landing hero embed: muted-loop MP4, 1080p, 5MB target
- Full version for social: 1080p MP4 with captions burned in
- Square 1:1 crop for LinkedIn/Instagram (needs separate render)
- Vertical 9:16 crop for TikTok/Reels (needs separate render)

## Source material references (for Remotion agent)
- Dashboard UI components: `ventures/fractional-ai-command-center/src/app/dashboard/**`
- Brand tokens: `ventures/fractional-ai-command-center/DESIGN.md`
- User scenario details: `docs/product/USER-SCENARIOS.md` § Jennifer Park morning
- Pain stats citation: AICPA 2024 Small Firm Survey → $170K/year/partner context switching figure
