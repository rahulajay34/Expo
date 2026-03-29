'use client';

import { createContext, useContext, useState } from 'react';

interface GenerationContextValue {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

const GenerationContext = createContext<GenerationContextValue>({
  isGenerating: false,
  setIsGenerating: () => {},
});

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <GenerationContext.Provider value={{ isGenerating, setIsGenerating }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGenerationContext() {
  return useContext(GenerationContext);
}
