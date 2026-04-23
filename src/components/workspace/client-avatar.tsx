/**
 * Monogram avatar painted with the client's brand color. Deterministic —
 * same name/color always looks the same. We avoid images entirely for
 * the MVP; a letter on a tinted circle is plenty of identity and keeps
 * the list loading instantly.
 */
export function ClientAvatar({
  name,
  color,
  size = 24,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.floor(size * 0.4)),
        background: `linear-gradient(135deg, ${color}, ${darken(color, 0.25)})`,
        color: "#fff",
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06)`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

// Super-light color manipulation. Pure CSS does most of the job for us;
// we only need a slightly darker stop for the gradient so the circle has
// a hint of depth without relying on image assets.
function darken(color: string, amount: number): string {
  // Fast path: hex colors
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
  // hsl(h s% l%) — drop L by amount fraction
  const hsl = color.match(/^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/);
  if (hsl) {
    const h = hsl[1];
    const s = hsl[2];
    const l = Math.max(0, Number(hsl[3]) - amount * 100);
    return `hsl(${h} ${s}% ${l}%)`;
  }
  return color;
}
