/**
 * Vertical-specific compliance framework anchors for the AI Policy
 * Generator. Each block is injected into the system prompt so the model
 * drafts a policy that references the actual regulatory regime the
 * firm operates under — not a generic boilerplate.
 *
 * Sources are deliberately conservative: ABA Model Rules + Formal
 * Opinion 512 for legal, AICPA Code of Professional Conduct + SSARS for
 * CPA, EEOC + state employment law for HR, FTC AI disclosure guidance
 * for marketing. The model is told to cite these by name where
 * relevant; nothing is fabricated.
 */

export type Vertical = "legal" | "cpa" | "hr" | "marketing" | "consulting" | "other";

export const VERTICAL_LABELS: Record<Vertical, string> = {
  legal: "Law firm",
  cpa: "CPA / accounting firm",
  hr: "HR advisory firm",
  marketing: "Marketing agency",
  consulting: "Consulting firm",
  other: "Professional services firm",
};

export const FRAMEWORK_PROMPTS: Record<Vertical, string> = {
  legal: `
TARGET FIRM: Law firm (boutique to mid-size, US-licensed attorneys).

GOVERNING FRAMEWORKS the policy MUST reference and structure itself around:

1. ABA Model Rules of Professional Conduct, especially:
   - Rule 1.1 (Competence) — including the 2012 Comment 8 "technological
     competence" duty.
   - Rule 1.6 (Confidentiality of Information) — client confidences must
     not be disclosed to a third-party AI vendor without informed consent
     or a reasonable expectation of non-disclosure.
   - Rule 5.1 / 5.3 (Supervision) — partners are responsible for the
     conduct of associates and non-lawyer assistants, including AI tools.
   - Rule 3.3 (Candor toward the Tribunal) — fabricated AI citations are
     a Rule 3.3 violation.
   - Rule 1.5 (Fees) — time billed for AI-accelerated work must reflect
     actual time, not the time the work would have taken manually.

2. ABA Formal Opinion 512 (July 2024) — Generative AI tools. The policy
   must reference the four duties Opinion 512 emphasizes:
   (a) competence in selecting and using the tool;
   (b) confidentiality (no client info into tools that train on inputs
       or that lack adequate confidentiality terms);
   (c) communication with the client about AI use where material;
   (d) reasonable fees that reflect actual effort and supervision.

3. State Bar variations — note that some state bars (NY, CA, FL) have
   issued their own ethics opinions on AI; the policy must instruct
   the firm to verify their specific jurisdiction's stance and update
   the policy accordingly. Do not assume one state's rules apply
   nationally.

4. Court-specific standing orders — several federal judges now require
   disclosure of AI use in filings (Mata v. Avianca fallout). The
   policy must include a "verify court orders before filing" clause.

POLICY MUST INCLUDE these vertical-specific sections:
  - "Permitted AI uses for legal work" (research, drafting,
    summarization) with explicit guardrails on each.
  - "Prohibited uses" — uploading privileged content to consumer tools
    without enterprise terms; relying on AI citations without
    independent verification; signing AI-drafted advice without
    attorney review.
  - "Client consent and engagement letter language" — when material AI
    use must be disclosed to a client.
  - "Supervision and review workflow" — every AI-touched work product
    must be reviewed by a licensed attorney before it leaves the firm.
  - "Verification of citations" — explicit duty to verify every case,
    statute, and quotation produced by an AI tool.
  - "Court filings disclosure" — check each court's standing order
    before filing any AI-assisted document.
`,

  cpa: `
TARGET FIRM: CPA / accounting / bookkeeping firm (boutique to mid-size,
US-licensed CPAs or EAs).

GOVERNING FRAMEWORKS the policy MUST reference and structure itself around:

1. AICPA Code of Professional Conduct, especially:
   - ET 1.300.001 (Integrity and Objectivity) — AI output must not be
     used to override the CPA's professional judgment.
   - ET 1.400 (Acts Discreditable) — using AI in a way that produces
     inaccurate financial information is potentially discreditable.
   - ET 1.700.001 (Confidential Client Information) — client financial
     data is confidential; cannot be disclosed to AI vendors who use it
     for model training or who lack adequate data-protection terms.
   - ET 1.295 (Nonattest Services) — if AI is used in attest engagements,
     the firm must consider independence implications.

2. SSARS (Statements on Standards for Accounting and Review Services)
   and SSAE (Statements on Standards for Attestation Engagements) —
   for any compilation, review, or attestation work, AI cannot
   substitute for the analytical procedures and inquiries the
   standards require.

3. PCAOB rules — if the firm performs audits of public companies, AI
   use is subject to additional PCAOB documentation and supervision
   requirements (AS 1015, AS 1201, AS 2110).

4. IRS Circular 230 — for tax practitioners, AI cannot relieve the
   preparer of due diligence duties under §10.22 (knowledge of client's
   omission) or §10.35 (covered opinions).

5. State Board of Accountancy variations — each state has its own
   rules. The policy must note that the firm's resident state board's
   rules govern.

6. SEC, GAAP/IFRS — any AI-generated financial statement language
   must be reviewed for GAAP/IFRS compliance.

POLICY MUST INCLUDE these vertical-specific sections:
  - "Permitted AI uses" — research, drafting client communications,
    organizing data, drafting workpaper narratives. Each with guardrails.
  - "Prohibited uses" — using AI to perform attest-level analytical
    procedures, signing tax returns prepared solely by AI, uploading
    client data to consumer AI tools without enterprise terms.
  - "Independence and objectivity" — when AI use must be disclosed
    internally and to engagement quality reviewers.
  - "Workpaper documentation" — every AI-assisted analysis must be
    documented in the workpapers with the prompt, the output, and the
    reviewer's verification.
  - "Tax return preparation" — Circular 230 duties survive any AI use;
    the preparer remains responsible for accuracy.
  - "Client data handling" — what may and may not be uploaded; data
    retention and deletion expectations from the vendor.
`,

  hr: `
TARGET FIRM: HR advisory firm or fractional HR consultancy.

GOVERNING FRAMEWORKS the policy MUST reference and structure itself around:

1. EEOC AI guidance (May 2023 update) — disparate impact in AI-driven
   employment decisions. The policy must address how the firm's AI use
   on behalf of client employers does not produce protected-class
   disparate impact in screening, ranking, or termination decisions.

2. Applicable state laws on automated employment decision tools:
   - NYC Local Law 144 — bias audit and notice requirements for
     automated employment decision tools.
   - Illinois AI Video Interview Act.
   - California (proposed and enacted regs) on automated decision
     systems in employment.
   - Colorado AI Act (2024).

3. ADA — AI tools used in hiring or accommodations review must not
   screen out qualified individuals with disabilities.

4. Federal labor laws — NLRA, FLSA, FMLA. AI used in workforce
   analytics cannot violate concerted activity protections or
   misclassify exempt/non-exempt status.

5. Multi-state employment compliance — the firm advises clients across
   states, each with its own employment law regime. The policy must
   note that the AI's output is jurisdiction-sensitive and must be
   reviewed by counsel licensed in the relevant state for any
   material employment decision.

6. Confidentiality — employee health information (ADA-protected),
   medical leave info (FMLA), and pay data (state pay-transparency
   laws) are sensitive categories that cannot be uploaded to
   consumer AI tools.

POLICY MUST INCLUDE these vertical-specific sections:
  - "Permitted AI uses" — drafting policy language, summarizing
    handbook updates, drafting non-decision communications, research.
  - "Prohibited uses" — using AI as the sole basis for any adverse
    employment decision (hiring, termination, discipline, compensation,
    accommodation denial); uploading PHI or medical leave records.
  - "Bias review" — any AI screening tool used at a client's direction
    must be subjected to a bias audit consistent with NYC Local Law 144
    or analogous state requirements where applicable.
  - "Disclosure to candidates / employees" — when state law requires
    notice of automated decision-tool use.
  - "Documentation of human review" — every employment-decision-adjacent
    AI output must show the human reviewer who made the final call.
`,

  marketing: `
TARGET FIRM: Marketing agency or boutique creative shop serving B2B or B2C
clients.

GOVERNING FRAMEWORKS the policy MUST reference and structure itself around:

1. FTC AI guidance — the FTC has been clear (since the 2023 "Keep your
   AI claims in check" guidance and the 2024 "AI Comply" sweep) that:
   - AI-generated endorsements and testimonials must not deceive
     consumers about whether a real person endorsed the product.
   - AI tools cannot be used to generate fake reviews.
   - Material connections (paid placements, AI-generated content
     presented as organic) must be disclosed.
   - The FTC Endorsement Guides and §5 of the FTC Act apply equally
     to AI-generated marketing content.

2. Copyright and attribution — AI training on copyrighted works is
   unsettled law. The policy must address:
   - Whether the firm uses AI to generate images, video, or text in
     deliverables that the client will own.
   - The firm's representation to the client about ownership and
     non-infringement.
   - Attribution requirements (some platforms require disclosure of
     AI-generated content; many client brand guidelines do too).

3. Client confidentiality and competitive separation — agencies often
   serve competing clients in adjacent verticals. AI tools that train
   on inputs can leak one client's strategy into another's outputs.

4. CCPA, GDPR, and state privacy laws — campaign data may include
   personal information; AI vendors must have adequate processing
   terms (DPAs, SCCs where applicable).

5. Platform-specific rules — Meta, Google, LinkedIn, X all have their
   own evolving rules on AI-generated ad creative. The policy must
   instruct the team to check each platform's current rules before
   publishing.

POLICY MUST INCLUDE these vertical-specific sections:
  - "Permitted AI uses" — ideation, first drafts, image references,
    summarization of research.
  - "Prohibited uses" — generating fake testimonials, fabricating
    customer quotes, passing off AI-generated images as photographs of
    real customers, generating ad creative that violates platform
    rules.
  - "Client disclosure" — when material AI use must be disclosed in
    the SOW or deliverable.
  - "Copyright and ownership" — what the firm represents to the
    client about who owns AI-generated work.
  - "Competitive separation" — no client A's strategy or assets in
    AI tools that may surface for client B.
  - "FTC disclosure requirements" — endorsement guides, material
    connections, AI-generated claims.
`,

  consulting: `
TARGET FIRM: General management or boutique consulting firm.

GOVERNING FRAMEWORKS the policy MUST reference and structure itself around:

1. Client confidentiality — most consulting engagements include a
   broad NDA. Uploading client strategy, financials, or proprietary
   processes to AI tools that train on inputs likely violates the NDA.

2. IP boundaries — work product ownership clauses in consulting MSAs
   typically assign deliverables to the client. AI-assisted work
   should not embed third-party IP the firm cannot assign.

3. Sector-specific overlays — if the firm consults to regulated
   industries (financial services, healthcare, defense, energy), the
   client's regulatory regime flows through to the firm's AI use.
   The policy must instruct the team to identify the client's regime
   and apply its rules.

4. Conflicts of interest — across multiple clients in the same
   industry, AI tools that train on inputs can create indirect
   information leakage that creates a conflict.

5. SOC 2 / ISO 27001 — firms with such certifications must use AI
   vendors whose data handling does not break the certification's
   information-security controls.

POLICY MUST INCLUDE these vertical-specific sections:
  - "Permitted AI uses" — research, drafting, structuring analysis,
    summarization of public materials.
  - "Prohibited uses" — uploading client confidential information to
    tools that train on inputs; using AI output as the sole basis for
    a material recommendation without partner review.
  - "Client disclosure" — when the SOW or engagement letter must
    reference AI use.
  - "Sector overlays" — explicit instruction to identify the client's
    regulatory regime before AI use.
  - "Conflicts of interest" — separation of AI workspaces between
    competing client engagements.
  - "Deliverable ownership" — what is and is not represented to the
    client about AI-generated content in deliverables.
`,

  other: `
TARGET FIRM: Professional services firm (vertical not specifically called out).

The policy should follow generally accepted AI governance principles
for professional services firms:

1. Client confidentiality — no confidential information to AI tools
   that train on inputs or lack adequate data-protection terms.
2. Professional responsibility — AI cannot substitute for the
   professional's judgment; outputs must be reviewed by a qualified
   human before reaching the client.
3. Accuracy and verification — every factual claim, citation, or
   number produced by AI must be independently verified.
4. Disclosure — when AI use is material to the deliverable, the
   firm should consider whether the engagement letter or final
   deliverable should disclose it.
5. Supervision — partners are responsible for the AI use of
   associates and staff.
6. Data handling — what categories of data may and may not be
   uploaded; how vendor terms are reviewed.
7. Sector overlays — if the firm operates in any regulated industry,
   the regulatory regime governs.

The policy must instruct the firm to consult with their professional
association, regulator, or counsel to confirm any vertical-specific
rules that apply.
`,
};

export const APPROVAL_WORKFLOW_LABELS: Record<string, string> = {
  partner_approved: "Partner-approved per use",
  blanket: "Blanket policy (pre-approved categories of use)",
  case_by_case: "Case-by-case approval",
  prohibited_client_facing: "Prohibited for client-facing work",
};

export const DISCLOSURE_LABELS: Record<string, string> = {
  always: "Always disclose AI use to clients",
  on_request: "Disclose AI use on client request",
  internal_only: "Internal-only awareness (no client disclosure by default)",
  undecided: "Undecided — policy should recommend",
};
