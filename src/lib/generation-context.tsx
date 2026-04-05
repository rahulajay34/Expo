'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

/** Token velocity band for UI consumers */
export type VelocityBand = 'fast' | 'normal' | 'slow' | 'stalled';

interface GenerationContextValue {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  /** Current tokens/second rate (smoothed) */
  tokenVelocity: number;
  /** Current velocity band classification */
  velocityBand: VelocityBand;
  /** Update token velocity — called from the streaming page */
  reportTokenVelocity: (tokensPerSecond: number) => void;
}

function classifyVelocity(rate: number, lastUpdateMs: number): VelocityBand {
  const stalledThreshold = 2000; // 2 seconds
  if (Date.now() - lastUpdateMs > stalledThreshold && rate < 1) return 'stalled';
  if (rate > 30) return 'fast';
  if (rate >= 10) return 'normal';
  if (rate > 0) return 'slow';
  return 'stalled';
}

const GenerationContext = createContext<GenerationContextValue>({
  isGenerating: false,
  setIsGenerating: () => {},
  isDirty: false,
  setIsDirty: () => {},
  tokenVelocity: 0,
  velocityBand: 'stalled',
  reportTokenVelocity: () => {},
});

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [tokenVelocity, setTokenVelocity] = useState(0);
  const [velocityBand, setVelocityBand] = useState<VelocityBand>('stalled');
  const lastUpdateRef = useRef(Date.now());

  const reportTokenVelocity = useCallback((tokensPerSecond: number) => {
    lastUpdateRef.current = Date.now();
    setTokenVelocity(tokensPerSecond);
    setVelocityBand(classifyVelocity(tokensPerSecond, lastUpdateRef.current));
  }, []);

  return (
    <GenerationContext.Provider value={{
      isGenerating, setIsGenerating,
      isDirty, setIsDirty,
      tokenVelocity, velocityBand,
      reportTokenVelocity,
    }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGenerationContext() {
  return useContext(GenerationContext);
}
