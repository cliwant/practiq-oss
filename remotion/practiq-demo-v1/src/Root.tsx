import { Composition } from 'remotion';
import { PractiqDemo, FPS, DURATION_SECONDS, WIDTH, HEIGHT } from './PractiqDemo';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PractiqDemo"
        component={PractiqDemo}
        durationInFrames={Math.round(FPS * DURATION_SECONDS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
