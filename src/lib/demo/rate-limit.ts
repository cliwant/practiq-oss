/**
 * Rate limiting for the public /demo/redline endpoint.
 *
 * 3 redline runs per IP per 24 hours. Anonymous-only (no auth on
 * /demo). Backed by the studio's existing sliding-window rate
 * limiter (Vercel KV in prod, in-memory in dev), so a single
 * misbehaving IP can't burn LLM spend or flood the cold-email
 * audience with brute force.
 */
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  identityFromRequest,
  type RateLimitResult,
} from "@/lib/rate-limit";

const NAMESPACE = "demo/redline";
const LIMIT = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface DemoRateCheck extends RateLimitResult {
  /** The identity bucket the limit applied to (for logging). */
  identity: string;
}

export async function checkDemoRateLimit(
  request: NextRequest,
): Promise<DemoRateCheck> {
  const identity = identityFromRequest(request);
  const result = await checkRateLimit({
    namespace: NAMESPACE,
    identity,
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });
  return { ...result, identity };
}

export const DEMO_RATE_LIMIT = {
  limit: LIMIT,
  windowHours: WINDOW_MS / (60 * 60 * 1000),
};
