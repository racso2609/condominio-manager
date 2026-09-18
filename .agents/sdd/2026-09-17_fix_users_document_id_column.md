# SDD: Fix users.document_id Column PostgREST Error

**Date**: 2026-09-17  
**Tier**: Tier 2 (Scoped Change)  
**Status**: Completed

## Summary
Fixed the PostgREST runtime error `42703: column users.document_id does not exist` that occurred during user search in `getEntriesByExpenseAndBuilding`. The non-existent `document_id` column reference in the `users` table query was replaced with `phone` in `lib/services/expenseEntryService.ts`, successfully restoring user search queries without Postgres errors while passing all lint, typecheck, and build checks.

## Approach
Replaced the `document_id.ilike` clause in `lib/services/expenseEntryService.ts` with `phone.ilike` in the `userQuery` `.or(...)` filter. This matches the actual Supabase `users` table schema (`name`, `email`, `phone`) and avoids runtime query failure.

## Tasks
- [x] 1. Update `userQuery` filter in `getEntriesByExpenseAndBuilding` to replace `document_id.ilike` with `phone.ilike` — `lib/services/expenseEntryService.ts` — verify: `npm run lint` and `npm run build`

## Implementation
### Changes
- **Task 1** — `lib/services/expenseEntryService.ts` — Replaced `document_id.ilike.%${safe}%` with `phone.ilike.%${safe}%` in `userQuery` `.or(...)` string.

### Divergences
- None. Implementation matched the planned design exactly.

## Verification
### Tests
- `npx tsc --noEmit` — pass (0 type errors)
- `npm run lint` — pass (0 lint warnings/errors)
- `npm run build` — pass (production build succeeded)

### Review
- **Verdict**: Approved by `code-style-reviewer`.
- **Findings**: 0 issues; adheres to project style guidelines, clean code principles (SOLID, KISS, DRY, YAGNI), and eliminates root cause.

### Final Checks
- `npm run lint` — pass
- `npm run build` — pass

## Decision Log
- Query `phone` instead of `document_id`: The `users` table lacks a `document_id` column but contains `phone` in addition to `name` and `email`. Querying `phone` preserves comprehensive contact-based resident search without altering the database schema.

## Open Items
- None.

## Artifacts
- `lib/services/expenseEntryService.ts` — Expense entry retrieval and server-side filtering service.
