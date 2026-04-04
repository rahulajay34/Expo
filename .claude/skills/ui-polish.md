---
name: ui-polish
description: Iterative UI refinement with design system compliance - reads ui-state.md for context, validates changes against design tokens, handles mermaid/dynamic styles
user_invocable: true
---

# UI Polish Workflow

Use this for any visual/styling task. Prevents the common failure mode of guessing at visual intent and producing changes that don't converge.

## Step 1: Load Design Context

Read `.claude/ui-state.md` to understand:
- Current color tokens (light/dark CSS variables)
- Typography scale
- Spacing and radius conventions
- Component inventory and their current state

Also read `src/app/globals.css` for CSS custom properties and `tailwind.config.ts` for theme extensions.

## Step 2: Clarify Visual Intent

If the user's request is vague (e.g., "make it look better", "fix the spacing"), ask ONE clarifying question with concrete options:
```
Which direction?
A) Tighter spacing (reduce padding from 24px to 16px)
B) More breathing room (increase to 32px)
C) Something else - please share target values or a reference
```

If the user provides specific values or a screenshot, skip this step.

## Step 3: Implement with Exact Values

- Use design system tokens from `ui-state.md` - do not introduce ad-hoc colors or sizes
- For Tailwind classes, use the project's custom theme values
- For CSS custom properties, match the existing naming convention
- If dark mode exists, update BOTH light and dark variants

## Step 4: Handle Dynamic/Injected Styles

For components with dynamic styles (mermaid diagrams, syntax highlighting, KaTeX):
- These libraries inject their own CSS that overrides static styles
- Use `!important` or more specific selectors when needed
- Verify the change actually takes effect by checking specificity

## Step 5: Verify

1. Run `npx tsc --noEmit` to catch any type errors from style-related changes
2. If you changed CSS custom properties, verify they're used consistently in both themes
3. Report what changed with specific values (e.g., "padding: 24px -> 16px" not "reduced padding")
