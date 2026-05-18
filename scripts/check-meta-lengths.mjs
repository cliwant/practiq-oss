import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
for (const file of files) {
  const txt = readFileSync(file, "utf8");
  const titleMatch = txt.match(/title:\s*['"]([^'"]+)['"]/);
  const descMatch = txt.match(/ogDescription:\s*['"]([^'"]+)['"]/);
  console.log(`=== ${file}`);
  if (titleMatch) console.log(`  title (${titleMatch[1].length}): ${titleMatch[1]}`);
  if (descMatch) console.log(`  desc  (${descMatch[1].length}): ${descMatch[1]}`);
}
