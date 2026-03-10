# State Management Strategy

## Zustand Store (useAppStore)
In-memory state for the current session. Split into:
- **Generation Config**: topic, subtopics, contentType, transcript, question counts
- **Pipeline State**: isGenerating, currentAgent, steps[], content, error, gapAnalysis, questions, costDetails
- **UI State**: sidebarOpen, pipelineExpanded, previewFullscreen, activeGenerationId

## IndexedDB (Dexie)
Persistent storage for generation history:
- Max 50 records, auto-prunes oldest
- Stores complete generation data including content, analysis, costs
- Used by Archives page and for restoring previous generations

## SheetForge Store (useSheetForgeStore)
Separate Zustand store for SheetForge configuration:
- Program settings, modules, grade bands, extras
- Computed: totalWeightage, isReady

## Data Flow
```
User Input → Zustand Store → API Call → SSE Stream → Zustand Updates → UI Renders
                                                          ↓
                                                    IndexedDB Save
```
