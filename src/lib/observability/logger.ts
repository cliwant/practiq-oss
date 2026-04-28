/**
 * Structured logger — RUN 19 (OSS observability stack).
 *
 * Replaces ad-hoc `console.log` / `console.warn` calls with a tiny
 * structured JSON logger. No external dependency: just enriches
 * console.* with a stable shape (`level`, `time`, `msg`, plus
 * arbitrary key/value context). Vercel's log pipeline already parses
 * JSON automatically and most OSS log sinks (Loki, Datadog OSS,
 * Logtail, Better Stack) ingest the same shape.
 *
 * Why not Pino: Pino adds a transport surface that complicates Vercel
 * cold-starts and brings ~80KB of dependencies. The marginal value
 * over `console.log(JSON.stringify(...))` is small at our scale, and
 * we get to keep the bundle clean. If we ever hit Pino's distinctive
 * features (async transport, level-tagged streams) we can migrate
 * the same call sites.
 *
 * Why not OpenTelemetry directly: OTel SDK is heavy + opinionated.
 * For Phase 1 we want "good logs" and a Prometheus metrics endpoint.
 * OTel can be added later as a wrapping layer if we need distributed
 * tracing; the call-site shape stays the same.
 *
 * Migration policy: replace `console.log("[where] msg", obj)` with
 * `log.info("msg", { where: "...", ...obj })`. Keep `console.warn` /
 * `console.error` for direct stack traces; the logger is a structured
 * tier above them.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Resolve the active level once at module load. NODE_LOG_LEVEL beats
 * NODE_ENV defaults; production defaults to "info", dev to "debug".
 */
function resolveActiveLevel(): LogLevel {
  const explicit = process.env.NODE_LOG_LEVEL?.trim().toLowerCase();
  if (explicit && explicit in LEVEL_ORDER) return explicit as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}
const ACTIVE_LEVEL = resolveActiveLevel();

/**
 * Pretty-print toggle. Off in production (Vercel logs prefer JSON).
 * Override via NODE_LOG_PRETTY=1 for local debugging.
 */
const PRETTY =
  process.env.NODE_LOG_PRETTY === "1" ||
  process.env.NODE_ENV !== "production";

export interface LogContext {
  [key: string]: unknown;
}

function emit(level: LogLevel, msg: string, ctx: LogContext = {}): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[ACTIVE_LEVEL]) return;

  const record = {
    level,
    time: new Date().toISOString(),
    msg,
    ...ctx,
  };

  // Prefer console.error for warn+ so they go to stderr in the same way
  // raw `console.warn` did — Vercel's log pipeline tags them differently.
  const sink =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  if (PRETTY) {
    const tag =
      level === "error"
        ? "🔴"
        : level === "warn"
          ? "🟠"
          : level === "info"
            ? "•"
            : "·";
    const ctxStr = Object.keys(ctx).length > 0 ? " " + JSON.stringify(ctx) : "";
    sink(`${tag} [${level}] ${msg}${ctxStr}`);
  } else {
    sink(JSON.stringify(record));
  }
}

/**
 * The shared logger. Call as `log.info("agent dispatch start", { firmId, taskCount })`.
 * Each log line carries `level / time / msg / …caller-provided keys`.
 */
export const log = {
  debug(msg: string, ctx?: LogContext) {
    emit("debug", msg, ctx);
  },
  info(msg: string, ctx?: LogContext) {
    emit("info", msg, ctx);
  },
  warn(msg: string, ctx?: LogContext) {
    emit("warn", msg, ctx);
  },
  error(msg: string, ctx?: LogContext) {
    emit("error", msg, ctx);
  },
  /**
   * Returns a child logger that auto-includes the supplied context on every
   * call. Useful for request handlers that want every line to carry
   * `request_id`, `user_id`, etc. without sprinkling the same keys.
   */
  with(base: LogContext) {
    return {
      debug: (msg: string, ctx?: LogContext) =>
        emit("debug", msg, { ...base, ...ctx }),
      info: (msg: string, ctx?: LogContext) =>
        emit("info", msg, { ...base, ...ctx }),
      warn: (msg: string, ctx?: LogContext) =>
        emit("warn", msg, { ...base, ...ctx }),
      error: (msg: string, ctx?: LogContext) =>
        emit("error", msg, { ...base, ...ctx }),
    };
  },
};

/**
 * Strip a value to a logger-safe shape — drops PII-like fields, caps
 * deep object size, redacts long strings. Use when a payload may be
 * untrusted (e.g. third-party webhook body) and we don't want to leak
 * passwords / tokens / signatures into the log stream.
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "secret",
  "apikey",
  "api_key",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "stripe-signature",
  "svix-signature",
  "x-bootstrap-secret",
]);

export function safeLogValue(v: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    return v.length > 1000 ? v.slice(0, 1000) + "…" : v;
  }
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) {
    return v.slice(0, 50).map((x) => safeLogValue(x, depth + 1));
  }
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
      } else {
        out[k] = safeLogValue(val, depth + 1);
      }
    }
    return out;
  }
  return String(v);
}
