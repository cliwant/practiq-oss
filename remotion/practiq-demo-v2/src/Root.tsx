import { Composition } from 'remotion';
import { PractiqDemo, FPS, DURATION_SECONDS, WIDTH, HEIGHT } from './PractiqDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PractiqDemo"
        component={PractiqDemo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
