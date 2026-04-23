import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Cosmetic rule about apostrophes/quotes inside JSX. Fine in modern
      // browsers; doesn't affect runtime. Not worth blocking deploys over.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Generated Prisma client ships its own eslint-disable headers that
    // newer lint rules consider "unused directive". Skip the whole folder.
    ignores: ["src/generated/**"],
  },
];

export default eslintConfig;
