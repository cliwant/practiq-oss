import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'things-falling-through-cracks-75-clients',
  title: 'Why Accounting Firms Break at 75 Clients (And What to Do About It)',
  date: '2026-02-07',
  author: 'Practiq Team',
  excerpt: 'There is a specific client count where most small accounting firms start losing control. Deadlines slip, follow-ups get missed, and the managing partner becomes the bottleneck. For most firms, that number is around 75.',
  content: `
<h2>What Does "Falling Through the Cracks" Actually Look Like?</h2>

<p>Nobody wakes up one morning and decides to miss a filing deadline or forget to follow up on a client document. It happens gradually. At 30 clients, you can keep the important details in your head. At 50, you start relying on sticky notes and spreadsheet trackers. Somewhere around 75, the system you cobbled together stops working.</p>

<p>The symptoms are predictable. A quarterly estimate gets filed a day late. A client emails about their K-1 and nobody responds for a week. Two team members work on the same client without realizing it. An engagement letter sits unsigned for three months because nobody noticed.</p>

<p>These are not competence problems. They are capacity problems disguised as competence problems. And they affect nearly every small firm that crosses the 75-client threshold.</p>

<h2>Why Does 75 Clients Seem to Be the Breaking Point?</h2>

<p>The math tells the story. A firm managing 75 clients with three people means each person carries roughly 25 clients. Each client has an average of 4-6 active items at any given time: a return in progress, a follow-up email pending, documents waiting for review, a question that needs answering. That puts each team member at 100-150 active tasks.</p>

<p>The human brain can reliably track about 7-10 items without a system. Past that, you need process. Most small firms run on informal process: the partner remembers, the senior associate keeps a list, the admin tracks emails. That works until it does not.</p>

<p>According to the <a href="https://www.aicpa-cima.com/" target="_blank" rel="noopener">AICPA</a>, small accounting firms report that approximately 45% of their work time goes to communication and context management rather than billable work. At 75 clients, that overhead becomes the dominant activity. Your team spends more time managing work than doing work.</p>

<h2>What Are the Real Costs of Things Falling Through?</h2>

<p>The direct costs are measurable. Late filing penalties, which the firm often absorbs to maintain the client relationship, can run $200-$500 per incident. A missed estimated tax payment that triggers IRS correspondence takes 2-4 hours of unbillable time to resolve. Rework on a return that used outdated information costs the equivalent of the original preparation time.</p>

<p>But the indirect costs are worse. Client trust erodes silently. The client who does not hear back for five days does not always complain. They just start looking for a new accountant. The <a href="https://www.journalofaccountancy.com/" target="_blank" rel="noopener">Journal of Accountancy</a> reports that client turnover in small firms runs 10-15% annually, and the primary driver is not price or expertise. It is responsiveness.</p>

<p>Then there is the cost to your team. When things fall through the cracks, the person who dropped it feels terrible. The partner who catches it feels frustrated. The resulting conversation is unpleasant for both sides. Multiply that by twice a week for six months and you have a morale problem that no pizza party will fix.</p>

<h2>How Do Firms That Manage 150+ Clients Avoid This?</h2>

<p>The firms that scale past 75 without constant firefighting share a few characteristics. First, they have a single source of truth for every client. Not a spreadsheet plus email plus a practice management tool plus someone&apos;s memory. One place where the current status of every client, every deliverable, and every open item lives.</p>

<p>Second, they have proactive visibility. Instead of waiting until something is overdue to discover it was missed, they have a system that surfaces upcoming deadlines and stalled items before they become problems. The difference between a reminder three days before a deadline and a notification three days after is the difference between competence and crisis.</p>

<p>Third, they capture institutional knowledge. When a team member is out sick, someone else can pick up their clients without a 45-minute briefing. The client&apos;s preferences, current status, and open issues are documented somewhere accessible, not locked in one person&apos;s head.</p>

<blockquote>
"We had a senior associate leave with zero notice. It took us two months to fully recover because everything she knew about her 30 clients was in her head or her personal email folders." &mdash; Owner of a five-person accounting firm
</blockquote>

<h2>What Should a Growing Firm Actually Change?</h2>

<p>The temptation is to hire. And sometimes that is the right answer. But hiring into a broken system just means more people experiencing the same chaos. Before adding headcount, fix the information architecture.</p>

<p>Start with client context consolidation. Every piece of information about a client should be accessible from one entry point. When you click on a client name, you should see their current status, open items, recent communications, and upcoming deadlines without opening three different applications.</p>

<p>Next, implement deadline-driven workflows rather than task lists. A task list tells you what to do. A deadline-driven workflow tells you what to do and when it becomes a problem if you have not done it. The difference matters when you have 150 items competing for attention.</p>

<p>Finally, build the habit of documenting client-specific knowledge as it happens. Not in a formal knowledge management project, but as a natural part of the workflow. When you learn that a client prefers charts over tables, or that their fiscal year ends in June, or that they always file an extension, capture it where your team can find it.</p>

<h2>How Practiq Addresses This</h2>

<p>This is the exact problem Practiq was built to solve. Every client gets a unified workspace where their full history, current status, and upcoming deadlines load in one click. The system surfaces what needs attention before it becomes overdue, so your team spends time on the work instead of tracking the work.</p>
`,
  tags: ['scaling', 'firm management', 'client management'],
  readingTime: '7 min read',
  ogDescription: 'Most small accounting firms hit a breaking point around 75 clients. Learn why it happens and how to push past it without burning out.',
  category: 'Accounting',
};

export default post;
