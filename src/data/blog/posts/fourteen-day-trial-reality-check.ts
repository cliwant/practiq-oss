import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'fourteen-day-trial-reality-check',
  title: 'The 14-Day Trial Reality Check: What a Boutique Firm Should Actually Test Before Paying for AI',
  date: '2026-04-27',
  author: 'Practiq Team',
  excerpt:
    'A free trial is not a sales pipeline — it is the only chance to falsify the vendor\'s claims with your own clients, your own data, and your own deadlines. Here is the 14-day plan we recommend a 2-10 person firm run before subscribing.',
  content: `
<h2>Why Most Firms Waste Their Free Trial</h2>

<p>Boutique firm partners run free trials the same way they run free samples at a grocery store: a quick taste, a vague impression, then back to the existing tools. The 14 days expire, the trial converts to paid almost by accident or lapses without any real verdict. That is a missed opportunity. A trial is the only window where you can test claims against your own client data without contractual lock-in.</p>

<p>Practiq's trial is structured for that test. Below is the exact plan we suggest a Managing Partner walk through across two business weeks.</p>

<h2>Day 1: Get One Real Client Loaded</h2>

<p>Resist the urge to "just look around." Pick one current client — ideally a moderately complex one you know well — and create their workspace inside Practiq. Upload three months of their relevant documents (statements, notes, a recent deliverable). The whole step takes 15 minutes. Now you have something to test against.</p>

<h2>Day 2: Run Your First Briefing</h2>

<p>Trigger an agent briefing on the client you set up. Compare the output to what you would have written manually. Look at three things: did it pull the right facts, did it miss anything you would not have missed, and is the tone aligned with how you would communicate with this client?</p>

<p>This is the day most firms decide whether AI-native client work is going to be a real productivity win or a glorified note-taker. Most firms that make it past Day 2 convert; most firms that drop out drop out because they never ran a real briefing.</p>

<h2>Days 3-5: Add a Second Client and a Teammate</h2>

<p>Add a second client to verify that the agent does not bleed context between them — Practiq scopes memory per client by design, but the only way to trust it is to test it. Then invite one teammate. Have them open the first client's workspace and see whether the context loads coherently for them too. The "shared firm memory" claim is meaningful only if it works on the second seat, not just the first.</p>

<h2>Days 6-9: Run an Approval Queue Cycle</h2>

<p>Ask the agent to draft three deliverables for one of your clients and route them through the approval queue. This tests the loop you will live in once you are paying — agent drafts, you review, you approve or send back. Fast keyboard navigation matters here. So does the cost of being wrong: how easy is it to reject a draft, and does the agent learn from your rejection?</p>

<h2>Days 10-12: Stress the Cap</h2>

<p>The free tier limits clients and chat messages on purpose. In the second week, push close enough to the limit that you experience the upgrade prompt. The plan-usage meter inside the workspace tells you exactly how close you are. The point is not to beat the cap — it is to feel whether the constraint is artificial or whether it represents the real boundary at which you would naturally upgrade.</p>

<h2>Day 13: Switch the Model</h2>

<p>If you have not already, change your default LLM model on Settings → Agent. Free trial gives you Haiku 4.5 and Sonnet 4.5; experiment with both on the same prompt. The point is to verify that you can change the model yourself, that the switch takes effect immediately, and that the difference between tiers is visible on your kind of work.</p>

<h2>Day 14: The Real Decision</h2>

<p>Sit with the data. Across the trial, how much time did you save? Where did the agent miss? Would the team adopt this without prodding once you are gone? If the answer to all three is favorable, upgrade — Practice with the Founding Member discount is the most common landing tier for firms in the 30-100 client range. If the answer is mixed, stay on the trial and run it for another week using the second seat path; we extend trials on request when there is honest uncertainty.</p>

<h2>The Conversion Devices That Should Not Manipulate You</h2>

<p>Practiq has a few conversion nudges in-app: a usage meter, a trial countdown, a "lock the founding price" pill in the pricing page. These exist because we believe a firm should know exactly where it stands, not because we want to pressure you. None of them disable functionality before the trial actually expires; none of them double-charge or auto-add seats. If a conversion device ever feels manipulative, that is a bug — email <a href="mailto:support@practiq.dev">support@practiq.dev</a> and we will fix it.</p>

<h2>What Happens If You Cancel Mid-Trial</h2>

<p>Nothing. You stop using the product. Your data exports as a ZIP within 24 hours of request. We hold the raw rows for 30 days in case you change your mind, then delete them. We do not sell data to anyone, ever. This is not a marketing claim — it is in the privacy policy and we have invested in the data isolation primitives that make it true.</p>

<h2>The Pricing-Aware Trial</h2>

<p>If you are a 6-10 person firm, run the trial on the Practice tier even though billing only triggers on Day 14 conversion. That gives you teamRouting, RBAC, and shared memory during the test — the very features that decide whether Practice is the right tier for you. The tier you trial should match the tier you would buy.</p>
`,
  tags: ['onboarding', 'free trial', 'pricing'],
  readingTime: '7 min read',
  ogDescription:
    'A 14-day plan a boutique firm should run during a Practiq free trial — what to test, when to switch the model, and how to make the buy/no-buy decision honestly.',
  category: 'Accounting',
};

export default post;
