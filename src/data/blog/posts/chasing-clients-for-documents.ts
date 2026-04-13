import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'chasing-clients-for-documents',
  title: 'The Follow-Up Tax: How Chasing Clients for Documents Eats Your Productive Hours',
  date: '2026-03-24',
  author: 'Practiq Team',
  excerpt: 'For every hour of actual accounting work, small firms spend 30-45 minutes on follow-up: emails asking for missing documents, reminders about unsigned engagement letters, and phone calls about information that should have arrived weeks ago.',
  content: `
<h2>How Much Time Does Your Firm Spend on Follow-Up?</h2>

<p>Track it for one week. Every email you send asking a client for something they should have sent you. Every reminder about a document request that went unanswered. Every phone call where you say "I just wanted to check in on those records I requested." Add up the minutes.</p>

<p>Most firm owners who actually do this exercise are shocked by the result. The typical range is 8-15 hours per week across the team during tax season. For a three-person firm with 85 clients, that means 25-40% of total capacity goes to follow-up rather than actual work.</p>

<p>The <a href="https://www.cpapracticeadvisor.com/" target="_blank" rel="noopener">CPA Practice Advisor</a> reports that document collection is consistently the most time-consuming administrative task in tax season. Not return preparation. Not technical research. Following up on documents that clients promised to send two weeks ago.</p>

<h2>Why Is This So Persistent as a Problem?</h2>

<p>Clients are not malicious about this. They are busy. Your document request sits in their inbox alongside 200 other emails. They intend to get to it. They just do not. And when they do respond, they send half of what you asked for, which triggers another round of follow-up.</p>

<p>The typical sequence for a single client&apos;s tax documents looks like this:</p>

<ul>
<li>Initial request sent (day 1)</li>
<li>Reminder #1 after no response (day 8)</li>
<li>Client sends partial documents (day 12)</li>
<li>Follow-up requesting missing items (day 13)</li>
<li>Reminder #2 for remaining items (day 20)</li>
<li>Client sends most remaining items (day 25)</li>
<li>Final follow-up for one last document (day 26)</li>
<li>Document finally received (day 33)</li>
</ul>

<p>That is seven separate interactions over five weeks for one client. Multiply by 85 clients and you understand why January through April feels relentless.</p>

<h2>What Makes Follow-Up Particularly Costly Beyond Just the Time?</h2>

<p>The time is bad enough. But follow-up has secondary costs that are harder to see:</p>

<p><strong>Context switching.</strong> Every follow-up email requires you to remember where that client stands. What did you ask for? What did they already send? What is still missing? Answering those questions takes 3-5 minutes per client, even before you write the email. Across 20 follow-ups per day, that is an additional hour just on context recovery.</p>

<p><strong>Workflow disruption.</strong> A return that is 90% complete but waiting on one document sits in limbo. It takes up mental space. You cannot file it, but you cannot forget about it either. These partially complete items accumulate during tax season until your workflow is a minefield of blocked returns.</p>

<p><strong>Relationship strain.</strong> Nobody enjoys sending the fourth reminder for documents. And nobody enjoys receiving it. Each follow-up interaction carries a small amount of friction that, over time, erodes the professional relationship. The client starts to feel nagged. You start to feel frustrated. Neither party wants to be in this dynamic.</p>

<h2>What Actually Reduces the Follow-Up Burden?</h2>

<p>The firms that have this under control typically use a combination of approaches:</p>

<p><strong>Earlier starts.</strong> Sending the initial document request in November instead of January means the back-and-forth happens before the high-pressure period. By January, most documents are in hand and the team can focus on preparation.</p>

<p><strong>Checklists that the client can see.</strong> Instead of an email listing everything you need, a shared checklist where the client can see what they have sent and what is still outstanding. This shifts some of the tracking burden from you to the client.</p>

<p><strong>Automated escalation.</strong> First reminder is a friendly email. Second reminder is a more direct email. Third reminder triggers a phone call. This progression happens automatically on a schedule, without someone manually checking the spreadsheet to figure out who is overdue.</p>

<p>According to the <a href="https://www.aicpa-cima.com/" target="_blank" rel="noopener">AICPA</a>, firms that implement automated follow-up systems report a 40-60% reduction in time spent on document collection, primarily because the system handles the routine reminders and the team only gets involved when manual intervention is needed.</p>

<h2>How Practiq Automates the Follow-Up</h2>

<p>Practiq tracks document status for every client and automates the reminder sequence. When you log in, you see which clients have outstanding items, how long they have been waiting, and what the next scheduled follow-up is. The system handles the routine chasing so your team can focus on the work that actually uses their expertise.</p>
`,
  tags: ['productivity', 'client management', 'busy season', 'workflow'],
  readingTime: '7 min read',
  ogDescription: 'Chasing clients for documents is the #1 time drain during tax season. Here is how to quantify and reduce it.',
  category: 'Accounting',
};

export default post;
