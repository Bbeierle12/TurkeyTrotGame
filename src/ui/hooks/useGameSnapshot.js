import { useEffect, useState } from 'react';

export function useGameSnapshot(engine) {
  const [snapshot, setSnapshot] = useState(() => engine?.getSnapshot?.() ?? null);

  useEffect(() => {
    if (!engine) return undefined;

    const update = (detail) => {
      setSnapshot(detail ?? engine.getSnapshot());
    };

    update();

    const offState = engine.onEvent?.('STATE_CHANGED', update);
    const offPhase = engine.onEvent?.('PHASE_CHANGED', update);
    const offWaveStart = engine.onEvent?.('WAVE_STARTED', update);
    const offWaveComplete = engine.onEvent?.('WAVE_COMPLETED', update);

    return () => {
      offState?.();
      offPhase?.();
      offWaveStart?.();
      offWaveComplete?.();
    };
  }, [engine]);

  return snapshot;
}
