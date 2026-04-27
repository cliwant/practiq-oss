/**
 * One-shot image edit: take public/images/dashboard-preview.png and
 * paint over the "Good afternoon, Dogfood." greeting with the
 * professional placeholder "Good afternoon, Park CPA Group."
 *
 * The original screenshot was captured against a local dev seed
 * where the demo user was named "Dogfood" (an artifact of
 * scripts/seed-dogfood.ts using `email.split('@')[0]` as `name`).
 * The seed script is now updated to use professional defaults, but
 * regenerating the screenshot requires a working local Practiq dev
 * stack — we don't want to block the marketing fix on that.
 *
 * Approach:
 *   - Load the PNG via Sharp (≈ 2880×1800 at 2× retina, source 1440×900).
 *   - Composite an SVG rectangle that paints over the existing greeting
 *     area with the surface background color (matches DESIGN.md
 *     `bg-base #050505`), then writes the replacement text on top using
 *     the same font weight + tracking the React component uses.
 *   - Save in-place. Backup is the prev .png, kept by the regen script.
 *
 * Run:  cd ventures/fractional-ai-command-center
 *       npx tsx scripts/fix-dashboard-preview-text.ts
 */
import sharp from "sharp";
import { resolve } from "node:path";
import { copyFile } from "node:fs/promises";

const TARGET = resolve(
  __dirname,
  "..",
  "public",
  "images",
  "dashboard-preview.png",
);
const BACKUP = resolve(
  __dirname,
  "..",
  "public",
  "images",
  "dashboard-preview.dogfood.png",
);

async function main() {
  // 1. Backup the original (in case we want to compare or re-roll).
  await copyFile(TARGET, BACKUP).catch(() => {
    // Backup file may already exist from a previous run — that's fine.
  });
  console.log(`[fix] backup → ${BACKUP}`);

  // 2. Load the source so we can match its size for the SVG overlay.
  const meta = await sharp(TARGET).metadata();
  const W = meta.width ?? 2880;
  const H = meta.height ?? 1800;
  console.log(`[fix] source ${W}x${H}`);

  // 3. Build an SVG that paints a 1px-bigger-than-the-text rectangle in
  //    the dashboard background color over the greeting line, then
  //    writes the replacement text on top in the dashboard heading
  //    style. Coordinates are tuned for the existing 2× retina capture
  //    where the greeting starts at ~y=70px (font ~52px) just under the
  //    "WORKSPACE" label.
  //
  //    We sample colors from DESIGN.md so the patch is invisible:
  //    - background: #050505 (bg-base)
  //    - heading text: #f4f4f5 (zinc-100), font-extrabold tracking-[-0.03em]
  // The original "Good afternoon, Dogfood." text in the source PNG sits
  // in the workspace header roughly at y=140..280 in retina coords.
  // We use a generous mask rect (380..2200 wide, 130..310 tall) to cover
  // the entire original glyph rect including descenders, then re-render
  // the replacement text with its baseline at y=255 so it visually sits
  // in the same line as the rest of the dashboard typography.
  const overlay = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="380" y="130" width="1820" height="180" fill="#050505" />
      <text x="380" y="255"
            font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
            font-size="76"
            font-weight="800"
            letter-spacing="-2.3"
            fill="#f4f4f5">Good afternoon, Park CPA Group.</text>
    </svg>`,
  );

  // 4. Composite + write back to the same path.
  await sharp(TARGET)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(TARGET + ".tmp");

  // sharp won't let us write back to the file we're reading, so we
  // wrote to a tmp path and now move into place.
  const fs = await import("node:fs/promises");
  await fs.rename(TARGET + ".tmp", TARGET);

  console.log(`[fix] wrote ${TARGET}`);
  console.log(
    `[fix] DONE. Verify locally:\n  open ${TARGET}\n` +
      `If the patched text doesn't visually align, tweak the rect/text coords ` +
      `in this script and re-run (the original is preserved at ${BACKUP}).`,
  );
}

main().catch((err) => {
  console.error("[fix] failed:", err);
  process.exit(1);
});
