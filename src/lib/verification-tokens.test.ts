import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Unit tests for verification-tokens with a mocked Prisma client.
 * Covers: mint with proper TTL, revoking prior tokens of same kind,
 * consume success, consume failures (not_found / expired / consumed
 * / wrong_kind).
 */

// Prisma mock lives in-file so each test can rewire behavior.
const dbState = {
  tokens: new Map<string, any>(),
  updateManyCalls: 0,
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        dbState.updateManyCalls++;
        let count = 0;
        for (const [id, tok] of dbState.tokens.entries()) {
          if (
            tok.userId === where.userId &&
            tok.kind === where.kind &&
            tok.consumedAt === null
          ) {
            dbState.tokens.set(id, { ...tok, ...data });
            count++;
          }
        }
        return { count };
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = `tok_${dbState.tokens.size}`;
        const row = { id, consumedAt: null, ...data };
        dbState.tokens.set(id, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        for (const row of dbState.tokens.values()) {
          if (row.token === where.token) return row;
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        for (const [id, row] of dbState.tokens.entries()) {
          if (row.id === where.id) {
            const merged = { ...row, ...data };
            dbState.tokens.set(id, merged);
            return merged;
          }
        }
        throw new Error("not found");
      }),
    },
  },
}));

import {
  mintVerificationToken,
  consumeVerificationToken,
} from "./verification-tokens";

beforeEach(() => {
  dbState.tokens.clear();
  dbState.updateManyCalls = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("mintVerificationToken", () => {
  it("returns a 32-byte base64url token and expiry in the future", async () => {
    const { token, expiresAt } = await mintVerificationToken(
      "user_1",
      "password_reset",
    );
    expect(token.length).toBeGreaterThan(40);
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("password_reset TTL ~= 1h; verify_email TTL ~= 24h", async () => {
    const before = Date.now();
    const reset = await mintVerificationToken("u", "password_reset");
    const verify = await mintVerificationToken("u", "verify_email");
    const resetDiff = reset.expiresAt.getTime() - before;
    const verifyDiff = verify.expiresAt.getTime() - before;
    expect(resetDiff).toBeGreaterThan(50 * 60 * 1000);
    expect(resetDiff).toBeLessThan(70 * 60 * 1000);
    expect(verifyDiff).toBeGreaterThan(23 * 3600 * 1000);
    expect(verifyDiff).toBeLessThan(25 * 3600 * 1000);
  });

  it("revokes prior unconsumed tokens of the same kind", async () => {
    await mintVerificationToken("u", "password_reset");
    await mintVerificationToken("u", "password_reset");
    // Second call should trigger updateMany on the first.
    expect(dbState.updateManyCalls).toBe(2);
  });

  it("does not revoke tokens of a different kind", async () => {
    await mintVerificationToken("u", "verify_email");
    const before = dbState.tokens.size;
    await mintVerificationToken("u", "password_reset");
    // Both kinds coexist, so two tokens total.
    expect(dbState.tokens.size).toBe(before + 1);
  });
});

describe("consumeVerificationToken", () => {
  it("returns not_found for a token that doesn't exist", async () => {
    const res = await consumeVerificationToken("nope_x_y_z_12345", "password_reset");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_found");
  });

  it("returns not_found for empty/short tokens", async () => {
    const res = await consumeVerificationToken("", "password_reset");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_found");
  });

  it("returns wrong_kind when kind mismatches", async () => {
    const { token } = await mintVerificationToken("u1", "verify_email");
    const res = await consumeVerificationToken(token, "password_reset");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("wrong_kind");
  });

  it("consumes a valid token and returns the userId", async () => {
    const { token } = await mintVerificationToken("u1", "password_reset");
    const res = await consumeVerificationToken(token, "password_reset");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.userId).toBe("u1");
  });

  it("refuses to consume a token twice", async () => {
    const { token } = await mintVerificationToken("u1", "password_reset");
    const first = await consumeVerificationToken(token, "password_reset");
    expect(first.ok).toBe(true);
    const second = await consumeVerificationToken(token, "password_reset");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("consumed");
  });

  it("refuses expired tokens", async () => {
    const { token } = await mintVerificationToken("u1", "password_reset");
    // Hand-expire the row.
    for (const [id, row] of dbState.tokens.entries()) {
      if (row.token === token) {
        dbState.tokens.set(id, {
          ...row,
          expiresAt: new Date(Date.now() - 1000),
        });
      }
    }
    const res = await consumeVerificationToken(token, "password_reset");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("expired");
  });
});
