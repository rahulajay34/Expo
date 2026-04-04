---
name: suggest
description: Generate improvement suggestions for a feature area, present for approval, then delegate approved items to parallel agents
user_invocable: true
---

# Suggest-Approve-Delegate Workflow

This is the core workflow for iterative improvement. Follow these steps exactly.

## Step 1: Understand the Target Area

Read the relevant files for the area the user wants to improve. If they said "suggest improvements for the sidebar", read `src/components/Sidebar.tsx` and any related files. If they said "suggest UI improvements", scan the key pages and components.

Also read `.claude/ui-state.md` for current design system context.

## Step 2: Generate Suggestions

Present exactly **5-7 suggestions** as a numbered list. Each suggestion must have:
- A short title (5-8 words)
- A one-line description of what changes and why
- The file(s) that would be modified

Format:
```
1. **Title** - Description of the change and its benefit. (`file1.tsx`, `file2.tsx`)
2. **Title** - Description. (`file.tsx`)
...
```

Do NOT start implementing anything. Wait for the user to respond.

## Step 3: Process Approval

The user will respond with which numbers to implement (e.g., "1, 3, 5" or "do 2 and 4" or "all except 3"). They may also modify suggestions (e.g., "do 3 but use blue instead of green").

## Step 4: Parallel Implementation

For each approved suggestion:
- If suggestions are independent (different files), dispatch **parallel background agents** using the Agent tool, one per suggestion.
- If suggestions overlap on the same files, implement sequentially.
- Each agent must run `npx tsc --noEmit` after its edits to verify no type errors.

## Step 5: Report Results

After all agents complete, provide a brief summary:
```
Done. Implemented X of Y:
- [1] Title - files changed
- [3] Title - files changed
```

Do NOT provide lengthy explanations. The user can read the diffs.
