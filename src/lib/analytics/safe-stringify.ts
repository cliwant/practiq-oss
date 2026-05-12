/**
 * DOM-safe JSON.stringify.
 *
 * Replaces values that would cause `JSON.stringify` to crash or leak
 * implementation detail into the analytics ingest:
 *
 *   - DOM nodes (Element / Node / EventTarget with nodeType) → "[DOMElement]"
 *   - DOM events (have currentTarget/target + isTrusted/bubbles)   → "[DOMEvent]"
 *   - Window / Document                                            → "[Window]" / "[Document]"
 *   - Circular references (tracked via WeakSet)                    → "[Circular]"
 *   - Functions                                                    → "[Function]"
 *   - Anything deeper than DEPTH_CAP                                → "[Truncated]"
 *   - Keys matching React fiber/props patterns are dropped entirely.
 *
 * Why this exists:
 *
 * A real visitor (Chrome 139, 2026-05-12) hit a `Converting circular
 * structure to JSON` crash on a topic landing page. The minified stack
 * was `HTMLFormElement → analytics handler → JSON.stringify(payload)`,
 * which means some call path was passing a DOM-attached object (likely
 * an HTMLInputElement carrying its React fiber refs) into the analytics
 * payload. The fiber graph closes on itself, so `JSON.stringify` blows
 * up at runtime. Even though our typed callers don't *intend* to pass
 * DOM refs, ad-injected scripts, third-party listeners, and React's own
 * SyntheticEvent objects can leak them in — once a single beacon
 * crashes, every event after it is dropped, so the whole funnel goes
 * dark for that visitor.
 *
 * `safeStringify` does one tree walk with a WeakSet for cycle detection
 * and a depth cap to prevent runaway serialization. The function never
 * throws — if sanitization somehow misses a case, the outer try/catch
 * falls back to `"{}"` so the caller can still emit *something* rather
 * than the whole pageview going dark.
 */

const DEPTH_CAP = 5;

function isNodeLike(v: unknown): boolean {
  // `instanceof Node` would be the gold standard, but Node isn't
  // defined in SSR. The duck-type covers Element / HTMLElement / Text /
  // Document / DocumentFragment without depending on the global.
  if (!v || typeof v !== "object") return false;
  const o = v as { nodeType?: unknown; nodeName?: unknown };
  return typeof o.nodeType === "number" && typeof o.nodeName === "string";
}

function isWindowLike(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as { window?: unknown; self?: unknown };
  return o.window === v || o.self === v;
}

function isEventLike(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    "target" in o &&
    "currentTarget" in o &&
    typeof o.bubbles === "boolean" &&
    typeof o.isTrusted === "boolean"
  );
}

function isReactFiberKey(key: string): boolean {
  // React 17+ attaches `__reactFiber$<random>` and
  // `__reactProps$<random>` directly to DOM nodes. Any property whose
  // key matches this pattern is a React internal and should never
  // round-trip through JSON.
  return key.startsWith("__reactFiber$") || key.startsWith("__reactProps$");
}

function sanitize(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "bigint") return (value as bigint).toString();
  if (t === "function") return "[Function]";
  if (t === "symbol") return (value as symbol).toString();
  if (t !== "object") return value;

  // Object guards.
  if (isNodeLike(value)) return "[DOMElement]";
  if (isWindowLike(value)) return "[Window]";
  if (isEventLike(value)) return "[DOMEvent]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value instanceof Date) return (value as Date).toISOString();
  if (value instanceof RegExp) return (value as RegExp).toString();

  const obj = value as object;
  if (seen.has(obj)) return "[Circular]";

  if (depth >= DEPTH_CAP) return "[Truncated]";

  // Add to seen *after* depth/primitive checks but before recursing.
  seen.add(obj);

  if (Array.isArray(value)) {
    const out: unknown[] = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      out[i] = sanitize(value[i], seen, depth + 1);
    }
    return out;
  }

  // React fiber detection — if any own enumerable key is a fiber
  // key, the whole subtree is a DOM-attached internal and we replace
  // wholesale rather than walking it.
  const keys = Object.keys(obj);
  if (keys.some(isReactFiberKey)) return "[DOMElement]";

  const out: Record<string, unknown> = {};
  for (const k of keys) {
    let child: unknown;
    try {
      // Defensive: getters on third-party objects can throw.
      child = (obj as Record<string, unknown>)[k];
    } catch {
      child = "[Unreadable]";
    }
    out[k] = sanitize(child, seen, depth + 1);
  }
  return out;
}

export function safeStringify(value: unknown): string {
  try {
    const sanitized = sanitize(value, new WeakSet(), 0);
    return JSON.stringify(sanitized);
  } catch {
    // Defensive: if a getter throws mid-walk or an object lies about
    // its shape, we fall back to an empty payload rather than crashing
    // the entire beacon (which would also drop every subsequent event).
    return "{}";
  }
}
