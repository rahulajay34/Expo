# Category: Testing & Quality Assurance

**Suggestions:** S-053 through S-060 (8 items)
**Dependencies:** S-053 is foundational (sets up Vitest). S-054..S-057 depend on S-053. S-058/S-060 depend on Playwright setup.
**Overall complexity:** Medium

| ID | Summary | Files Affected | Complexity |
|----|---------|---------------|------------|
| S-053 | Vitest + first mermaid validator test | package.json, vitest.config.ts, validation/mermaid.test.ts | Medium |
| S-054 | Unit-test SSE streaming parser | ai/client.test.ts | Medium |
| S-055 | Unit-test pipeline section parser | ai/pipeline.test.ts | Medium |
| S-056 | Unit-test CSV assignment parser | export/csv.test.ts | Medium |
| S-057 | Unit-test storage layer | storage.test.ts | Medium |
| S-058 | Playwright smoke test | playwright.config.ts, e2e/ | Medium |
| S-059 | tsc --noEmit + next lint in npm test | package.json | Low |
| S-060 | Playwright visual regression | e2e/visual.spec.ts | Medium |
