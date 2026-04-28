/**
 * T1 — Rolling 30-day digest.
 *
 * The digest is produced once per night by `digest-compactor.ts`
 * and stored as a `ClientContext` row with `category === "digest"`.
 * The reader's only job is to fetch the freshest row and clamp
 * its content to the tier cap.
 *
 * **Why this tier matters**: it answers "where did we leave off
 * with this client?" without making the prompt scan 30 days of
 * raw conversations / agent runs. Zep's Community subgraph plays
 * the same role — clusters + summaries → global view at low cost.
 *
 * **Fallback**: when no digest exists yet (new client, or first
 * 24h before the cron fires), we synthesise a minimal "no digest
 * yet, here are top 3 pinned facts" block so the prompt doesn't
 * have an empty section. The composer will note `hadData: false`
 * for observability.
 */

import { prisma } from "@/lib/prisma";
import { approxTokenCount, truncateToTokenCap } from "../token-counter";
import type { TierBlock } from "./profile";

export async function loadT1Digest(opts: {
  clientId: string;
  cap: number;
}): Promise<TierBlock> {
  const digest = await prisma.clientContext.findFirst({
    where: { clientId: opts.clientId, category: "digest" },
    orderBy: { updatedAt: "desc" },
    select: { content: true, updatedAt: true },
  });

  if (digest && digest.content && digest.content.trim().length > 0) {
    const ageDays = Math.max(
      0,
      Math.floor((Date.now() - digest.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const stale = ageDays >= 7;
    const header = `## T1 Rolling digest (${
      stale ? `STALE — ${ageDays}d old` : `${ageDays}d old`
    })\n\n`;
    const raw = header + digest.content.trim() + "\n";
    const body = truncateToTokenCap(raw, opts.cap);
    return {
      tier: "T1",
      body,
      tokensApprox: approxTokenCount(body),
      summary: stale
        ? `digest age=${ageDays}d (stale)`
        : `digest age=${ageDays}d`,
      hadData: true,
    };
  }

  // Fallback: pinned ClientContext rows in lieu of a digest. Don't
  // synthesise a full digest from raw history at chat time — that's
  // the compactor's job. We just expose 3 most-pinned facts so the
  // tier isn't empty on a brand-new client.
  const pinned = await prisma.clientContext.findMany({
    where: { clientId: opts.clientId, isPinned: true, category: { not: "digest_archive" } },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { title: true, content: true },
  });
  if (pinned.length === 0) {
    return {
      tier: "T1",
      body: "",
      tokensApprox: 0,
      summary: "no digest, no pinned facts",
      hadData: false,
    };
  }
  const lines = pinned.map((p) => {
    const trimmed = p.content.length > 220 ? p.content.slice(0, 217).trim() + "…" : p.content;
    return `- **${p.title}** — ${trimmed}`;
  });
  const raw = `## T1 Rolling digest (no compactor run yet — top pinned facts shown)\n\n${lines.join("\n")}\n`;
  const body = truncateToTokenCap(raw, opts.cap);
  return {
    tier: "T1",
    body,
    tokensApprox: approxTokenCount(body),
    summary: `fallback: ${pinned.length} pinned facts (no digest yet)`,
    hadData: true,
  };
}
