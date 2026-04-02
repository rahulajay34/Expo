'use client';

import { createContext, useContext, useState } from 'react';

interface GenerationContextValue {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
}

const GenerationContext = createContext<GenerationContextValue>({
  isGenerating: false,
  setIsGenerating: () => {},
  isDirty: false,
  setIsDirty: () => {},
});

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <GenerationContext.Provider value={{ isGenerating, setIsGenerating, isDirty, setIsDirty }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGenerationContext() {
  return useContext(GenerationContext);
}
