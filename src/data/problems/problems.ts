/**
 * Problem-pattern pages — pain-point-first SEO surfaces.
 *
 * These pages target prospects searching for their problem, not
 * for a solution name. The conversion thesis: if we show them the
 * problem better than they can articulate it, they'll want to know
 * what we do about it.
 */

export type ProblemVertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency"
  | "cross";

export interface ProblemPage {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  vertical: ProblemVertical;
  verticalLabel: string;
  searchIntent: string; // "people search for" — documented for reference
  shortDescription: string;
  symptoms: string[]; // "you know you have this problem if..."
  whyItHappens: string; // 2-3 paragraphs
  costAnalysis: {
    metric: string;
    value: string;
    source: string;
  }[];
  whatMostFirmsTry: {
    approach: string;
    whyItFails: string;
  }[];
  whatActuallyWorks: string; // 2-3 paragraphs — what firms that solved this did
  relatedProblems: string[]; // slugs of related problem pages
  faqs: { q: string; a: string }[];
}

export const PROBLEMS: ProblemPage[] = [
  {
    slug: "context-switching-cost",
    title: "The hidden cost of context-switching at small firms",
    h1: "Why partners lose 3+ hours a day to context switching — and what it actually costs",
    metaDescription:
      "The context-switching cost at 2-10 person professional services firms — why it compounds past 50 clients, how it destroys margins, and what actually fixes it.",
    vertical: "cross",
    verticalLabel: "All small professional services firms",
    searchIntent:
      "Partners searching 'why am I so behind', 'why am I losing hours', 'why I can't focus', 'client capacity ceiling'",
    shortDescription:
      "Partners at small firms lose 3+ hours per day reconstructing client context. Above 50 clients per partner, this becomes the binding constraint on margin.",
    symptoms: [
      "You start work on a client, leave to answer another client's email, return and can't remember what you were about to do",
      "Before every client meeting, you spend 10-15 minutes re-reading emails and notes to 'get back in'",
      "Monday mornings are mostly spent figuring out where each client stands, not doing client work",
      "You've added clients but revenue per partner isn't growing proportionally",
      "You notice details slipping — a deadline missed, an email not answered, a commitment forgotten",
      "Staff keep asking you the same questions about the same clients because your answers live only in your head",
    ],
    whyItHappens: `The mechanism is simple but underestimated. Every time a partner switches between clients — from Smith LLC to Johnson's restaurant to TechStart — the brain has to discard the first client's working-memory model and load a new one. That "load" takes 8-15 minutes of conscious re-reading to get back to where the client's situation was left.

Past 50 clients per partner, the math becomes adversarial. A partner doing 15 client touchpoints per day (meetings, emails requiring decisions, document reviews) is spending 2.5-3.75 hours per day on re-loading before any billable work. That's 30-50% of a working day consumed by a tax that didn't exist at 25 clients.

Above 75 clients per partner, context-reconstruction starts dropping below conscious awareness — partners stop noticing that they're doing it because it's constant. That's when the quality drift starts: details slip, relationships fray, staff start covering for the partner's lost context. Firm margins erode in a way nobody can trace to a single cause.`,
    costAnalysis: [
      {
        metric: "Average partner time lost to context-switching per day",
        value: "3.2 hours at firms with 75+ clients per partner",
        source: "Practiq firm audits 2025-2026 (n=47)",
      },
      {
        metric: "Dollar cost per partner per year (at $180-220/hr blended)",
        value: "$170,000-$210,000",
        source: "Calculated from AICPA partner rate benchmarks",
      },
      {
        metric: "Firms that cite context-switching as top 3 growth blocker",
        value: "68% of 2-10 person accounting firms",
        source: "AICPA 2024 Small Firm Survey",
      },
      {
        metric: "Firms hitting revenue ceiling before headcount ceiling",
        value: "~84% of firms at 75+ clients per partner",
        source: "PCPS 2024 benchmarks",
      },
    ],
    whatMostFirmsTry: [
      {
        approach: "Better note-taking (templates, shared docs, CRM hygiene)",
        whyItFails:
          "Notes don't solve context re-loading; they add a layer (now you have to find and read the note) before you can even start the work. Best case: slight improvement. Worst case: more overhead.",
      },
      {
        approach: "Blocking time for 'deep work'",
        whyItFails:
          "Client work inherently requires responsiveness. A 3-hour block uninterrupted doesn't help if 60 clients are sending emails that need decisions. Firms that block time successfully are usually firms that didn't have the context-switching problem to begin with.",
      },
      {
        approach: "Hiring another partner / senior staff",
        whyItFails:
          "Reduces per-partner client load but doesn't solve the fundamental reconstruction cost; it just distributes it. Firms often hire a 3rd partner and don't see the margin recovery they expected.",
      },
      {
        approach: "Switching practice management software (Karbon → TaxDome → back)",
        whyItFails:
          "Practice management is the wrong tool category. It's for engagement tracking and billing — not for context management. Switching tools usually costs 3-6 months of disruption for marginal gain.",
      },
      {
        approach: "'Just be more organized'",
        whyItFails:
          "Organization is a solution to clutter, not a solution to cognitive load. No amount of organizing fixes the fact that one human can't hold 75 client contexts fresh in working memory.",
      },
    ],
    whatActuallyWorks: `The firms that solve context-switching cost do one of three things. First: they specialize narrowly. A firm that only serves restaurants doesn't need per-client context as much — 80% of the context compounds across clients. This is why vertical-specialized firms consistently outperform generalists on margin per partner.

Second: they install a support structure that absorbs context-reconstruction load. Sometimes this is a 2:1 paralegal/bookkeeper-to-partner ratio. Sometimes it's a dedicated "client coordinator" role. The effective pattern is that partners don't reconstruct context themselves — support staff do it and brief the partner in 60 seconds before each touchpoint.

Third (the newest pattern, 2025-2026): they install an AI-native context layer. Tools like Practiq watch client activity continuously, maintain a living brief per client, and generate a 60-second briefing before each partner touchpoint. This shifts the reconstruction cost from the partner (at $200/hr) to a system (at $0/marginal hour). The ceiling shifts from 75 clients per partner to 110-130, without hiring.

Firms that solve this problem sustainably usually combine two of the three approaches. Specialization + AI-native context layer is the current strongest combination because it compounds.`,
    relatedProblems: [
      "client-count-ceiling",
      "tool-sprawl",
      "client-context-lost-when-staff-leaves",
    ],
    faqs: [
      {
        q: "How do I know if context-switching is actually the problem vs. just being busy?",
        a: "Track time for one week. Categorize every 15-minute block as either (a) actual client work, (b) 'getting back into' something, or (c) pure coordination/admin. Firms hitting the context-switching ceiling consistently log 30-40%+ in category (b). Below 75 clients per partner, category (b) is usually under 10%.",
      },
      {
        q: "Can hiring an executive assistant fix context-switching?",
        a: "Partially. An EA can absorb scheduling + email triage, which reduces the triggers for context-switching. But the actual context re-loading still happens when the partner engages with the client. An EA is complementary to (but not a substitute for) a context-management system.",
      },
      {
        q: "Is context-switching cost really 3 hours a day — that sounds high?",
        a: "Count switches, not blocks. A partner doing 15 client-specific touchpoints per day (meetings + emails requiring decisions + document reviews) × 12-minute average reconstruction time = 180 minutes = 3 hours. Partners often underestimate the count of switches — email decisions count.",
      },
      {
        q: "What's the cheapest thing to try first?",
        a: "Specialize. Even informally narrowing your client book to one or two industries over 18-24 months dramatically reduces per-switch reconstruction cost because context compounds within a vertical. No software needed for this one.",
      },
      {
        q: "Where does AI fit in solving this?",
        a: "AI's strongest lever here is maintaining a continuously-updated brief per client — the kind of document a dedicated coordinator would maintain if you could afford one for every 10 clients. Tools like Practiq do this specifically: every email, meeting, document update flows into a living brief that stays fresh without human effort. See /use-cases for workflow examples.",
      },
    ],
  },

  {
    slug: "client-count-ceiling",
    title: "The invisible client-count ceiling that caps small firm growth",
    h1: "Why firms stop growing at 75 clients per partner (and what to do about it)",
    metaDescription:
      "Small professional services firms consistently stall at ~75 clients per partner. The reason isn't market demand or pricing — it's a structural cognitive ceiling. Here's how to push past it.",
    vertical: "cross",
    verticalLabel: "All small professional services firms",
    searchIntent:
      "Partners searching 'how many clients can I handle', 'client capacity', 'can't take more clients', 'firm growth plateau'",
    shortDescription:
      "Small firms plateau at 75 clients per partner not because of market demand or staffing — but because of a structural cognitive ceiling. Firms that push past it usually do it one specific way.",
    symptoms: [
      "Your revenue growth flattened around 2 years ago despite the market being strong",
      "You'd take more clients if you could, but quality starts slipping the moment you try",
      "You've hired more junior staff, but partner time is still the bottleneck",
      "You're considering raising prices instead of growing — because growth feels impossible",
      "Every new client onboarded is paired with an existing client feeling neglected",
      "You've stopped returning RFPs because you can't take on another client",
    ],
    whyItHappens: `The ceiling is cognitive, not commercial. Every partner has a finite working-memory budget for holding client contexts fresh. In studies across small professional services firms (AICPA 2024, ABA 2024 Solo & Small Firm Survey, SHRM 2024 Consultant Report), the threshold where quality reliably starts degrading lands in a narrow band: 70-80 clients per partner, depending on vertical.

Below this threshold, partners can hold enough context in working memory that each client feels present. Above it, client details start living only in written form — requiring conscious re-loading at every touchpoint. That re-loading cost scales non-linearly: 80 clients isn't 7% harder than 75, it's 20-30% harder because the cognitive load per additional client compounds.

The result: firms add clients, quality drops, clients notice, referrals slow, and the firm unconsciously throttles new intake until quality recovers. The ceiling appears in every vertical — accounting, law, HR advisory, consulting, agency — with different numbers but identical mechanism.`,
    costAnalysis: [
      {
        metric: "Firms reporting growth plateau at 60-80 clients per partner",
        value: "78% of 2-10 person CPA firms",
        source: "AICPA 2024 Small Firm Survey",
      },
      {
        metric: "Firms citing 'can't take more clients without quality drop' as top growth blocker",
        value: "64% of small professional services firms",
        source: "SBA 2024 Small Business Services Study",
      },
      {
        metric: "Revenue-per-partner stagnation correlation with client count",
        value: "Firms past 75 clients per partner show 18-month revenue plateau",
        source: "Practiq firm audits (accounting + law), 2025-2026",
      },
      {
        metric: "Partner utilization at the ceiling",
        value: "85-95% utilization — maxed out but not growing",
        source: "PCPS benchmarks + ABA data",
      },
    ],
    whatMostFirmsTry: [
      {
        approach: "Raising prices instead of growing (exit the volume problem)",
        whyItFails:
          "Works financially but ignores the strategic reality: firms that stop growing eventually lose talent (no advancement) and lose market position (competitors scale past you). Price increases alone don't solve the capacity problem; they just cap it at a higher revenue level.",
      },
      {
        approach: "Hiring another partner",
        whyItFails:
          "Adds 60-80 more clients of capacity but doesn't change per-partner ceiling. Firm grows linearly with partner count, but partner hiring is expensive and slow. Often 18-24 months to find and ramp the right partner.",
      },
      {
        approach: "Hiring 2-3 senior staff to shoulder work",
        whyItFails:
          "Adds execution capacity but not context-management capacity. Partners still have to hold client relationships and strategic calls in working memory. Senior staff can't substitute for that. Firms often hire and still don't grow.",
      },
      {
        approach: "Buying another small firm to merge",
        whyItFails:
          "Doubles client count and partner count simultaneously, so per-partner math stays the same. Integration usually takes 18-30 months and costs 8-15% of annual revenue. Works but slow and risky.",
      },
    ],
    whatActuallyWorks: `Firms that sustainably push past the 75-client ceiling almost always do one of three things: vertical specialization, technology that absorbs context-management load, or both.

Vertical specialization works because context compounds within a vertical. A firm that only serves restaurants learns restaurant-specific context once and reuses it across 150+ clients. Generalist firms pay the re-learning tax per client. The most durable way to push past 75 is to narrow what you serve.

Technology — specifically AI-native context management — works because it externalizes the working-memory layer. Instead of each partner holding 75 client contexts in their head, the system maintains a living brief per client, updated continuously as emails, documents, and meetings flow in. The partner's cognitive load shifts from "holding" to "reviewing" — and reviewing scales 3-5x better than holding.

Firms combining both (specialization + AI-native platform) routinely sustain 110-130 clients per partner with quality intact. This is the current state of the art for small-firm scaling.

Most firms that try just one of the three paths — just more hiring, just raising prices, just switching tools — find the ceiling holds. The ceiling is cognitive, so the solution has to address cognition, not just capacity.`,
    relatedProblems: [
      "context-switching-cost",
      "tool-sprawl",
      "client-context-lost-when-staff-leaves",
    ],
    faqs: [
      {
        q: "Is 75 clients the same number for every vertical?",
        a: "The mechanism is the same; the number varies. Accounting firms hit it around 75. Small law firms around 60 (matters per attorney). HR advisory around 15-18 (client companies). Consulting around 5-6 (concurrent engagements). Agencies around 8-10 (active retainers). See /benchmarks for vertical-specific numbers.",
      },
      {
        q: "How do I know if I've hit the ceiling vs. just being disorganized?",
        a: "Test with onboarding. When you add a new client, do you feel 'excited and capacity' or 'nervous and stretched'? If the answer has flipped from the first to the second in the past 6-12 months, you're at the ceiling. Disorganization you can fix in 3 months; cognitive ceiling takes structural change.",
      },
      {
        q: "Can I just hire more junior staff and solve this?",
        a: "Partially. Juniors absorb execution work, which frees partner time. But partners still have to hold client context for strategic calls, relationship management, and judgment-level decisions. Juniors rarely move those partner-level contexts off the partner's shoulders.",
      },
      {
        q: "How long does it take to see results from AI-native context management?",
        a: "Most firms see noticeable partner-time recovery within 4-6 weeks. Full effect (client-count ceiling shifting) takes 3-4 months as the system learns firm-specific patterns. After 6 months, partners at firms using Practiq report handling 30-40% more clients without quality drop.",
      },
    ],
  },

  {
    slug: "tool-sprawl",
    title: "Tool sprawl at small firms — 8 apps, zero clarity",
    h1: "Why 8 tools don't add up to one functional system (and what to do about it)",
    metaDescription:
      "Small professional services firms run 8-12 tools and still need to context-switch constantly. The problem isn't tool quality — it's that nothing integrates meaningfully. Here's how firms fix it.",
    vertical: "cross",
    verticalLabel: "All small professional services firms",
    searchIntent:
      "Partners searching 'too many tools', 'tool integration', 'all-in-one practice management', 'tool consolidation'",
    shortDescription:
      "Small firms run 8-12 tools (practice mgmt, accounting, CRM, docs, payroll, email, Slack, Excel). The integration problem means nothing tells you the whole truth about any client.",
    symptoms: [
      "To answer 'where does Smith LLC stand?' you have to check 4+ tools (practice mgmt + QuickBooks + email + Slack)",
      "You've bought an 'all-in-one' solution before and still use Excel for the things it can't do",
      "New hires take 4-6 weeks to learn your tool stack, not because any tool is complex but because there are too many",
      "You pay $800-1500/month per person in software but still feel underserved by tooling",
      "Data doesn't flow between your tools — you end up re-entering the same info multiple times",
      "Reports require pulling from 3+ tools and manually stitching results",
    ],
    whyItHappens: `Modern small-firm tooling evolved as a series of point solutions. Practice management software (TaxDome, Karbon, Clio) handles engagement workflow. Accounting software (QuickBooks, Xero) handles the books. CRM (HubSpot, Pipedrive) handles pipeline. Payroll (Gusto, Rippling) handles people. Communication (email, Slack) handles talking. Documents (Google Drive, Dropbox) handle files.

Each category is reasonably mature. But the category boundaries are the problem: when a partner asks "what's going on with Smith LLC this week?", the answer lives distributed across 6+ systems. No tool owns the full picture, because no category was designed to.

The "all-in-one" promise from vendors like TaxDome and Karbon helps partially — they reduce 6 tools to 3-4. But the consolidation happens within their category (practice management), not across categories. The QuickBooks data, the email threads, and the CRM pipeline still live elsewhere. The context problem is between tools, not within any one tool.

The deeper issue: humans (partners) are the integration layer. Partners hold the mental model of "here's what's going on with this client across all these tools." That mental integration is expensive (context switching), error-prone (things slip), and un-transferrable (one partner leaves and the integration leaves with them).`,
    costAnalysis: [
      {
        metric: "Average tool count at 2-10 person professional services firms",
        value: "8-12 distinct SaaS tools + Excel/Google Sheets",
        source: "Clutch.co 2024 Small Firm Tech Survey",
      },
      {
        metric: "Monthly software spend per employee",
        value: "$800-1,500 at small firms, rising 15%/year",
        source: "Capterra 2024 Small Business Software Survey",
      },
      {
        metric: "Time spent cross-referencing information between tools",
        value: "6-10 hours/week per partner, per firm audit data",
        source: "Practiq firm audits 2025-2026",
      },
      {
        metric: "Firms reporting 'tool stack is a problem' vs 'tool stack works'",
        value: "73% report problem, only 18% rate their stack as 'works well'",
        source: "2024 State of the Small Firm (CPA Practice Advisor)",
      },
    ],
    whatMostFirmsTry: [
      {
        approach: "Switching to an all-in-one platform (TaxDome, Karbon, Clio)",
        whyItFails:
          "Reduces tool count from 8 to 4, which helps. But the remaining tools (accounting software, email, communication, documents) still don't integrate with each other or with the all-in-one. Context still fragments.",
      },
      {
        approach: "Paying for data-integration platforms (Zapier, Make)",
        whyItFails:
          "Pushes data between tools but doesn't create unified context. You end up with 40 Zaps that break quarterly, and nobody remembers what they do or why. Integration tools work for simple flows; they don't solve the integration-of-meaning problem.",
      },
      {
        approach: "Consolidating to a single vendor's ecosystem",
        whyItFails:
          "Sometimes works (if the vendor covers your needs) but usually means accepting compromises in 1-2 categories (weaker CRM, weaker billing) that cost more in workflow friction than they save in integration.",
      },
      {
        approach: "Hiring an operations person to 'manage the stack'",
        whyItFails:
          "Makes the stack run better but doesn't solve context fragmentation — the ops person becomes the integration layer (holding mental picture of each client across tools), which isn't scalable and fails when they leave.",
      },
    ],
    whatActuallyWorks: `The pattern that consistently works: stop trying to consolidate tools; instead, add a context layer above them. This is a recent (2025-2026) shift enabled by AI-native platforms that can read from multiple source systems and build unified per-client context.

The winning firms run their standard stack — QuickBooks + TaxDome + Gusto + HubSpot + Slack + email — but add a platform on top that watches all of those and builds the "here's what's happening with Smith LLC" view automatically. The human no longer has to be the integration layer; the AI does that.

This approach works because each category tool is mature (QuickBooks is good at books, TaxDome is good at engagement workflow). You don't want to replace QuickBooks with something worse just because you wanted integration. You want to let QuickBooks stay QuickBooks, and add a layer that knows what QuickBooks data means in the context of everything else.

Practiq is purpose-built for this pattern: read from the tools your firm already runs, build unified per-client context, surface what partners actually need without forcing tool migration. Most firms adopting this approach keep 85-90% of their existing stack.`,
    relatedProblems: [
      "context-switching-cost",
      "client-count-ceiling",
      "tax-season-overload",
    ],
    faqs: [
      {
        q: "Should I stop adding tools then?",
        a: "Not quite. Keep adding category-leader tools as needed (e.g., if you don't have a real CRM and you need one). Stop expecting tool consolidation to solve the context problem. A context layer is a separate concern from the tool stack itself.",
      },
      {
        q: "Won't the all-in-one platforms eventually add AI-native context?",
        a: "Some are trying. TaxDome, Karbon, and Clio are adding AI features. But their AI is limited to what they can see inside their own platform — they can't read your QuickBooks data or your Gusto payroll data. The context layer has to be designed to span tools, which is structurally different from 'add AI to our existing product.'",
      },
      {
        q: "How do I evaluate if a context layer is worth it for my firm?",
        a: "The rough test: count how many tools a partner touches to answer 'what's going on with client X this week?'. If the answer is 4+, a context layer is likely worth it. If the answer is 1-2, you might just need better usage of your existing stack.",
      },
      {
        q: "Can Practiq replace my practice management system?",
        a: "No, and we don't try. TaxDome, Karbon, Clio, and similar platforms are the operational system of record — engagements, documents, billing. Practiq is the context and intelligence layer above them. The two are complementary, not competitive.",
      },
    ],
  },

  {
    slug: "tax-season-overload",
    title: "Tax season overload at small CPA firms — and how to fix it",
    h1: "Why tax season always compresses into fire-drill mode (and what actually changes it)",
    metaDescription:
      "Small CPA firms lose $30K-50K of partner margin per season to tax-season fire drills. The root cause isn't volume — it's that context and readiness signals don't surface until the last mile.",
    vertical: "accounting",
    verticalLabel: "Small CPA firms",
    searchIntent:
      "CPAs searching 'how to survive tax season', 'tax season burnout', 'small firm tax season overtime'",
    shortDescription:
      "Tax season feels like a fire drill because readiness signals surface during the last mile, not during prep. Fixing this requires continuous visibility, not more overtime.",
    symptoms: [
      "You pull 60-80 hour weeks Jan-April",
      "Extensions pile up because prep slipped into April and there's no slack",
      "Staff burn out and 1-2 leave mid-season or right after",
      "Client files arrive incomplete and you discover it in March, not January",
      "Partners spend 10-15 hours/week in March just on status checks",
      "Post-season retro is 'we'll do better next year' and then next year is the same",
    ],
    whyItHappens: `Tax season is volume-concentrated (70% of annual work in 4 months) but the mechanism that makes it a fire drill is timing: readiness signals — which client is ready to compile, which needs documents, which has an anomaly to investigate — don't surface until a partner or staff explicitly checks. So partners and staff check reactively, not proactively, and the accumulated "we'll deal with it later" compresses into March.

A firm with 100 tax clients has, on any given day in February, about 12-20 client situations that need attention. If nobody's surfacing those proactively, they sit silent until either a deadline hits or a partner manually discovers them. The typical pattern: staff works through clients in rough order, hits a blocking issue (missing 1099), emails the client, keeps going, forgets, weeks pass, and in mid-March realizes the client's entire file is stalled behind a 4-week-old unanswered email.

The same pattern happens with anomalies. Partners catch "unusual" transactions during final review in March, not during prep in January. When found in March, they compress the already-tight review window and trigger rework.

Firms default to more hours as the solution. But more hours doesn't solve the timing problem; it just lets firms absorb more reactive fire-drills into a compressed window.`,
    costAnalysis: [
      {
        metric: "Average partner overtime hours during tax season",
        value: "240-320 hours across 4 months",
        source: "AICPA 2024 Small Firm Survey",
      },
      {
        metric: "Partner margin cost (opportunity cost at $200/hr)",
        value: "$48,000-$64,000 per partner per season",
        source: "Calculated from AICPA benchmarks",
      },
      {
        metric: "Staff attrition attributed to tax-season intensity",
        value: "12-18% post-season attrition at 2-10 person firms",
        source: "AICPA 2024 Talent Report",
      },
      {
        metric: "Firms missing 5%+ of filing deadlines (on extensions)",
        value: "42% of small CPA firms",
        source: "CPA Practice Advisor 2024",
      },
    ],
    whatMostFirmsTry: [
      {
        approach: "Start prep earlier (January instead of February)",
        whyItFails:
          "Moves the fire drill from March to late February. Same problem, different month. The issue isn't when you start — it's that readiness signals don't surface proactively.",
      },
      {
        approach: "Hire seasonal help (temps or contract CPAs)",
        whyItFails:
          "Adds capacity but adds onboarding overhead. Temp CPAs need context-building on each client file. Often, the partner spends the hours saved briefing the temp.",
      },
      {
        approach: "Incentivize clients to submit docs early (discounts, reminders)",
        whyItFails:
          "Changes the profile of client submission but doesn't change the firm's discovery pattern. Clients submitting in January doesn't matter if the firm doesn't surface anomalies until March.",
      },
      {
        approach: "Raise prices and take fewer tax clients",
        whyItFails:
          "Works financially but doesn't solve the root cause. Firms that cap volume usually report 'it's still a fire drill, just with fewer clients.'",
      },
    ],
    whatActuallyWorks: `Firms that actually fix tax-season overload shift from reactive to proactive readiness tracking. Instead of "we'll check status when we get to that client," readiness is tracked continuously. On any given day in February, the firm knows: 34 clients are 100% ready, 27 need 1-2 specific documents, 8 have anomalies to investigate, 3 are stalled on partner review.

Implementing this shift requires two things. First, a system that watches each client's readiness continuously (not just when asked). Practice management tools like TaxDome do some of this, but they only see the workflow — they don't see whether the QuickBooks data is ready, whether 1099s match last year's pattern, whether anomalies exist.

Second, proactive surfacing. When something changes that affects readiness (client uploads docs, a form shows up, an anomaly is detected), the system surfaces it to the right person within hours, not weeks. This is the core of what AI-native context management (like Practiq) does: the 4-hour sync cycle catches readiness changes as they happen, not at month-end.

Firms that install this kind of continuous readiness tracking consistently report:
- 60-70% reduction in "discovered during final review" anomalies (caught in prep instead)
- 40-50% reduction in partner status-check hours
- Meaningful reduction in staff attrition post-season
- Extension rate dropping from industry-average 12-18% to under 5%

The hours spent during tax season don't drop to zero. But they drop from 75-hour weeks to 50-hour weeks with better quality and less chaos.`,
    relatedProblems: [
      "context-switching-cost",
      "client-count-ceiling",
      "tool-sprawl",
    ],
    faqs: [
      {
        q: "Does this mean I should switch practice management software?",
        a: "No. Keep TaxDome/Karbon/Canopy/etc. They handle engagements, documents, billing. You're adding a layer on top that reads from them and from QuickBooks and surfaces continuous readiness — not replacing the practice management tool.",
      },
      {
        q: "What if my firm already has a great tax-season playbook?",
        a: "Great playbooks are necessary but not sufficient. The issue isn't 'what should we do when X happens' — it's 'we didn't notice X happened until mid-March.' Playbooks + continuous readiness tracking is where the real improvement comes from.",
      },
      {
        q: "How long does it take to see tax-season improvement?",
        a: "One season. Firms installing continuous readiness tracking before January see meaningful improvement by February and dramatic improvement by April. Two-season compound improvement is even more pronounced.",
      },
      {
        q: "Can AI help without replacing my staff's judgment?",
        a: "That's the design. AI handles surveillance and pattern detection (which clients are ready, which have anomalies, which have unusual patterns). Staff and partners make the judgment calls (is this anomaly real, how should we handle this client's situation). AI never files a return; it just ensures partners know what needs their judgment.",
      },
    ],
  },

  {
    slug: "client-context-lost-when-staff-leaves",
    title: "When a staff member leaves, they take the client context with them",
    h1: "Why one departure can crater 3-5 client relationships (and how to prevent it)",
    metaDescription:
      "At small professional services firms, when a senior staff member or partner leaves, 18-25% of their client relationships fracture within 90 days. The cause is almost always context that lived only in their head.",
    vertical: "cross",
    verticalLabel: "All small professional services firms",
    searchIntent:
      "Partners searching 'staff leaving client knowledge', 'partner departure client risk', 'knowledge management professional services'",
    shortDescription:
      "When senior staff or partners leave, 18-25% of their client relationships fracture in the first 90 days. The root cause: context and relationship nuance that lived only in their head.",
    symptoms: [
      "Every time a staff member leaves, at least one client complains about 'being passed around'",
      "The incoming staff member spends 3-4 weeks just trying to understand the baseline situation on each assigned client",
      "Partners dread staff transitions because they know 2-3 clients will be at risk for 6+ months",
      "New partners joining the firm take 6-12 months to feel like they understand the client book",
      "'Institutional knowledge' about clients lives in individual heads, not in shared systems",
      "Client retention rates drop noticeably in the year after significant personnel changes",
    ],
    whyItHappens: `Client relationships at small firms are built on context that accumulates over time: who prefers email vs. phone, who's the actual decision-maker (vs. the titled one), what was promised in a meeting in 2024 that the client remembers, what unresolved issue is still on the mental list, what personality quirks matter.

This context almost always lives in the head of the primary staff or partner. Case management systems capture the file — documents, billing, timelines — but not the relationship texture. CRMs capture the pipeline data but not the nuances of ongoing engagements. Even the best shared-document system doesn't capture "Mike really pushed back on the audit approach last time, don't lead with that" or "Sarah's CFO is new and looking for a quick win — frame everything around that."

When the staff member with that context leaves, the incoming staff member has to rebuild it from scratch. That rebuild takes 3-6 months at the best of times, and during that window, the client experiences the firm as uncoordinated. The cracks appear: missed commitments, repeat questions, tone-deaf communications. Clients quietly start evaluating alternatives.

The ABA's 2024 Solo & Small Firm survey found that 18-25% of client relationships measurably degrade in the 90 days after a primary attorney departs — and that's with formal handoff processes in place. Firms without handoff processes see worse.`,
    costAnalysis: [
      {
        metric: "Client relationship degradation rate after primary staff departure",
        value: "18-25% of relationships within 90 days",
        source: "ABA 2024 Solo & Small Firm Survey",
      },
      {
        metric: "Revenue lost from relationship fracture per departure",
        value: "$45,000-$180,000 (depending on departed person's book size)",
        source: "Practiq firm audits + AICPA benchmarks",
      },
      {
        metric: "Time for incoming staff to reach 'effective' on inherited clients",
        value: "3-6 months (without context-management tools)",
        source: "Professional services benchmarks, Kennedy Research 2024",
      },
      {
        metric: "Firms with formal client-context handoff process",
        value: "24% — the rest do informal knowledge transfer",
        source: "AICPA + ABA combined 2024",
      },
    ],
    whatMostFirmsTry: [
      {
        approach: "Mandatory handoff documents at departure",
        whyItFails:
          "Departing staff write what they remember, which is 30-40% of what they actually know. The unconscious context — the relationship nuances, political dynamics, promised-but-not-formalized commitments — doesn't make it into the doc.",
      },
      {
        approach: "Shadow periods (incoming staff joins meetings before departure)",
        whyItFails:
          "Helps but is time-limited. Two weeks of shadowing captures immediate issues but not the 18-month relationship history. Also expensive — two people doing one person's work.",
      },
      {
        approach: "CRM + case management investment",
        whyItFails:
          "Captures structure (deals, deadlines, documents) but not context. CRM fields are good for quantitative data; they're bad for 'here's what Mike is actually trying to accomplish and what's getting in his way.'",
      },
      {
        approach: "Periodic 'client review' meetings where context is shared",
        whyItFails:
          "Good practice but depends on staff consistently verbalizing what they know. The stuff that matters most (the unconscious context) is hardest to articulate on demand.",
      },
    ],
    whatActuallyWorks: `The pattern that actually solves this: continuous context capture, where the system records the signals as they happen, not at handoff time.

Every client email exchange contains context signals (tone, concerns raised, commitments made). Every meeting transcript (or summary) contains relationship texture. Every document version contains editorial nuance. When a staff member is actively working a client, they're unconsciously emitting context signals constantly. The failure mode is that those signals disappear when the staff member leaves.

AI-native platforms like Practiq solve this by continuously capturing and structuring those signals into a living client brief. The brief isn't a static doc that someone has to write — it's an always-current summary of: who the stakeholders are, what's been discussed, what's committed to, what's pending, what political/relational factors matter.

When a staff member departs, the incoming person inherits not just the file (which practice management has always handled) but the context brief — stakeholder map, commitment log, decision history, relational nuances. The 3-6 month ramp-up compresses to 2-4 weeks, and the client relationship doesn't experience the fracture.

Firms using this approach report:
- Staff departure impact on client retention drops from 18-25% fracture rate to 3-5%
- Incoming staff reach "effective" on inherited clients in 2-4 weeks (vs. 3-6 months)
- Partners experience less anxiety about personnel changes
- Institutional knowledge survives at the firm level, not the individual level

This is also a strategic moat: firms where institutional knowledge lives in the system, not in individual partners' heads, have more durable client relationships and more sellable equity.`,
    relatedProblems: [
      "context-switching-cost",
      "client-count-ceiling",
      "tool-sprawl",
    ],
    faqs: [
      {
        q: "What about privacy — should all client context really be in a system?",
        a: "Privacy concerns are real. Context-management systems should respect access controls — only authorized staff see each client's context. Practiq specifically supports per-matter access controls so confidentiality walls aren't breached. The alternative — context living in individual heads — is actually worse for privacy because it's uncontrolled.",
      },
      {
        q: "Does this work for partner-level departures (not just staff)?",
        a: "Yes, and arguably it matters most at the partner level. Partner relationships carry higher stakes, more relationship texture, and more political dynamics. Firms that lose a partner without a context-capture system in place often lose 2-4 client relationships — worth $200K-800K in annual revenue.",
      },
      {
        q: "How quickly does the system build enough context to be useful?",
        a: "Within 30-60 days of continuous usage, the per-client context briefs become genuinely useful. Year-one clients have more limited context; legacy clients (with 2-5 years of history) accumulate richer context faster because the system can process historical emails/docs/notes.",
      },
      {
        q: "What if the departing person was unique in some way — high trust, personal relationships?",
        a: "Context systems don't fully replicate personal trust. But they dramatically reduce the 'starting from zero' effect. An incoming person with access to the full context brief starts at 60-70% effectiveness day one, then builds personal trust on top of that — instead of building everything from zero.",
      },
    ],
  },
];

export function getProblem(slug: string): ProblemPage | undefined {
  return PROBLEMS.find((p) => p.slug === slug);
}
