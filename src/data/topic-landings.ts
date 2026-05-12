/**
 * Topic-landing configs — three SNS-traffic conversion pages.
 *
 * Each entry powers a route at /{slug} (not /for/{slug}; these are
 * topic pages, not vertical pages). The shared renderer lives at
 * src/components/landing/topic-landing-page.tsx and mirrors the
 * boutique-vertical layout but with these structural differences:
 *
 *  - the page is anchored around a single thesis (not a vertical pain),
 *  - the "what good looks like" block enumerates the four reusable
 *    objects (source / review state / client context / handoff)
 *    instead of a workflow grid,
 *  - the CTA points at /api/early-access with a `workflow_pain` field
 *    (free text) so the conversion event captures qualitative signal
 *    for the operator,
 *  - the page surfaces 2-4 public source URLs at the bottom rather
 *    than Reddit verbatims (the topic pages are linked from LinkedIn
 *    posts that are themselves citing these sources).
 *
 * Honesty constraints (matched to .claude/rules + recent commit
 * history that scrubbed fabricated pilot claims):
 *  - never reference "5 firms in pilot" / "140-client design partner",
 *  - allowed commercial claim: "$15/client/month at launch",
 *  - pre-launch framing: "looking for the first design partners in
 *    the 50–200 client range".
 */

export interface TopicPainBullet {
  /** Short clause that names a concrete failure mode. */
  title: string;
  /** 1-2 sentences explaining the failure. */
  body: string;
}

export interface ReusableObject {
  /** One of: Source, Review state, Client context, Handoff. */
  name: string;
  /** Plain-English explanation of what this preserves. */
  description: string;
}

export interface TopicFaq {
  question: string;
  answer: string;
}

export interface TopicSource {
  label: string;
  url: string;
}

export interface TopicLanding {
  /** URL slug at the site root. */
  slug: string;
  /** Used as the `landing_variant` value on /api/early-access. */
  landingVariant: string;
  /** Eyebrow text above the H1. */
  kicker: string;
  /** H1. */
  heroTitle: string;
  /** Short subhead under the H1. */
  heroSubtitle: string;
  /** First paragraph — AEO standalone answer. */
  leadParagraph: string;
  /** 3 bullets of problem teardown. */
  painBullets: TopicPainBullet[];
  /** One paragraph stating the AI workflow principle. */
  workflowPrinciple: string;
  /** Heading for the reusable-objects block. */
  reusableObjectsHeading: string;
  /** The four reusable objects (source / review / context / handoff). */
  reusableObjects: ReusableObject[];
  /** Soft Practiq context paragraph. */
  practiqContext: string;
  /** CTA button label. */
  ctaLabel: string;
  /** Smaller text above the form. */
  formIntro: string;
  /** Internal cross-link labels (2 sibling slugs). */
  siblings: [string, string];
  /** Meta title. */
  metaTitle: string;
  /** Meta description (150-160 chars). */
  metaDescription: string;
  /** Keywords for the keywords meta + OG. */
  keywords: string[];
  /** Question-style H2s for AEO. */
  faqs: TopicFaq[];
  /** Public sources cited at the bottom. */
  sources: TopicSource[];
}

export const TOPIC_LANDINGS: Record<string, TopicLanding> = {
  "professional-services-ai-evidence-layer": {
    slug: "professional-services-ai-evidence-layer",
    landingVariant: "professional-services-ai-evidence-layer",
    kicker: "For boutique professional services firms",
    heroTitle:
      "Boutique professional-services AI needs an evidence layer, not just a stronger model.",
    heroSubtitle:
      "The cost of an AI draft has collapsed. The cost of a reviewable, citable, defensible piece of work has not. The wedge is the evidence layer around the draft, not the draft itself.",
    leadParagraph:
      "Boutique professional services firms — CPAs, lawyers, HR advisors, marketing strategists, consultants — do not actually sell drafts. They sell judgement that survives review, audit, and a difficult client conversation six months later. A useful AI workflow for these firms preserves four reusable objects on every output: the underlying source, the current review state, the client-specific context, and the handoff between people. \"A better answer\" without those four is not an upgrade; it is a faster way to lose the audit trail.",
    painBullets: [
      {
        title: "AI output is cheap. Reviewable work is scarce.",
        body:
          "Any model can produce a 90%-good draft of a memo, a contract clause, a campaign plan, a comp band. None of them, by default, produce a draft that a partner can sign their name to without re-doing the underlying check. The gap between \"the model wrote it\" and \"the firm can defend it\" is where the work still lives.",
      },
      {
        title: "Generated text without provenance is a liability, not an asset.",
        body:
          "If a recommendation cannot be traced back to the specific source, the specific client situation, and the specific person who last touched it, the firm is one bad audit, malpractice claim, or unhappy client away from owning a problem the AI vendor will not own with them.",
      },
      {
        title: "More drafts is not the bottleneck. Trust is.",
        body:
          "Practitioners across CPA, law, HR, and consulting describe the same shape of pain: it is not that they cannot generate work, it is that every new piece of work needs to be reconciled against everything the firm has previously told this client. AI that ignores that reconciliation work is selling a feature, not a workflow.",
      },
    ],
    workflowPrinciple:
      "Useful professional-services AI is judged on what it preserves, not what it generates. Every output should arrive with its source attached, a current review state, the client-specific context that produced it, and a clean handoff path to the next person who will touch it. Generation is the cheap part. Preservation is the moat.",
    reusableObjectsHeading: "What good looks like",
    reusableObjects: [
      {
        name: "Source",
        description:
          "Every claim, number, and clause links back to the document, transaction, statute, or prior decision that produced it. \"The model said\" is never a source.",
      },
      {
        name: "Review state",
        description:
          "Every output knows whether it is a first draft, a partner-reviewed version, a client-approved version, or a stale artifact. Status survives across people and across days off.",
      },
      {
        name: "Client context",
        description:
          "Every recommendation is conditioned on the specific client's prior decisions, idiosyncrasies, and stated preferences — not on the average client in the model's training data.",
      },
      {
        name: "Handoff",
        description:
          "When a junior associate rolls onto the engagement, or a partner steps in to sign, the next person inherits the full chain — source, review state, client context — without a 45-minute briefing call.",
      },
    ],
    practiqContext:
      "Practiq is the workspace we are building for boutique professional services firms — 2–10 people, 50–200 clients — that need an AI workflow with the evidence layer attached. Pre-launch, looking for the first design partners in that 50–200 client range. $15/client/month at launch. No annual contract.",
    ctaLabel: "Request a 15-minute workflow audit",
    formIntro:
      "Tell us what you are seeing. We read every response and reply within 24 hours. If it is not a fit we say so.",
    siblings: ["legal-ai-review-workflow", "client-context-memory"],
    metaTitle:
      "Professional-services AI needs an evidence layer — Practiq",
    metaDescription:
      "Boutique CPA, legal, HR, and consulting firms don't need stronger AI drafts — they need an evidence layer that preserves source, review state, client context, and handoff.",
    keywords: [
      "professional services AI",
      "AI evidence layer",
      "boutique professional services AI",
      "AI workflow review trail",
      "AI provenance professional services",
      "reviewable AI output",
      "AI audit trail",
      "AI for CPA law HR consulting",
    ],
    faqs: [
      {
        question:
          "Why is an evidence layer more important than a better model for boutique professional-services firms?",
        answer:
          "Because the firm's product is judgement that survives review, not a draft. A 5% better draft from a 5% better model still has to be reconciled by hand against the client's prior decisions, the firm's playbook, and whatever the partner signed off on last quarter. The evidence layer — source, review state, client context, handoff — is the part that determines whether the firm can defend the work. Model quality has already passed the bar where it is the binding constraint.",
      },
      {
        question:
          "What does \"preserves source\" actually mean in a CPA, legal, HR, or consulting context?",
        answer:
          "It means every figure on a memo links to the underlying transaction or document, every clause cites the controlling rule or the prior contract, every comp recommendation cites the survey or the firm's prior position, and every campaign claim cites the brand's documented voice or the client's audience hypothesis. The reviewer should never have to ask \"where did this come from\" — the page already shows them.",
      },
      {
        question:
          "Why is generating more drafts not the bottleneck?",
        answer:
          "Because firms are not constrained by drafting speed; they are constrained by the per-client reconciliation tax that every new draft creates. Producing five times as many drafts without an evidence layer produces five times as much reconciliation work — net negative. The bottleneck moves only when the next draft arrives already reconciled.",
      },
      {
        question:
          "How is this different from \"AI with citations\"?",
        answer:
          "Citations are necessary but not sufficient. An evidence layer also tracks review state (who has approved this and when), client-specific context (why the recommendation is tuned for this client), and the handoff (who picks it up next and what they need). Citations alone solve the \"where did this fact come from\" problem and leave the other three problems open.",
      },
    ],
    sources: [
      {
        label: "McKinsey — The state of AI",
        url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
      },
      {
        label:
          "Thomson Reuters — Generative AI in professional services 2025",
        url: "https://www.thomsonreuters.com/en-us/posts/technology/genai-professional-services-report-2025/",
      },
    ],
  },

  "legal-ai-review-workflow": {
    slug: "legal-ai-review-workflow",
    landingVariant: "legal-ai-review-workflow",
    kicker: "For boutique law firms",
    heroTitle:
      "Legal AI is useful only when the review trail survives the first draft.",
    heroSubtitle:
      "Lawyers are accountable for competence, confidentiality, communication, and supervision. None of those duties evaporate when an AI tool produces the first draft. Useful legal AI preserves the diff, the provenance, the matter boundary, and the review status — so a partner can sign their name to it.",
    leadParagraph:
      "Useful legal AI for a small or boutique firm is not a better answer box. It is a workflow in which every output keeps four things alive: the diff against the firm's prior position on similar language, the provenance back to the cited authority, the boundary between matters, and the current review status. ABA Formal Opinion 512 made the duties explicit — competence, confidentiality, communication, and supervision are all still on the attorney even when a generative tool is in the loop. A tool that strips those four objects out of the workflow is not a productivity tool for the firm; it is a malpractice exposure for the partner.",
    painBullets: [
      {
        title: "An AI draft with no diff is not a redline — it's a guess.",
        body:
          "Boutique law firms negotiate against their own prior positions every week. A redline that cannot show how the new language diverges from the firm's last 20 letters of the same matter type is not actually reviewing anything; it is generating fresh text and calling it review.",
      },
      {
        title: "Citations without provenance are a Rule 11 problem waiting to happen.",
        body:
          "Hallucinated authorities are not a hypothetical anymore — they are in published sanctions orders. \"The model cited it\" is not a defense. The output has to link to the actual source, and the firm has to be able to confirm at a glance that the citation has been verified.",
      },
      {
        title: "Matter context does not live in chat history.",
        body:
          "A useful legal workspace knows that this matter has these parties, these prior pleadings, this opposing-counsel behavior pattern, and this client's tone. A general AI tool that loses that context every session is not absorbing the firm's work — it is making the firm re-explain itself every time it logs in.",
      },
    ],
    workflowPrinciple:
      "Useful legal AI preserves the review trail before, during, and after the draft. Every clause shows the diff against the firm's playbook. Every authority links to the actual source. Every output knows which matter it belongs to and what its review status is. The attorney's job is judgement and signature; the tool's job is to make that judgement defensible.",
    reusableObjectsHeading: "What good looks like in a legal workflow",
    reusableObjects: [
      {
        name: "Source",
        description:
          "Every cited authority links to the controlling case, statute, regulation, or firm precedent. The attorney can confirm the citation in one click and never has to take the model's word for it.",
      },
      {
        name: "Review state",
        description:
          "Every output knows whether it is a first draft, an associate-reviewed version, a partner-reviewed version, or a sent version. No more guessing whether the .docx in someone's downloads is the latest.",
      },
      {
        name: "Client context",
        description:
          "Every matter carries its parties, prior pleadings, deadlines, opposing-counsel behavior, and the client's preferred tone. Switching matters takes one click and lands the attorney already oriented.",
      },
      {
        name: "Handoff",
        description:
          "When a partner steps in to sign, or an associate rolls off, the next person inherits the full matter context and review state. The work does not regress because someone took a vacation.",
      },
    ],
    practiqContext:
      "Practiq is the workspace we are building for boutique law firms — solo to 20 attorneys, 30–200 active matters — that want an AI workflow with the review trail attached. Pre-launch, looking for the first design partners in that range. $15/client/month at launch. No annual contract.",
    ctaLabel: "Talk through this workflow",
    formIntro:
      "Describe the workflow you are trying to make defensible. We read every response and reply within 24 hours.",
    siblings: ["professional-services-ai-evidence-layer", "client-context-memory"],
    metaTitle: "Legal AI review workflow — Practiq for boutique law firms",
    metaDescription:
      "Legal AI is useful only when the review trail survives the first draft. Diff, provenance, matter boundary, and review status — the workflow boutique law firms actually need.",
    keywords: [
      "legal AI review workflow",
      "AI for boutique law firms",
      "small law firm AI",
      "legal AI provenance",
      "ABA Opinion 512 AI",
      "legal AI citations",
      "matter context AI",
      "law firm AI redline",
    ],
    faqs: [
      {
        question:
          "Does ABA Formal Opinion 512 say lawyers cannot use generative AI?",
        answer:
          "No. Opinion 512 says lawyers can use generative AI but remain responsible for competence, confidentiality, communication with the client, supervision of the tool's output, and reasonable fees. The duties do not move to the vendor when the vendor's model produces a draft. A useful legal AI workflow is one in which discharging those four duties is easier with the tool than without it — because the tool is preserving the review trail the attorney would otherwise have to reconstruct by hand.",
      },
      {
        question:
          "What does it mean for a legal AI tool to \"preserve the diff\"?",
        answer:
          "It means that when the tool drafts a clause, it shows how that clause differs from the firm's prior position on similar language — not just the marked-up version against this counterparty's draft. The attorney is reviewing the firm's exposure, not just the counterparty's redline. Without that diff, the tool is generating language; with it, the tool is doing redline review the way the firm actually does it.",
      },
      {
        question:
          "Why is matter boundary a workflow problem and not just a permissions problem?",
        answer:
          "Permissions stop the wrong person from opening the wrong file. Matter boundary, as a workflow concept, stops one matter's context from contaminating the model's reasoning on a different matter. A tool that pools every matter into a single chat session is technically secure and practically a mess: the attorney has to keep re-grounding every prompt, and the audit trail collapses across matters.",
      },
      {
        question:
          "How is Practiq different from a tool built for AmLaw firms?",
        answer:
          "AmLaw tools assume teams of dozens on a single matter, large managed-document review, and seat-based pricing structured for 500-attorney firms. Boutique firms have a different shape: solo to 20 attorneys, 30–200 active matters, partner-led work, monthly billing. The workflow primitives — diff against the firm's own playbook, provenance to source, matter-scoped context, handoff between two or three people — are the boutique-firm version of the same evidence layer, designed for the size of firm that does most of the legal work in the US.",
      },
    ],
    sources: [
      {
        label: "ABA Formal Opinion 512 — Generative AI tools",
        url: "https://www.americanbar.org/news/abanews/aba-news-archives/2024/07/aba-issues-first-ethics-guidance-ai-tools/",
      },
      {
        label:
          "Thomson Reuters — Generative AI in professional services 2025",
        url: "https://www.thomsonreuters.com/en-us/posts/technology/genai-professional-services-report-2025/",
      },
    ],
  },

  "client-context-memory": {
    slug: "client-context-memory",
    landingVariant: "client-context-memory",
    kicker: "For boutique client-service firms",
    heroTitle:
      "Client-service AI becomes useful when client context stops being reconstructed from scratch.",
    heroSubtitle:
      "The hidden tax on boutique professional-services work is not drafting — it is reconstructing the same client's history, source packets, assumptions, and next-step ownership every time someone re-enters the file. AI that keeps that context alive across engagements is the part that compounds.",
    leadParagraph:
      "Every engagement at a boutique CPA, law, HR, marketing, or consulting firm pays a quiet tax. The senior person re-reads last quarter's memo. The associate hunts for the source packet that produced the recommendation. Someone tries to remember whose turn it was to follow up. Portals and inboxes hold fragments — none of them hold the whole story of the client. Useful AI for these firms is not the model that writes the next paragraph fastest; it is the workspace where the client's freshness, source, review state, and client-specific constraints already live, so the next person to touch the file lands in the right context immediately.",
    painBullets: [
      {
        title:
          "Client history gets reconstructed by the most expensive person in the room.",
        body:
          "The partner re-reads three memos to remember why the firm landed where it landed last time. That re-reading happens on every engagement, every quarter, on a senior billing rate. It is invisible in the time sheet and very expensive over a year.",
      },
      {
        title: "Source packets live in inboxes and Dropbox folders.",
        body:
          "The bank statement that produced the figure, the email thread that produced the agreement, the prior version of the policy — these are scattered across systems that do not know they belong to the same client. \"Send me the file\" is a multi-hour project, not a click.",
      },
      {
        title: "Handoffs lose the assumptions.",
        body:
          "When a junior takes over, or a partner steps in to sign, the assumptions that produced the firm's prior recommendation are not in the document — they are in the head of whoever last touched it. If that person is unavailable, the firm is improvising.",
      },
    ],
    workflowPrinciple:
      "Client memory that survives handoff is the asset that compounds. The AI's job is not to remember everything for the firm — it is to make sure that what the firm already decided, the source it cited, the review state of the artifact, and the client-specific constraint that bounded the work are all still there, fresh, the next time anyone opens the file.",
    reusableObjectsHeading: "What client memory should preserve",
    reusableObjects: [
      {
        name: "Source",
        description:
          "Every fact in the client file is linked back to the document, transaction, statute, or prior decision that produced it. The next person can verify, not just trust.",
      },
      {
        name: "Review state",
        description:
          "Every artifact knows whether it is a draft, an internally reviewed version, a client-approved version, or a stale leftover. Freshness is part of the file, not a guess.",
      },
      {
        name: "Client context",
        description:
          "The client's stated preferences, hard constraints, idiosyncrasies, and prior decisions live with the file. The recommendation is tuned for this client, not the average one.",
      },
      {
        name: "Handoff",
        description:
          "When the next person picks up the engagement, they inherit the source, the review state, and the client context together. The work continues; it does not restart.",
      },
    ],
    practiqContext:
      "Practiq is the workspace we are building so client context stops being reconstructed every engagement. Boutique professional services firms — 2–10 people, 50–200 clients — across CPA, law, HR advisory, marketing, and consulting. Pre-launch, looking for the first design partners. $15/client/month at launch. No annual contract.",
    ctaLabel: "Request a workflow audit",
    formIntro:
      "Tell us where the context keeps getting reconstructed. We read every response and reply within 24 hours.",
    siblings: ["professional-services-ai-evidence-layer", "legal-ai-review-workflow"],
    metaTitle: "Client-context memory for boutique professional services — Practiq",
    metaDescription:
      "Boutique CPA, legal, HR, and consulting firms lose hours every engagement reconstructing client history. AI client memory that preserves source, review state, context, and handoff.",
    keywords: [
      "client context memory AI",
      "boutique professional services AI",
      "client memory workspace",
      "AI handoff workflow",
      "client history AI",
      "CPA law HR consulting AI workspace",
      "professional services AI memory",
      "AI client file context",
    ],
    faqs: [
      {
        question: "Why is client memory the asset that compounds for a boutique firm?",
        answer:
          "Because a boutique firm's actual value is judgement that is conditioned on the specific client — their constraints, prior decisions, and idiosyncrasies. When that context evaporates between engagements, every engagement starts from a worse baseline than the firm has actually earned. When the context survives, every engagement starts from the firm's strongest position. The asset is not a model; the asset is the accumulated client-specific context that the model can reason over.",
      },
      {
        question:
          "Isn't this what a CRM does?",
        answer:
          "A CRM stores contact records and pipeline stages. Client memory in the sense we mean — source linkage, review state of each artifact, the constraints that produced each prior decision, the handoff chain — is workflow data, not contact data. CRMs are not built for that, which is why every boutique firm we have spoken to has a CRM and still ends up reconstructing context from inboxes and folders.",
      },
      {
        question:
          "What stops AI memory from going stale?",
        answer:
          "Stale memory is the right thing to be paranoid about. The discipline is to track freshness on every fact (when it was captured, when it was last confirmed), tie every claim back to a source the firm can re-verify in one click, and surface review state on every artifact so nobody confuses last quarter's draft for this quarter's truth. \"AI remembers\" is the start of the problem; \"AI remembers with a freshness stamp and a source link\" is the answer.",
      },
      {
        question:
          "How is this different from giving ChatGPT a custom system prompt with client info?",
        answer:
          "A custom prompt is one snapshot. A useful workspace tracks the snapshot, but also tracks every output produced against that snapshot, the review state of those outputs, the source linkage of every claim, and the handoff between the people who touched the file. The custom prompt is a chair; the workspace is the room the chair sits in.",
      },
    ],
    sources: [
      {
        label:
          "Thomson Reuters — Generative AI in professional services 2025",
        url: "https://www.thomsonreuters.com/en-us/posts/technology/genai-professional-services-report-2025/",
      },
      {
        label: "McKinsey — The state of AI",
        url: "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai",
      },
    ],
  },
};

export const TOPIC_LANDING_SLUGS = Object.keys(TOPIC_LANDINGS);
