#!/usr/bin/env node
/**
 * Generate the sample documents in public/samples/.
 *
 * These ship with the site so the empty-state CTA "try a workflow with
 * sample data" can hand the operator a realistic file to upload. They
 * are intentionally generic and obviously fictional — no real client
 * names, no real numbers.
 *
 * Run:
 *   node scripts/generate-sample-documents.mjs
 *
 * Outputs:
 *   public/samples/sample-engagement-letter-cpa.docx
 *   public/samples/sample-engagement-letter-law.docx
 *   public/samples/sample-onboarding-template.docx
 *   public/samples/sample-creative-brief.docx
 *   public/samples/sample-trial-balance.csv
 */

import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "samples");

await mkdir(OUT_DIR, { recursive: true });

function letterDoc(title, paragraphs) {
  const doc = new Document({
    creator: "Practiq",
    title,
    description: "Sample document for Practiq onboarding — fictional content.",
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: title, bold: true })],
          }),
          new Paragraph({ text: "" }),
          ...paragraphs.map(
            (p) =>
              new Paragraph({
                children: [new TextRun(p)],
                spacing: { after: 200 },
              }),
          ),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

const cpa = await letterDoc("Engagement Letter — Tax Preparation Services", [
  "Dear Sample Client,",
  "Thank you for choosing Sample CPA Firm to provide tax preparation services for tax year 2025. This letter confirms our understanding of the terms of the engagement and the nature and limitations of the services we will provide.",
  "Scope of services: We will prepare your federal and state income tax returns from information you provide. We will not audit or otherwise verify the data you submit, although we may ask for clarification of some items.",
  "Client responsibilities: You are responsible for the accuracy and completeness of all information provided to us, including the maintenance of adequate records and an internal-control structure.",
  "Fees: Our professional fees for these services will be based on the time required at our standard hourly rates plus out-of-pocket expenses. Fees are due upon presentation of our invoice.",
  "Confidentiality: We will not disclose any confidential information about you to outside parties without your express written consent, except as required by law.",
  "If the foregoing is in accordance with your understanding, please sign a copy of this letter in the space provided and return it to us.",
  "Sincerely, Sample CPA Firm",
]);
await writeFile(join(OUT_DIR, "sample-engagement-letter-cpa.docx"), cpa);

const law = await letterDoc("Engagement Letter — Legal Representation", [
  "Dear Sample Client,",
  "Thank you for retaining Sample Law Firm. This letter sets forth the terms under which the firm will represent you in connection with the matter described below.",
  "Scope of representation: We have been retained to represent you in the matter of contract review and negotiation for the proposed services agreement dated 2026. Representation is limited to that matter and does not extend to related disputes unless agreed in writing.",
  "Fees and billing: Legal services will be billed at the firm's standard hourly rates. Invoices will be issued monthly and are payable within thirty (30) days. A retainer of $2,500 is required upon signing.",
  "Conflicts of interest: We have performed a conflicts check and identified no conflicts that would prevent representation. If a conflict arises during the engagement, we will notify you immediately.",
  "Termination: Either party may terminate this engagement at any time on written notice. Upon termination, you remain responsible for fees and costs incurred through the termination date.",
  "Please sign and return one copy of this letter to confirm your acceptance of the terms above.",
  "Very truly yours, Sample Law Firm",
]);
await writeFile(join(OUT_DIR, "sample-engagement-letter-law.docx"), law);

const hr = await letterDoc("New Hire Onboarding — Template", [
  "Welcome to Sample Company.",
  "This onboarding template captures the standard items completed during the first 30 days of employment. Use it as a starting point and adapt for the role.",
  "Week 1 — Setup. Complete I-9 and W-4. Configure email, Slack, and HRIS access. Review the employee handbook and acknowledge receipt. Schedule introductions with your direct manager and immediate team.",
  "Week 2 — Role context. Read the team's quarterly goals. Review the last three completed projects to learn the team's working style. Schedule a 1:1 with your skip-level manager.",
  "Week 3 — First contributions. Pick up your first scoped task. Submit your first deliverable for review. Begin contributing to the team's standing meeting.",
  "Week 4 — Feedback. 30-day check-in with your manager. Review benefits enrollment deadlines. Set 60- and 90-day goals.",
  "Manager checklist: prepare workstation, set up calendar invites for 1:1s, identify a buddy, and schedule a 30-day review.",
]);
await writeFile(join(OUT_DIR, "sample-onboarding-template.docx"), hr);

const brief = await letterDoc("Creative Brief — Brand Refresh", [
  "Project: Sample Client — Brand Refresh, Phase 1.",
  "Background: Sample Client is a 12-year-old direct-to-consumer brand seeking to modernize its visual identity ahead of a 2026 product launch. The current logo and palette were designed in 2014 and feel dated relative to category competitors.",
  "Objectives: Establish a refreshed identity system (logo, type, color, voice) that signals innovation while preserving brand equity. Deliverables include the primary logo, secondary marks, type system, color palette, and a one-page brand voice guide.",
  "Audience: Primary — existing customers (35-55, professional, brand-loyal). Secondary — net-new prospects (28-45, design-aware, comparison shoppers).",
  "Tone and feel: Confident, modern, restrained. Not playful. Not corporate. Reference brands include those in the premium-mid market with strong typographic systems.",
  "Constraints: Must work in single color (mono) at 16px favicon size. Must remain legible on dark and light backgrounds. Final files in SVG, PNG, and brand book in PDF.",
  "Timeline: Discovery (2 weeks). Concepts (3 weeks, two rounds). Refinement and final delivery (3 weeks). Total 8 weeks from kickoff.",
  "Budget: $25,000 fixed-fee, payable 30/40/30 against milestones.",
]);
await writeFile(join(OUT_DIR, "sample-creative-brief.docx"), brief);

// Trial balance CSV — fictional small-business numbers, balanced to zero.
const tb = [
  "Account,Account Type,Debit,Credit",
  "1010 Cash - Operating,Asset,28450.00,",
  "1100 Accounts Receivable,Asset,12300.00,",
  "1500 Equipment,Asset,18000.00,",
  "1510 Accumulated Depreciation,Asset,,3600.00",
  "2010 Accounts Payable,Liability,,8200.00",
  "2100 Credit Card Payable,Liability,,2150.00",
  "2500 Loan Payable,Liability,,15000.00",
  "3000 Owner Equity,Equity,,20000.00",
  "3100 Retained Earnings,Equity,,5800.00",
  "4000 Service Revenue,Revenue,,42000.00",
  "5010 Salaries Expense,Expense,18500.00,",
  "5020 Rent Expense,Expense,6000.00,",
  "5030 Utilities Expense,Expense,1450.00,",
  "5040 Office Supplies,Expense,820.00,",
  "5050 Software Subscriptions,Expense,1230.00,",
  "5060 Depreciation Expense,Expense,1800.00,",
  "5070 Bank Fees,Expense,200.00,",
  "TOTAL,,88750.00,96750.00",
  ",,,",
  "Note: This is a fictional sample for product onboarding only. Numbers are illustrative.",
].join("\n");
await writeFile(join(OUT_DIR, "sample-trial-balance.csv"), tb, "utf8");

console.log("Wrote 5 sample documents to public/samples/");
