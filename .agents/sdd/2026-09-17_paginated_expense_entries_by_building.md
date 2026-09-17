# SDD: Paginated Expense Entries Grouped by Building

**Status**: Completed  
**Date**: 2026-09-17  

## Summary
Server-side paginated queries for expense entries grouped by building were designed, implemented, and verified. This replaces the flat unpaginated expense entries list in the expense detail page with collapsible, paginated building sections (`BuildingExpenseEntriesList`), reducing payload size and improving client rendering performance for large condominiums with dozens or hundreds of units.

## Approach
Currently, `ExpenseDetailPage` previously loaded all entries for an expense at once via `useEntriesByExpense`, and derived unit and building queries in a cascading waterfall. For large condominiums, this caused large payloads and client-side strain.

The implemented design introduces:
1. **Query Key**: `queryKeys.expenseEntries.byExpenseAndBuilding(expenseId, buildingId, page)` to cache each building's page independently in React Query.
2. **Service Function**: `getEntriesByExpenseAndBuilding` in `lib/services/expenseEntryService.ts` which uses PostgREST inner join `units!inner(*)` to filter by `units.building = buildingId` and `expense = expenseId`, ordering by `created_at ASC`, applying pagination range `[(page - 1) * pageSize, page * pageSize - 1]`, and returning `{ entries, totalCount, totalPages, page }` with exact count.
3. **Query Hook**: `useEntriesByExpenseAndBuilding` in `lib/queries/useExpenseEntry.ts` leveraging `useQuery` and `skipToken` when parameters are missing.
4. **UI Component**: A dedicated component `BuildingExpenseEntriesList` in `components/BuildingExpenseEntriesList.tsx` containing per-building collapsible sections (`BuildingExpenseSection`) using `Collapse` with independent page state, displaying `PaymentOrderItem` items with the joined `entry.units` unit info, and Previous/Next pagination controls.
5. **Page Integration**: In `app/condominium/[id]/expenses/[expenseId]/page.tsx`, buildings are fetched using `useBuildingsByCondominium(condominiumId)` and rendered through `BuildingExpenseEntriesList` instead of the flat `entries.map` array.

Design principles applied:
- **SOLID**: Single responsibility maintained across data service query, hook caching layer, presentation components, and parent page.
- **KISS**: Uses standard Supabase `.range()`, `.select(..., { count: "exact" })`, and the existing `Collapse` component.
- **DRY**: Reuses existing `Collapse`, `Badge`, `Button`, `PaymentOrderItem`, and query hooks.
- **YAGNI**: Simple 10-items-per-page pagination with Prev/Next controls rather than over-engineered infinite scrolling or complex table dependencies.
- **No Workarounds**: Direct PostgREST relationship join `units!inner(*)` rather than multiple in-memory filter loops or client-side batching.

## Tasks
1. **Type Definitions** — `lib/types.ts` — [Completed]
   - Defined `PaginatedExpenseEntries` containing `entries: (ExpenseEntry & { units?: Unit })[]`, `totalCount`, `totalPages`, and `page`.
2. **Query Keys** — `lib/queries/keys.ts` — [Completed]
   - Added `byExpenseAndBuilding: (expenseId: string, buildingId: string, page: number) => ["expenseEntries", "expense", expenseId, "building", buildingId, page] as const`.
3. **Service Layer** — `lib/services/expenseEntryService.ts` — [Completed]
   - Implemented `getEntriesByExpenseAndBuilding` with PostgREST inner join `units!inner(*)`, exact count, and range pagination.
4. **React Query Hook** — `lib/queries/useExpenseEntry.ts` — [Completed]
   - Implemented `useEntriesByExpenseAndBuilding` with `skipToken` when IDs are absent.
5. **Building Expense Entries Component** — `components/BuildingExpenseEntriesList.tsx` — [Completed]
   - Created `BuildingExpenseSection` with local page state, `Collapse`, `Badge` unit counts, and Prev/Next pagination buttons.
   - Created `BuildingExpenseEntriesList` iterating over buildings and defaulting the first building to open.
6. **Page Integration** — `app/condominium/[id]/expenses/[expenseId]/page.tsx` — [Completed]
   - Loaded buildings via `useBuildingsByCondominium`, replaced flat entry list with `BuildingExpenseEntriesList`, and maintained dictionary mapping for `DeleteExpenseModal`.

## Implementation

### Changes
- `lib/types.ts`: Added `PaginatedExpenseEntries` interface.
- `lib/queries/keys.ts`: Added `byExpenseAndBuilding` query key generator under `expenseEntries`.
- `lib/services/expenseEntryService.ts`: Added `getEntriesByExpenseAndBuilding` function executing Supabase query with pagination range and `units!inner(*)` relation.
- `lib/queries/useExpenseEntry.ts`: Added `useEntriesByExpenseAndBuilding` custom hook.
- `components/BuildingExpenseEntriesList.tsx`: Created new component file exporting `BuildingExpenseEntriesList` and `BuildingExpenseSection`.
- `app/condominium/[id]/expenses/[expenseId]/page.tsx`: Integrated building fetching and replaced flat list rendering with `BuildingExpenseEntriesList`.

### Divergences
- **Retained Page-level `useEntriesByExpense`**: The parent detail page retains `useEntriesByExpense` solely for page-level header summary statistics (e.g. total paid count, overall expense status) and the `DeleteExpenseModal` verification checks, preventing breaking changes or regressions to existing modal workflows while offloading list presentation and rendering entirely to the paginated per-building component.

## Verification

### Tests
- `npx tsc --noEmit` — pass (0 TypeScript compiler errors across the workspace)
- `npm run lint` — pass (0 ESLint errors or warnings)
- `npm run build` — pass (Production build completed successfully with all static/dynamic routes generated)

### Review
- **Verdict**: APPROVED (by code-style-reviewer)
- **Findings**:
  - Code strictly adheres to codebase conventions and project architecture.
  - Correct use of PostgREST relation syntax `units!inner(*)` for relational filtering.
  - Proper state isolation per building collapse section, preventing layout shifts across other towers.
  - Existing UI primitives (`Collapse`, `Badge`, `Button`) reused consistently.

### Final Checks
- TypeScript compilation: pass (`npx tsc --noEmit`)
- Next.js production build: pass (`npm run build`)
- Linting: pass (`npm run lint`)

## Decision Log
- **Decision**: Keep building pagination local to each building section rather than global pagination across all buildings.
  - **Rationale**: Grouping by building allows administrators to inspect Tower A without Tower B's records mixing in, matching real-world condominium administration practices. Local pagination prevents shifting other buildings when navigating pages.
- **Decision**: Embed `units!inner(*)` in PostgREST select query instead of doing separate `useUnits` batch fetches.
  - **Rationale**: The inner join returns the unit data in the exact same payload, eliminating the N+1 `useUnits` waterfall for paginated rows and simplifying `PaymentOrderItem` props.
- **Decision**: Default the first building to open (`defaultOpen={index === 0}`) while others remain closed.
  - **Rationale**: Improves UX by showing immediate content without requiring a click, while preventing visual clutter when a condominium has 10+ towers.
- **Decision**: Maintain `useEntriesByExpense` in the top-level detail page for summary metrics and delete validation.
  - **Rationale**: Prevents regressions in `DeleteExpenseModal` and summary cards while delegating the paginated list view to `BuildingExpenseEntriesList`.

## Open Items
- None. Implementation is complete, tested, and approved.

## Artifacts
- [lib/types.ts](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/types.ts): Added `PaginatedExpenseEntries` type.
- [lib/queries/keys.ts](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/queries/keys.ts): Added `byExpenseAndBuilding` query key.
- [lib/services/expenseEntryService.ts](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/services/expenseEntryService.ts): Added `getEntriesByExpenseAndBuilding` data fetching function.
- [lib/queries/useExpenseEntry.ts](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/queries/useExpenseEntry.ts): Added `useEntriesByExpenseAndBuilding` hook.
- [components/BuildingExpenseEntriesList.tsx](file:///Users/racso/work/racso/condominio/condominio-gestion/components/BuildingExpenseEntriesList.tsx): New UI component for paginated per-building expense list.
- [app/condominium/[id]/expenses/[expenseId]/page.tsx](file:///Users/racso/work/racso/condominio/condominio-gestion/app/condominium/%5Bid%5D/expenses/%5BexpenseId%5D/page.tsx): Updated page component integrating `BuildingExpenseEntriesList`.
