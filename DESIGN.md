# FractionalOS Design System

Machine-readable design specification. AI agents MUST reference this file when generating UI. Every screen must follow these rules for visual consistency.

## Brand

- Product name: FractionalOS
- Tagline: "The OS for Boutique Professional Services"
- Visual identity: Premium dark, minimal, information-dense. Inspired by Linear, Superhuman, Raycast.
- Tone: Professional but approachable. Confident, not flashy.

## Colors

### Backgrounds (layered dark surfaces)
- Base: #050505
- Surface: #0a0a0a
- Card: #111111
- Elevated: #141414

### Borders
- Subtle: #1a1a1a
- Muted: #262626
- Default: zinc-800 (#27272a)
- Strong: zinc-700 (#3f3f46)
- Hover: zinc-600 (#52525b)

### Text
- Primary: zinc-100 (#f4f4f5)        — 18.5:1 on bg-base, AAA pass
- Secondary: zinc-200 (#e4e4e7)      — 16.1:1 on bg-base, AAA pass
- Body: zinc-400 (#a1a1aa)           — 7.95:1 on bg-base, AAA pass
- Muted: zinc-500 (#71717a)          — 4.22:1 on bg-base, AA-large only (use ≥18px or skip-the-screen-reader content)
- Faint: zinc-600 (#52525b)          — 2.64:1 on bg-base, **fails WCAG**, decorative-only (icons, dividers, never body text)

**WCAG audit 2026-04-29**: zinc-500 and zinc-600 are intentionally low-
contrast for visual hierarchy on the dark theme but DO fail body-text
AA. Use zinc-500 only for ≥18px secondary captions; never use zinc-600
for any text the reader actually has to read. Hot-path body text on
landing / pricing / login should always be zinc-100/200/400.

### Brand
- Primary: #2563eb (blue-600) — CTAs, active states, AI agent indicators
- Secondary: #4f46e5 (indigo-600) — secondary accents
- Accent: #10b981 (emerald-500) — success, sync status, positive changes

### Semantic
- Success: #30A46C (emerald)
- Warning: #F5A623 (amber)
- Danger: #E5484D (red)
- Info: #3B82F6 (blue)

### Inverted (for light-on-dark emphasis)
- White buttons: zinc-100 bg, zinc-950 text
- Light cards: zinc-100 bg (rare, used for feature highlights on landing page only)

## Typography

### Font Families
- Sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif
- Mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace

### Type Scale
- Hero: 96px (text-8xl), font-black, tracking-[-0.05em], leading-[0.95]
- H1: 48px (text-5xl), font-black, tracking-tighter
- H2: 36px (text-4xl), font-black, tracking-[-0.03em]
- H3: 24px (text-2xl), font-bold
- H4: 18px (text-lg), font-bold
- Body: 14px (text-sm), font-normal
- Caption: 12px (text-xs), font-medium
- Micro: 10px (text-[10px]), font-bold, uppercase, tracking-widest or tracking-[0.2em]

### Heading Rules
- All headings: text-zinc-100, font-extrabold, tracking-[-0.03em]
- text-balance for natural line wrapping

## Spacing

- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 160px
- Section padding: p-6 (24px) on mobile, lg:p-10 (40px) on desktop
- Card padding: p-4 (16px) compact, p-5 (20px) standard, p-10 (40px) large bento
- Gap between cards: gap-3 (12px) compact, gap-4 (16px) standard, gap-6 (24px) sections

## Border Radius

- Small (badges, tags): rounded-md (6px)
- Medium (buttons, inputs): rounded-lg (8px) or rounded-xl (12px)
- Large (cards): rounded-xl (12px)
- Extra large (bento cards, panels): rounded-2xl (16px) or rounded-3xl (24px)
- Hero panels: rounded-[2rem] (32px)
- Full (avatars, dots): rounded-full

## Shadows

- Glass panel: `inset 0 1px 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)`
- Bento card: `inset 0 1px 1px rgba(255,255,255,0.03)` (very subtle)
- Premium button: `0 0 20px rgba(255,255,255,0.1)` → hover: `0 0 30px rgba(255,255,255,0.2)`
- No shadows on regular cards (borders only)

## Components

### Buttons
- Premium (primary CTA): bg-zinc-100, text-zinc-950, font-bold, rounded-2xl, px-8 py-4, glow shadow
- Outline (secondary): transparent bg, border border-zinc-700, text-zinc-100, rounded-2xl
- Action (in-context): text-xs, bg-brand-primary or bg-zinc-800, px-3 py-1.5, rounded-lg
- Danger: text-red-400 on hover (icon buttons only)
- Active state: active:scale-[0.98]

### Inputs
- Background: bg-zinc-900 or bg-zinc-900/50
- Border: border-zinc-700 (default), border-zinc-500 (focus)
- Text: text-zinc-100, placeholder:text-zinc-500
- Padding: pl-3 pr-10 py-3 (standard), pl-20 for inputs with left icons
- Border radius: rounded-xl

### Cards
- Standard: `rounded-xl border border-zinc-800 bg-[#0a0a0a]` + `hover:border-zinc-600 cursor-pointer transition-colors`
- With accent bar: `relative overflow-hidden` + `absolute top-0 left-0 w-1 h-full bg-brand-primary`
- Glass: `.glass-panel` utility class
- Bento: `.bento-card` utility class (rounded-[2rem], hover border animation)

### Navigation
- Global nav (left rail): w-16, bg-[#050505], icon buttons w-10 h-10 rounded-xl
- Context nav (sidebar): w-[260px], bg-[#0a0a0a], collapsible with motion animation
- Nav items: h-9, rounded-lg, px-3, text-sm. Active: bg-zinc-800 text-zinc-100. Inactive: text-zinc-400

### Avatars
- Small: w-7 h-7 rounded-full (header stacking)
- Medium: w-8 h-8 rounded-full (chat messages)
- Large: w-10 h-10 rounded-full (profile)
- Stacking: -space-x-2 with border-2 border-[#0a0a0a]

### Status Indicators
- Synced/Online: w-2 h-2 rounded-full bg-emerald-500
- Pending/Warning: bg-amber-500
- Error: bg-red-500
- AI active: bg-brand-primary with animate-pulse

### Tags & Badges
- Tag: text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400
- Status badge: text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider
  - Review: bg-amber-500/20 text-amber-400
  - Completed: bg-emerald-500/20 text-emerald-400

### Chat Messages
- AI message: bg-zinc-900/50 p-4 rounded-xl rounded-tl-sm border border-zinc-800/50
- AI proactive: bg-brand-primary/5 border border-brand-primary/20
- User message: no bubble, just text
- Avatar + name + timestamp layout in all messages

## Layout

### Dashboard Structure
- Full height: h-screen, flex, overflow-hidden
- 3 columns: GlobalNav (w-16 fixed) + ContextNav (w-[260px] collapsible) + Content (flex-1)
- Header: h-16, border-b border-zinc-800/80, bg-[#0a0a0a]
- Content area: bg-[#050505]

### Landing Page
- Full-bleed sections with py-40 px-6
- Max width: max-w-7xl for content, max-w-5xl for hero text, max-w-4xl for pricing
- Bento grid: grid-cols-12 with col-span-8 / col-span-4 alternating

## Animation

- Library: `motion` (framer-motion)
- Sidebar collapse: width 0→260, opacity 0→1, duration 0.2s
- Modal: scale 0.95→1, y 20→0, opacity 0→1
- Page entry: y 30→0, opacity 0→1, duration 0.8s, ease [0.16, 1, 0.3, 1]
- Hover transitions: duration-300 to duration-500 (slower for dramatic effect on bento)
- Icon color swap on group hover: transition-colors duration-500

## Anti-Patterns (NEVER DO)

- Never use light backgrounds (white, gray-50) in the dashboard
- Never use Tailwind default shadows (shadow-sm, shadow-md) — use custom only
- Never use generic sans-serif — always Plus Jakarta Sans
- Never use rounded-md for cards (too small — use rounded-xl minimum)
- Never use primary blue as background color — only for accents and CTAs
- Never hardcode colors as hex in components — use theme tokens (bg-bg-base, etc.)
