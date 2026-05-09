import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FPS = 30;
export const DURATION_SECONDS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type Vertical = 'cpa' | 'law' | 'hr' | 'generic';

export interface PractiqDemoProps {
  vertical: Vertical;
  captureUrl: string;
  audioUrl: string;
  subtitle: string;
}

// ---- Brand tokens (DESIGN.md, Practiq dark) ----
const BG_BASE = '#050505';
const BG_CARD = '#111111';
const BG_ELEVATED = '#141414';
const BORDER = '#27272a';
const BORDER_STRONG = '#3f3f46';
const TEXT_PRIMARY = '#f4f4f5';
const TEXT_BODY = '#a1a1aa';
const TEXT_MUTED = '#71717a';
const BRAND_BLUE = '#2563eb';

const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// Scene timings (seconds).
// Capture is now ~13.5s (timewarped). Voiceover is ~55-60s.
const T = {
  title: { start: 0, end: 5 },
  capture: { start: 5, end: 19 },
  pricing: { start: 19, end: 32 },
  closer: { start: 32, end: 60 },
};

const sec = (s: number) => Math.round(s * FPS);
const dur = (a: { start: number; end: number }) => sec(a.end - a.start);

// ============= ROOT =============
export const PractiqDemo: React.FC<PractiqDemoProps> = ({
  vertical,
  captureUrl,
  audioUrl,
  subtitle,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG_BASE, fontFamily: FONT_STACK }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.08) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at 75% 85%, rgba(79,70,229,0.05) 0%, rgba(0,0,0,0) 50%)',
        }}
      />

      <Audio src={staticFile(audioUrl)} />

      <Sequence from={sec(T.title.start)} durationInFrames={dur(T.title)}>
        <SceneTitle subtitle={subtitle} />
      </Sequence>

      <Sequence from={sec(T.capture.start)} durationInFrames={dur(T.capture)}>
        <SceneCapture captureUrl={captureUrl} />
      </Sequence>

      <Sequence from={sec(T.pricing.start)} durationInFrames={dur(T.pricing)}>
        <ScenePricing vertical={vertical} />
      </Sequence>

      <Sequence from={sec(T.closer.start)} durationInFrames={dur(T.closer)}>
        <SceneCloser />
      </Sequence>

      <CornerMark />
    </AbsoluteFill>
  );
};

const CornerMark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 36,
      right: 48,
      fontSize: 18,
      color: TEXT_MUTED,
      letterSpacing: 0.5,
    }}
  >
    practiq.dev
  </div>
);

// ============= SCENE 1: TITLE =============
const SceneTitle: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localDur = dur(T.title);
  const fade = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const sub = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        opacity: interpolate(frame, [localDur - 12, localDur], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      }}
    >
      <div
        style={{
          opacity: fade,
          transform: `translateY(${interpolate(fade, [0, 1], [12, 0])}px)`,
          fontSize: 132,
          fontWeight: 600,
          letterSpacing: -2,
          color: TEXT_PRIMARY,
        }}
      >
        Practiq
      </div>
      <div
        style={{
          opacity: sub,
          marginTop: 24,
          fontSize: 28,
          color: TEXT_BODY,
          letterSpacing: 0.3,
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          opacity: sub,
          marginTop: 56,
          padding: '8px 16px',
          border: `1px solid ${BORDER_STRONG}`,
          borderRadius: 999,
          fontSize: 18,
          color: TEXT_MUTED,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        live demo · practiq.dev/demo
      </div>
    </AbsoluteFill>
  );
};

// ============= SCENE 2: CAPTURE =============
// Real screen capture of practiq.dev/demo embedded as OffthreadVideo.
const SceneCapture: React.FC<{ captureUrl: string }> = ({ captureUrl }) => {
  const frame = useCurrentFrame();
  const localDur = dur(T.capture);
  const opacity = interpolate(frame, [0, 14, localDur - 16, localDur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Browser-window chrome around the capture */}
      <div
        style={{
          width: 1760,
          height: 980,
          backgroundColor: '#1a1a1a',
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${BORDER_STRONG}`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Browser title bar */}
        <div
          style={{
            height: 44,
            backgroundColor: '#262626',
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            gap: 14,
            borderBottom: `1px solid #1a1a1a`,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f57' }} />
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#febc2e' }} />
            <span style={{ width: 12, height: 12, borderRadius: 6, background: '#28c840' }} />
          </div>
          <div
            style={{
              marginLeft: 16,
              flex: 1,
              maxWidth: 520,
              padding: '6px 14px',
              backgroundColor: '#1a1a1a',
              borderRadius: 8,
              color: '#a0a0a0',
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            practiq.dev/demo
          </div>
        </div>

        {/* The embedded screen capture, fills remaining area */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#050505' }}>
          <OffthreadVideo
            src={staticFile(captureUrl)}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============= SCENE 3: PRICING =============
const ScenePricing: React.FC<{ vertical: Vertical }> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const localDur = dur(T.pricing);
  const opacity = interpolate(frame, [0, 14, localDur - 14, localDur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const verticalLabel: Record<Vertical, string> = {
    cpa: 'boutique CPA firms',
    law: 'boutique law firms',
    hr: 'boutique HR consulting firms',
    generic: 'boutique professional firms',
  };

  const items = [
    { num: 'Pre-launch', label: 'looking for the first design partners' },
    { num: '50–200', label: `client range — ${verticalLabel[vertical]}` },
    { num: '$15', label: 'per client, per month — no annual contract' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 36,
      }}
    >
      {items.map((it, i) => {
        const start = 8 + i * 18;
        const f = Math.max(0, frame - start);
        const op = interpolate(f, [0, 16], [0, 1], { extrapolateRight: 'clamp' });
        const ty = interpolate(f, [0, 16], [24, 0], { extrapolateRight: 'clamp' });
        return (
          <div
            key={i}
            style={{
              opacity: op,
              transform: `translateY(${ty}px)`,
              backgroundColor: BG_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: '40px 36px',
              minWidth: 380,
              minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: it.num.length > 6 ? 56 : 84,
                fontWeight: 600,
                color: TEXT_PRIMARY,
                letterSpacing: -2,
                lineHeight: 1.05,
              }}
            >
              {it.num}
            </div>
            <div style={{ fontSize: 22, color: TEXT_BODY, lineHeight: 1.4 }}>{it.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ============= SCENE 4: CLOSER =============
const SceneCloser: React.FC = () => {
  const frame = useCurrentFrame();
  const localDur = dur(T.closer);
  const opacity = interpolate(frame, [0, 12, localDur - 8, localDur], [0, 1, 1, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const tryOp = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: 'clamp' });
  const tryScale = spring({
    frame: Math.max(0, frame - 22),
    fps: FPS,
    config: { damping: 14 },
  });
  const replyOp = interpolate(frame, [56, 80], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      <div
        style={{
          opacity: lineOp,
          fontSize: 38,
          color: TEXT_BODY,
          fontWeight: 400,
          letterSpacing: -0.2,
          textAlign: 'center',
        }}
      >
        Try it yourself
      </div>
      <div
        style={{
          opacity: tryOp,
          transform: `scale(${interpolate(tryScale, [0, 1], [0.9, 1])})`,
          padding: '20px 40px',
          backgroundColor: BG_ELEVATED,
          border: `1px solid ${BRAND_BLUE}`,
          color: TEXT_PRIMARY,
          fontSize: 36,
          borderRadius: 14,
          fontWeight: 500,
          letterSpacing: 0.3,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          boxShadow: `0 0 50px rgba(37,99,235,0.30)`,
        }}
      >
        practiq.dev/demo
      </div>
      <div
        style={{
          opacity: replyOp,
          marginTop: 12,
          fontSize: 24,
          color: TEXT_BODY,
        }}
      >
        — or reply <span style={{ color: BRAND_BLUE, fontWeight: 600 }}>yes</span> for a 15-min call
      </div>
    </AbsoluteFill>
  );
};
