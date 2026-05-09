import { Composition } from 'remotion';
import { PractiqDemo, FPS, DURATION_SECONDS, WIDTH, HEIGHT } from './PractiqDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Legacy generic composition — kept for back-compat (re-renders demo-v2.mp4) */}
      <Composition
        id="PractiqDemo"
        component={PractiqDemo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          vertical: 'generic' as const,
          captureUrl: 'capture-timewarped.mp4',
          audioUrl: 'audio.mp3',
          subtitle: 'for boutique professional firms',
        }}
      />
      <Composition
        id="PractiqDemoCpa"
        component={PractiqDemo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          vertical: 'cpa' as const,
          captureUrl: 'capture-timewarped.mp4',
          audioUrl: 'audio-cpa.mp3',
          subtitle: 'for boutique CPA firms',
        }}
      />
      <Composition
        id="PractiqDemoLaw"
        component={PractiqDemo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          vertical: 'law' as const,
          captureUrl: 'capture-cropped.mp4',
          audioUrl: 'audio-law.mp3',
          subtitle: 'for boutique law firms',
        }}
      />
      <Composition
        id="PractiqDemoHr"
        component={PractiqDemo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          vertical: 'hr' as const,
          captureUrl: 'capture-cropped.mp4',
          audioUrl: 'audio-hr.mp3',
          subtitle: 'for boutique HR consulting firms',
        }}
      />
    </>
  );
};
