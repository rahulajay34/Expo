---
name: bugfix
description: Thorough codebase-wide bug fixing - searches broadly for all instances of a pattern before applying fixes, then verifies with type checking
user_invocable: true
---

# Thorough Bug Fix Workflow

This workflow prevents the common failure mode of fixing only the surface symptom while missing the same bug pattern elsewhere in the codebase.

## Step 1: Understand the Bug

Read the file(s) the user mentions. Reproduce or understand the error from the description, stack trace, or screenshot provided.

## Step 2: Broad Pattern Search (CRITICAL)

Before writing any fix, search the ENTIRE codebase for all instances of the same pattern.

- Use Grep to find every occurrence of the problematic pattern
- Check related files that might have similar issues (e.g., if a Zustand selector is unstable in one file, check ALL files that use Zustand selectors)
- List ALL affected locations before proceeding

Present findings:
```
Found the bug in X locations:
- file1.tsx:42 - description
- file2.tsx:88 - description
- file3.tsx:15 - description
```

## Step 3: Root Cause Analysis

Identify the ROOT cause, not just the symptom. Ask:
- Why does this pattern cause the bug?
- Is this a systemic issue (wrong abstraction, missing utility) or isolated?
- Will fixing the symptom just move the problem elsewhere?

## Step 4: Fix ALL Instances

Apply the fix to EVERY affected location found in Step 2. Do not leave any instance unfixed.

## Step 5: Verify

Run verification in this order:
1. `npx tsc --noEmit` - catch type errors
2. `npm run build` - catch build errors
3. If either fails, fix the issue and re-verify

## Step 6: Report

Brief summary of:
- Root cause (1 sentence)
- What was fixed and where (bulleted list of files)
- Verification result (pass/fail)
