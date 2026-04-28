import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'choosing-llm-model-for-client-work',
  title: 'Sonnet, Haiku, or Opus? How to Pick the Right AI Model for Each Type of Client Work',
  date: '2026-04-28',
  author: 'Practiq Team',
  excerpt:
    'Different parts of a client engagement reward different models. Here is the practical decision tree we built into Practiq so a 5-person firm never overpays for routine briefings or under-resources strategic synthesis.',
  content: `
<h2>Why a Single Default Model Is the Wrong Answer</h2>

<p>Most AI tools wire one model into every workflow. That made sense when the gap between model tiers was small, but the 2026 model lineup has stretched the price-and-capability range to roughly 50x. Routing every prompt through the most capable model burns budget on tasks the cheapest model would do equally well, and routing everything through the cheapest one fumbles the strategic work where you actually wanted depth.</p>

<p>The honest answer is that small firms benefit from a tiny mental model: pick a fast model for routine throughput, a balanced model for everyday client work, and reach for the max-tier model on the few synthesis tasks each week that actually require it.</p>

<h2>What Each Tier Is Actually Good At</h2>

<p><strong>Fast tier (Claude Haiku 4.5, GPT-4o-mini)</strong> excels at classification, short briefings, document tagging, intake form parsing, and high-volume routine agent runs. Latency under a second, cost under a tenth of the balanced tier. The trap is asking it to do multi-step reasoning where the chain of inferences matters.</p>

<p><strong>Balanced tier (Claude Sonnet 4.5, GPT-4o)</strong> is the workhorse. Most client work — drafting an email, summarizing a 12-month variance trend, preparing a tax-season checklist, writing the first pass of a financial review — sits right in this tier. Sonnet 4.5 specifically handles tool use cleanly, which is what makes Practiq agents reliable end-to-end rather than only inside a chat box.</p>

<p><strong>Max tier (Claude Opus 4.1, GPT-5)</strong> earns its premium when the task is open-ended synthesis across many sources: a quarterly portfolio review across 30 clients, a partner-call deck assembled from a year of meeting notes, a deep dive into why one segment of clients shows declining margins. You will use this tier maybe 10% of the week, but those uses justify the price.</p>

<h2>A Decision Tree That Actually Works in a Multi-Client Firm</h2>

<ol>
<li>Is this a single, well-scoped task with a clear schema for the output? Use the fast tier.</li>
<li>Does the task involve drafting communication to a client or generating a deliverable they will review? Use the balanced tier — the quality differential against fast is noticeable to clients, and the cost is still trivial.</li>
<li>Are you synthesizing across more than three sources, or asking the model to reconcile contradictory inputs, or producing a piece of analysis you will personally sign off on? Use the max tier.</li>
<li>Is this an automated agent run that fires hundreds of times per day? Default to fast, with a "promote to balanced" path on a clearly defined trigger (such as low confidence on the previous output).</li>
</ol>

<p>The point of the tree is not to memorize it. It is to internalize that the cost difference is large enough to matter and the quality difference is real enough that the wrong choice shows up in client work.</p>

<h2>How Practiq Lets You Set This Without Touching Code</h2>

<p>Inside Practiq, every operator picks a default model on the Settings → Agent screen. The fast and balanced tiers are available on every plan; the max tier unlocks at Practice and above. The default model drives chats, briefings, and agent runs unless an individual conversation explicitly overrides it. Switching models takes one click and applies on the next message — no provider keys to manage, no SDK upgrade, no environment redeploy.</p>

<p>Behind the scenes, Practiq routes through either the Anthropic-direct API or OpenRouter depending on which keys your firm has configured. The user-facing model picker maps to the right provider model id automatically, so a Sonnet 4.5 selection routes to <code>anthropic/claude-sonnet-4.5</code> on OpenRouter or <code>claude-sonnet-4-5-20250929</code> on Anthropic-direct without you having to think about it.</p>

<h2>What Happens When the Vendors Ship a Better Model</h2>

<p>The catalog is data, not code. When Anthropic or OpenAI releases a new model, we add it to the catalog with a tier label and your settings page picks it up immediately. Existing per-conversation overrides keep working with their previously-selected model until you choose to switch. We err on the side of letting you opt in to new defaults rather than forcing them on you mid-engagement.</p>

<h2>The Real Lock-In Question</h2>

<p>If your firm is locked into one vendor's model because your tooling does not let you switch, that is a strategic risk. A model regression, a price hike, or an outage at a single provider becomes your problem. Practiq's model catalog is intentionally multi-vendor for this reason — Claude is the default and the model class we recommend, but you can pick GPT-4o for a non-Claude opinion or hedge against any single vendor's reliability without leaving the product.</p>
`,
  tags: ['ai', 'productivity', 'client management'],
  readingTime: '6 min read',
  ogDescription:
    'A practical decision tree for picking the right AI model for each part of a client engagement, plus how Practiq lets a 5-person firm switch models without touching code.',
  category: 'Accounting',
};

export default post;
