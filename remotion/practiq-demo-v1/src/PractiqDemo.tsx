import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FPS = 30;
export const DURATION_SECONDS = 62; // 1860 frames; audio is 61.58s
export const WIDTH = 1920;
export const HEIGHT = 1080;

// ---- Brand tokens (DESIGN.md, Practiq dark) ----
const BG_BASE = '#050505';
const BG_SURFACE = '#0a0a0a';
const BG_CARD = '#111111';
const BG_ELEVATED = '#141414';
const BORDER = '#27272a';
const BORDER_STRONG = '#3f3f46';
const TEXT_PRIMARY = '#f4f4f5';
const TEXT_BODY = '#a1a1aa';
const TEXT_MUTED = '#71717a';
const BRAND_BLUE = '#2563eb';
const ACCENT_EMERALD = '#10b981';
const ACCENT_RED = '#E5484D';

// Typography stack matches Practiq landing page (Inter / system).
const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// Scene timings (seconds). Hand-tuned to match the ElevenLabs voiceover.
const T = {
  title: { start: 0, end: 6.5 },
  input: { start: 6.5, end: 17.0 },
  processing: { start: 17.0, end: 25.0 },
  output: { start: 25.0, end: 47.0 },
  proof: { start: 47.0, end: 56.0 },
  closer: { start: 56.0, end: 62.0 },
};

const sec = (s: number) => Math.round(s * FPS);
const dur = (a: { start: number; end: number }) => sec(a.end - a.start);

// ============= ROOT =============
export const PractiqDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG_BASE, fontFamily: FONT_STACK }}>
      {/* Subtle ambient gradient */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(37,99,235,0.08) 0%, rgba(0,0,0,0) 55%), radial-gradient(ellipse at 75% 85%, rgba(79,70,229,0.05) 0%, rgba(0,0,0,0) 50%)',
        }}
      />

      <Audio src={staticFile('audio.mp3')} />

      <Sequence from={sec(T.title.start)} durationInFrames={dur(T.title)}>
        <SceneTitle />
      </Sequence>

      <Sequence from={sec(T.input.start)} durationInFrames={dur(T.input)}>
        <SceneInput />
      </Sequence>

      <Sequence from={sec(T.processing.start)} durationInFrames={dur(T.processing)}>
        <SceneProcessing />
      </Sequence>

      <Sequence from={sec(T.output.start)} durationInFrames={dur(T.output)}>
        <SceneOutput />
      </Sequence>

      <Sequence from={sec(T.proof.start)} durationInFrames={dur(T.proof)}>
        <SceneProof />
      </Sequence>

      <Sequence from={sec(T.closer.start)} durationInFrames={dur(T.closer)}>
        <SceneCloser />
      </Sequence>

      {/* persistent corner mark */}
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
const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const sub = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        opacity: interpolate(frame, [dur(T.title) - 12, dur(T.title)], [1, 0], {
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
        for boutique professional firms
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
        60-second product look
      </div>
    </AbsoluteFill>
  );
};

// ============= SCENE 2: INPUT =============
const DocIcon: React.FC<{
  title: string;
  subtitle?: string;
  delay: number;
  fromX?: number;
  highlight?: boolean;
}> = ({ title, subtitle, delay, fromX = -200, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 80 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [fromX, 0])}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '18px 22px',
        backgroundColor: BG_CARD,
        border: `1px solid ${highlight ? BRAND_BLUE : BORDER}`,
        borderRadius: 14,
        minWidth: 460,
        boxShadow: highlight ? `0 0 0 4px rgba(37,99,235,0.18)` : 'none',
      }}
    >
      <WordDocSvg />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, color: TEXT_PRIMARY, fontWeight: 500 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 4 }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
};

const WordDocSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 44,
  color = '#2b7cd3',
}) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 40 48" fill="none">
    <path
      d="M4 4h22l10 10v30a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
      fill={color}
    />
    <path d="M26 4l10 10h-10V4z" fill="#1a5aa3" />
    <text
      x="20"
      y="33"
      fontSize="13"
      fontWeight="700"
      fill="#fff"
      fontFamily="Inter, sans-serif"
      textAnchor="middle"
    >
      W
    </text>
  </svg>
);

const SceneInput: React.FC = () => {
  const frame = useCurrentFrame();
  const localDur = dur(T.input);
  const opacity = interpolate(frame, [0, 12, localDur - 12, localDur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 80,
      }}
    >
      {/* Left: input docs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <DocIcon
          title="Q3 close memo — draft.docx"
          subtitle="your draft"
          delay={6}
          highlight
        />
        <div style={{ height: 12 }} />
        <DocIcon
          title="2025 Q3 close memo.docx"
          subtitle="prior memo for this client"
          delay={36}
          fromX={-250}
        />
        <DocIcon
          title="2026 Q1 close memo.docx"
          subtitle="prior memo for this client"
          delay={56}
          fromX={-250}
        />
      </div>

      {/* Arrow */}
      <ArrowFlow startFrame={80} />

      {/* Right: Practiq box */}
      <PractiqBox delay={20} />
    </AbsoluteFill>
  );
};

const ArrowFlow: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const len = interpolate(f, [0, 28], [0, 140], { extrapolateRight: 'clamp' });
  return (
    <svg width="160" height="60" viewBox="0 0 160 60">
      <line
        x1="0"
        y1="30"
        x2={len}
        y2="30"
        stroke={BRAND_BLUE}
        strokeWidth="3"
        strokeDasharray="0"
      />
      <polygon
        points={`${len},22 ${len + 16},30 ${len},38`}
        fill={BRAND_BLUE}
        opacity={interpolate(f, [20, 28], [0, 1], { extrapolateRight: 'clamp' })}
      />
    </svg>
  );
};

const PractiqBox: React.FC<{ delay: number; pulse?: boolean }> = ({ delay, pulse }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - delay);
  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 80 } });
  const pulseOpacity = pulse ? 0.4 + 0.4 * Math.sin(frame * 0.12) : 0;
  return (
    <div
      style={{
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
        position: 'relative',
        padding: '36px 56px',
        backgroundColor: BG_ELEVATED,
        border: `1px solid ${BRAND_BLUE}`,
        borderRadius: 20,
        boxShadow: `0 0 60px rgba(37,99,235,${0.18 + pulseOpacity})`,
        minWidth: 220,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 16,
          color: TEXT_MUTED,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        process
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, color: TEXT_PRIMARY, letterSpacing: -0.5 }}>
        Practiq
      </div>
    </div>
  );
};

// ============= SCENE 3: PROCESSING =============
const SceneProcessing: React.FC = () => {
  const frame = useCurrentFrame();
  const localDur = dur(T.processing);
  const opacity = interpolate(frame, [0, 10, localDur - 12, localDur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Three captions tick by; each appears in sequence.
  const captions = [
    { t: 'reading prior memos', start: 8 },
    { t: 'cross-checking voice & phrasing', start: 60 },
    { t: 'generating tracked changes', start: 130 },
  ];
  const progress = interpolate(frame, [10, localDur - 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 56,
      }}
    >
      <PractiqBox delay={0} pulse />

      <div
        style={{
          width: 720,
          height: 8,
          backgroundColor: BG_CARD,
          borderRadius: 999,
          overflow: 'hidden',
          border: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${BRAND_BLUE}, #4f46e5)`,
            transition: 'width 60ms linear',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 130 }}>
        {captions.map((c, i) => {
          const f = Math.max(0, frame - c.start);
          const op = interpolate(f, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
          const ty = interpolate(f, [0, 12], [10, 0], { extrapolateRight: 'clamp' });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${ty}px)`,
                color: TEXT_BODY,
                fontSize: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <CheckIcon
                done={frame > c.start + 30}
                spinning={frame >= c.start && frame <= c.start + 30}
              />
              <span>{c.t}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CheckIcon: React.FC<{ done: boolean; spinning: boolean }> = ({ done, spinning }) => {
  const frame = useCurrentFrame();
  if (done) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="10" fill={ACCENT_EMERALD} opacity="0.18" />
        <path
          d="M6 11l3.5 3.5L16 8"
          stroke={ACCENT_EMERALD}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  if (spinning) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: `rotate(${frame * 12}deg)` }}>
        <circle cx="11" cy="11" r="9" stroke={BORDER_STRONG} strokeWidth="2" fill="none" />
        <path
          d="M11 2 a9 9 0 0 1 9 9"
          stroke={BRAND_BLUE}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="9" stroke={BORDER_STRONG} strokeWidth="2" fill="none" />
    </svg>
  );
};

// ============= SCENE 4: OUTPUT =============
const SceneOutput: React.FC = () => {
  const frame = useCurrentFrame();
  const localDur = dur(T.output);
  const opacity = interpolate(frame, [0, 10, localDur - 14, localDur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Phase 1: doc icon emerges (0-1.5s)
  // Phase 2: Word window opens (1.5-4s)
  // Phase 3: tracked changes redline (4-22s)
  const docOpen = interpolate(frame, [30, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center', justifyContent: 'center' }}>
      {/* The output doc icon — fades to small position top-left as Word opens */}
      <div
        style={{
          position: 'absolute',
          left: interpolate(docOpen, [0, 1], [WIDTH / 2 - 230, 130]),
          top: interpolate(docOpen, [0, 1], [HEIGHT / 2 - 60, 90]),
          transform: `scale(${interpolate(docOpen, [0, 1], [1.2, 0.6])})`,
          opacity: interpolate(frame, [0, 12, 90, 110], [0, 1, 1, 0.5], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <DocIconStandalone title="Q3 close memo — redlined.docx" />
      </div>

      {/* Word window appears */}
      <div
        style={{
          opacity: docOpen,
          transform: `scale(${interpolate(docOpen, [0, 1], [0.9, 1])})`,
        }}
      >
        <WordWindow />
      </div>
    </AbsoluteFill>
  );
};

const DocIconStandalone: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      padding: '24px 32px',
      backgroundColor: BG_CARD,
      border: `1px solid ${ACCENT_EMERALD}`,
      borderRadius: 14,
      boxShadow: `0 0 50px rgba(16,185,129,0.20)`,
    }}
  >
    <WordDocSvg size={64} />
    <div style={{ fontSize: 20, color: TEXT_PRIMARY, fontWeight: 500 }}>{title}</div>
  </div>
);

const WordWindow: React.FC = () => {
  const frame = useCurrentFrame();
  // Frame is local to scene-output sequence; redline reveal starts ~120 frames in
  const reveal = (start: number, end: number) =>
    interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const r1 = reveal(150, 200);
  const r2 = reveal(220, 280);
  const r3 = reveal(310, 370);
  const r4 = reveal(400, 460);
  const sidebar = reveal(150, 220);

  return (
    <div
      style={{
        width: 1500,
        height: 820,
        backgroundColor: '#1f1f1f',
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${BORDER}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 42,
          backgroundColor: '#2b2b2b',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          gap: 12,
          borderBottom: `1px solid #1a1a1a`,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f57' }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#febc2e' }} />
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#28c840' }} />
        </div>
        <div style={{ color: '#cfcfcf', fontSize: 14, marginLeft: 12 }}>
          Q3 close memo — redlined.docx — Microsoft Word
        </div>
      </div>
      {/* Word ribbon (faux) */}
      <div
        style={{
          height: 54,
          backgroundColor: '#262626',
          borderBottom: `1px solid #1a1a1a`,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: '0 22px',
          color: '#a0a0a0',
          fontSize: 13,
        }}
      >
        <span>File</span>
        <span>Home</span>
        <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>Review</span>
        <span>View</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span
            style={{
              padding: '4px 10px',
              border: `1px solid ${BRAND_BLUE}`,
              borderRadius: 6,
              color: BRAND_BLUE,
              fontSize: 12,
            }}
          >
            All Markup
          </span>
        </span>
      </div>
      {/* Body: page + sidebar */}
      <div style={{ display: 'flex', flex: 1, backgroundColor: '#1f1f1f' }}>
        {/* Page */}
        <div
          style={{
            flex: 1,
            margin: 32,
            backgroundColor: '#fafafa',
            color: '#1a1a1a',
            borderRadius: 6,
            padding: '64px 80px',
            fontFamily: 'Calibri, "Segoe UI", sans-serif',
            fontSize: 19,
            lineHeight: 1.6,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            Q3 Close Memo &mdash; Acme Coffee Roasters, Inc.
          </div>
          <div style={{ color: '#666', fontSize: 14, marginBottom: 28 }}>
            Prepared by Hartwell &amp; Co. CPAs &nbsp;·&nbsp; Period ending Sep 30
          </div>

          <p style={{ margin: '0 0 18px 0' }}>
            Inventory turnover for the quarter held steady{' '}
            <Strike active={r1}>at approximately 4.2x</Strike>{' '}
            <Ins active={r1}>at 4.16x (down from 4.31x in Q2)</Ins>, which we
            consider acceptable given seasonal green-coffee buying patterns we
            flagged in the 2025 Q3 memo.
          </p>

          <p style={{ margin: '0 0 18px 0' }}>
            <Strike active={r2}>The company should consider</Strike>{' '}
            <Ins active={r2}>We recommend the partner team consider</Ins>{' '}
            tightening receivables follow-up at 45 days, consistent with the
            policy adopted in Q1 2026.
          </p>

          <p style={{ margin: '0 0 18px 0' }}>
            <Ins active={r3}>
              Cash position remains comfortably above the 90-day runway floor
              the firm has historically used as the threshold for distribution
              decisions.{' '}
            </Ins>
          </p>

          <p style={{ margin: '0 0 18px 0' }}>
            We continue to recommend{' '}
            <Strike active={r4}>monthly</Strike>{' '}
            <Ins active={r4}>quarterly</Ins>{' '}
            review of the deferred-revenue schedule, matching the cadence we
            established in the 2025 Q3 memo.
          </p>
        </div>

        {/* Right sidebar — Reviewing pane */}
        <div
          style={{
            width: 380,
            backgroundColor: '#1a1a1a',
            borderLeft: `1px solid #0d0d0d`,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            opacity: sidebar,
          }}
        >
          <div
            style={{
              color: TEXT_BODY,
              fontSize: 13,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Reviewing pane
          </div>
          <CommentCard
            who="Practiq"
            change="Replaced approximate figure with exact value"
            citation="cites: 2025 Q3 close memo"
            visible={r1}
          />
          <CommentCard
            who="Practiq"
            change="Voice match: firm uses 'we recommend the partner team'"
            citation="cites: 2026 Q1 close memo"
            visible={r2}
          />
          <CommentCard
            who="Practiq"
            change="Added cash-runway paragraph; firm convention"
            citation="cites: 2025 Q3 close memo"
            visible={r3}
          />
          <CommentCard
            who="Practiq"
            change="Cadence change: monthly → quarterly"
            citation="cites: 2025 Q3 close memo"
            visible={r4}
          />
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <PillBtn label="Accept" color={ACCENT_EMERALD} />
            <PillBtn label="Reject" color={ACCENT_RED} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Ins: React.FC<{ active: number; children: React.ReactNode }> = ({ active, children }) => (
  <span
    style={{
      backgroundColor: `rgba(16,185,129,${0.18 * active})`,
      color: active > 0.05 ? '#0e8a64' : 'transparent',
      borderBottom: active > 0.5 ? `1px solid ${ACCENT_EMERALD}` : 'none',
      transition: 'all 0.2s',
      padding: '0 2px',
    }}
  >
    {children}
  </span>
);

const Strike: React.FC<{ active: number; children: React.ReactNode }> = ({
  active,
  children,
}) => (
  <span
    style={{
      color: active > 0.05 ? '#a84444' : '#1a1a1a',
      backgroundColor: `rgba(229,72,77,${0.10 * active})`,
      textDecoration: active > 0.5 ? 'line-through' : 'none',
      transition: 'all 0.2s',
      padding: '0 2px',
    }}
  >
    {children}
  </span>
);

const CommentCard: React.FC<{
  who: string;
  change: string;
  citation: string;
  visible: number;
}> = ({ who, change, citation, visible }) => (
  <div
    style={{
      opacity: visible,
      transform: `translateX(${interpolate(visible, [0, 1], [10, 0])}px)`,
      backgroundColor: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: '10px 12px',
    }}
  >
    <div style={{ color: BRAND_BLUE, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
      {who}
    </div>
    <div style={{ color: TEXT_PRIMARY, fontSize: 14, lineHeight: 1.4 }}>{change}</div>
    <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
      {citation}
    </div>
  </div>
);

const PillBtn: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div
    style={{
      flex: 1,
      textAlign: 'center',
      padding: '8px 12px',
      borderRadius: 8,
      border: `1px solid ${color}`,
      color,
      fontSize: 14,
      fontWeight: 600,
    }}
  >
    {label}
  </div>
);

// ============= SCENE 5: PROOF =============
const SceneProof: React.FC = () => {
  const frame = useCurrentFrame();
  const localDur = dur(T.proof);
  const opacity = interpolate(frame, [0, 10, localDur - 10, localDur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const items = [
    { num: '5', label: 'boutique firms in pilot' },
    { num: '140', label: 'client CPA design partner' },
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
        const start = 8 + i * 24;
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
              minWidth: 360,
              minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: 84,
                fontWeight: 600,
                color: TEXT_PRIMARY,
                letterSpacing: -2,
                lineHeight: 1,
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

// ============= SCENE 6: CLOSER =============
const SceneCloser: React.FC = () => {
  const frame = useCurrentFrame();
  const localDur = dur(T.closer);
  const opacity = interpolate(frame, [0, 10, localDur - 8, localDur], [0, 1, 1, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const chipOp = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: 'clamp' });
  const chipScale = spring({
    frame: Math.max(0, frame - 22),
    fps: FPS,
    config: { damping: 14 },
  });
  const emailOp = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      <div
        style={{
          opacity: lineOp,
          fontSize: 44,
          color: TEXT_PRIMARY,
          fontWeight: 500,
          letterSpacing: -0.5,
          textAlign: 'center',
          maxWidth: 1100,
        }}
      >
        If this is the wedge for your shop —
      </div>
      <div
        style={{
          opacity: chipOp,
          transform: `scale(${interpolate(chipScale, [0, 1], [0.9, 1])})`,
          padding: '20px 36px',
          backgroundColor: BRAND_BLUE,
          color: '#fff',
          fontSize: 32,
          borderRadius: 14,
          fontWeight: 600,
          letterSpacing: 0.3,
          boxShadow: `0 0 50px rgba(37,99,235,0.40)`,
        }}
      >
        reply: yes
      </div>
      <div
        style={{
          opacity: emailOp,
          fontSize: 22,
          color: TEXT_BODY,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      >
        seungdo.keum@practiq.dev
      </div>
    </AbsoluteFill>
  );
};
