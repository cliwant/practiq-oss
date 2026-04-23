import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Vitest configuration. Unit tests live next to source files as
 * `*.test.ts` / `*.test.tsx`. Integration tests live under
 * `tests/integration/`.
 *
 * Environment defaults to `node` (server-side). Files that need DOM
 * (React components) set `// @vitest-environment happy-dom` at the
 * top of the file.
 *
 * Path alias `@/` mirrors Next.js tsconfig so tests can import from
 * `@/lib/...` without relative paths.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    // Exclude the Next.js build output + generated Prisma client.
    exclude: [
      "node_modules/**",
      ".next/**",
      "src/generated/**",
      "tests/e2e/**",
    ],
    // Coverage is opt-in via `npx vitest --coverage`. Default thresholds
    // are advisory — tighten per-file in CI gate later.
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/generated/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
      ],
    },
  },
});
