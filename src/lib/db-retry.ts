/**
 * withDbRetry — retry a Prisma call once on transient pool errors.
 *
 * The @prisma/adapter-pg (Wasm engine, ARM64 Windows dev) sometimes
 * throws "Connection terminated unexpectedly" when the embedded pg
 * server closes an idle connection. The error isn't reproducible
 * under load — it happens at random, worse under Promise.all fan-out.
 * The quickest and safest fix is a single retry; the pool reconnects
 * within milliseconds.
 *
 * Call this anywhere you fan out multiple Prisma queries with
 * Promise.all in a request-bound code path (server components, API
 * routes). Leave it off for mutations inside transactions.
 *
 * Classifies errors by message because the adapter wraps pg's native
 * error into a generic Error; the prisma error code for transient pool
 * issues is "P2010" but only sometimes.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 2;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!isTransient(msg)) throw err;
      // No backoff — prisma-pg reconnects immediately.
    }
  }
  throw lastErr;
}

export function isTransient(msg: string): boolean {
  return /connection terminated|connection closed|socket|econnreset|pool|P2024/i.test(
    msg,
  );
}
