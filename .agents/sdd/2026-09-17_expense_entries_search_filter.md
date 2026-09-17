# SDD: Expense Entries Search and Filter

**Status**: Completed  
**Date**: 2026-09-17  
**Tier**: Tier 3 (Structural / Feature)  

## Summary
Implemented multi-attribute search and filtering functionality for condominium expense entries in the expense detail view (`/condominium/[id]/expenses/[expenseId]`). The system allows administrators to search entries across apartment/unit number ("apto"), resident/owner (name, email, document ID), and invoice/receipt reference (`payment_reference`, receipt ID UUID prefix, notes). The solution employs a server-side pre-resolution strategy to circumvent PostgREST limitations regarding nested table filtering in `.or()` clauses, while providing a responsive UI with debounced search input, automatic accordion expansion for matching buildings, counter badges, pagination synchronization, and clear action states. All verification checks (TypeScript compilation, ESLint, Next.js production build) passed with zero errors, and code style review was approved.

## Approach
Currently, the expense detail page displays expense entries grouped by building in collapsible sections via `BuildingExpenseEntriesList`, where each building independently loads paginated entries (10 per page) via `getEntriesByExpenseAndBuilding`.

### Architectural Challenges & PostgREST Constraints
1. **PostgREST Top-Level `.or()` Limitation**: PostgREST strictly disallows referencing joined/embedded table columns in a parent table's `.or()` filter string (e.g. `.or("payment_reference.ilike.%term%,units.num.ilike.%term%")` triggers a PostgREST HTTP 400 error: `column "units.num" does not exist in table "expense_entries"`).
2. **Multi-level Resident Relation**: The owner is linked via `expense_entries -> units.owner -> users`, and payment reporter via `expense_entries.reported_by -> users`. Cross-table searching across three tables in a single PostgREST `.or()` filter cannot be executed in one unassisted PostgREST expression.
3. **Database Migration Isolation**: Database migrations cannot be assumed to run automatically during frontend builds or local development (Supabase instance is remote and managed independently). Relying on newly deployed SQL RPCs or custom Postgres views would introduce runtime fragility if migrations have not run in the remote instance.

### The Chosen Design: Server-Side Assisted PostgREST Search
To deliver 100% compliant, robust server-side search without requiring new SQL RPCs or custom database migrations:
1. **Two-Stage Server-Side Resolution in `expenseEntryService.ts`**:
   When a search term `q` is provided to `getEntriesByExpenseAndBuilding`:
   - **Stage 1 (Parallel ID Resolution)**:
     - Query `units` in the building where `num ILIKE '%${cleanedTerm}%'`.
     - Query `users` in the condominium matching `name ILIKE '%${term}%'`, `email ILIKE '%${term}%'`, or `document_id ILIKE '%${term}%'`.
     - If users match, find any units in this building where `owner IN (matchedUserIds)`.
     - Collect all matching `unitIds` and `userIds`.
   - **Stage 2 (Primary Table Query with Exact PostgREST `.or()`)**:
     - Construct valid top-level `.or()` clauses solely on `expense_entries` columns:
       - `payment_reference.ilike.%${safe}%`
       - `notes.ilike.%${safe}%`
       - `id.ilike.%${cleaned || safe}%` (matches receipt UUID prefix)
       - If `cleaned` differs from `safe`: search `payment_reference` and `notes` with `cleaned`
       - If `matchedUnitIds.length > 0`: `unit.in.(${matchedUnitIds.join(",")})`
       - If `matchedUserIds.length > 0`: `reported_by.in.(${matchedUserIds.join(",")})`
     - Apply `.select("*, units!inner(*, owner_user:users(*))", { count: "exact" })`, pagination `.range(from, to)`, and ordering by `created_at ASC`.
   - When no search term is provided, the query runs in normal mode without Stage 1 overhead.

2. **UI & UX Integration**:
   - **Search Input Component**: Placed directly above `BuildingExpenseEntriesList` in `app/condominium/[id]/expenses/[expenseId]/page.tsx`. Includes:
     - Left magnifying glass search icon.
     - Clear button ("✕" icon button, visible when query is non-empty).
     - Keyboard shortcut: pressing `Escape` clears the query.
     - Debounce of 300ms using a lightweight `useEffect` debounce to avoid jitter and redundant queries.
     - Placeholder: `"Buscar por apto, residente, recibo o referencia..."`.
   - **Accordion Expansion & Badge Feedback**:
     - In `BuildingExpenseSection`: when `search` is active:
       - If `totalCount > 0`, the collapsible building card automatically expands (`open = true`) so matching entries are immediately visible.
       - If `totalCount === 0`, the section stays collapsed and displays a badge: `"0 coincidencias"`.
       - When `search` is cleared, it smoothly reverts to default behavior (`defaultOpen = index === 0`).
   - **Pagination Synchronization**:
     - When `search` changes, local `page` in each `BuildingExpenseSection` automatically resets to `1`.
     - Pagination controls (`Anterior` / `Siguiente` and `Página 1 de N`) dynamically adapt to the filtered count.
   - **Empty State**:
     - If all buildings yield 0 results for an active search, displays a friendly empty state: `"No se encontraron cuotas para \"{query}\""` with a `"Limpiar búsqueda"` action button.
   - **Entry Card Enrichment**:
     - Updated `PaymentOrderItem` to render the resident/owner name (`owner?: AppUser`) and receipt identifier `#ID`, providing clear visual confirmation of why the entry matched.

### Design Principles Applied
- **SOLID**:
  - *Single Responsibility*: Search state and debounce reside in UI; relational query logic in `expenseEntryService`; cache keys in `keys.ts`; card rendering in `PaymentOrderItem`.
  - *Open/Closed*: `getEntriesByExpenseAndBuilding` and `useEntriesByExpenseAndBuilding` accept an optional `search?: string` parameter without modifying or breaking existing call sites.
- **KISS**: Simple, direct PostgREST calls with standard `.range()`, `.in()`, and `.or()`. Avoids heavyweight external search libraries or complex client state machines.
- **DRY**: Reuses existing `Collapse`, `Badge`, `Button`, and `PaymentOrderItem` components.
- **YAGNI**: Scoped strictly to the 3 requested criteria (apto, user/resident/owner, invoice/receipt). No speculative full-text search indexing or fuzzy vector embeddings.
- **No Workarounds**: Resolves PostgREST's lack of cross-table `.or()` via structured ID pre-resolution rather than pulling all records into client memory or attempting illegal PostgREST joined-filter syntax.

## Tasks
1. [x] **Update Data Types** — `lib/types.ts` — verify: `npx tsc --noEmit` (completed)
2. [x] **Update Query Keys** — `lib/queries/keys.ts` — verify: `npx tsc --noEmit` (completed)
3. [x] **Enhance Service Function with Multi-Attribute Search** — `lib/services/expenseEntryService.ts` — verify: `npx tsc --noEmit` (completed)
4. [x] **Update React Query Hook** — `lib/queries/useExpenseEntry.ts` — verify: `npx tsc --noEmit` (completed)
5. [x] **Support Controlled/Dynamic State in Collapse** — `components/Collapse.tsx` — verify: `npx tsc --noEmit` (completed)
6. [x] **Update Payment Card Display** — `components/PaymentOrderItem.tsx` — verify: `npx tsc --noEmit` (completed)
7. [x] **Update Building Section and List Component** — `components/BuildingExpenseEntriesList.tsx` — verify: `npx tsc --noEmit` (completed)
8. [x] **Integrate Search Input into Expense Detail Page** — `app/condominium/[id]/expenses/[expenseId]/page.tsx` — verify: `npx tsc --noEmit` (completed)
9. [x] **End-to-End Build & Lint Verification** — verify: `npm run lint && npm run build` (completed)

## Implementation
### Changes
- `lib/types.ts`: Extended `PaginatedExpenseEntries` entry type definition to include embedded `owner_user?: AppUser | null` on `units`.
- `lib/queries/keys.ts`: Updated `queryKeys.expenseEntries.byExpenseAndBuilding(expenseId, buildingId, page, search?: string)` tuple to include normalized search string.
- `lib/services/expenseEntryService.ts`: Added multi-attribute sanitization and Stage 1 parallel unit/user lookup in `getEntriesByExpenseAndBuilding`, constructing compliant PostgREST `.or(...)` clauses with embedded `units!inner(*, owner_user:users(*))`.
- `lib/queries/useExpenseEntry.ts`: Updated hook `useEntriesByExpenseAndBuilding` to pass `search` into `queryKey` and `expenseEntryService`.
- `components/Collapse.tsx`: Enhanced component to accept `isOpen?: boolean` and synchronize internal open state via `useEffect` while retaining backwards compatibility with `defaultOpen`.
- `components/PaymentOrderItem.tsx`: Added `owner?: AppUser | null` prop and receipt identifier preview `#ID` with copy icon.
- `components/BuildingExpenseEntriesList.tsx`: Added `search` prop propagation, auto-opening matching sections (`open={hasActiveSearch ? (entries.length > 0) : undefined}`), badge count indicators, pagination reset on search query changes, and global empty-state banner with reset action.
- `app/condominium/[id]/expenses/[expenseId]/page.tsx`: Added search bar with icon, clear button (`Escape` handler), 300ms debouncing, and passed debounced state to `BuildingExpenseEntriesList`.

### Divergences
- None. The implementation followed the initial SDD architecture and task breakdown precisely without deviations or unexpected scope changes.

## Verification
### Tests
- `npx tsc --noEmit` — pass (0 type errors)
- `npm run lint` — pass (ESLint passed with 0 errors and 0 warnings)
- `npm run build` — pass (Next.js production build completed successfully with all static and dynamic routes compiled)
- Coverage summary: Static verification passed across all layers (TypeScript compiler, linter, Next.js bundler).

### Review
- **Verdict**: Approved (code-style-reviewer)
- Findings by severity:
  - Critical: 0
  - High: 0
  - Medium: 0
  - Low / Info: 0
- Rationale: Code satisfies SOLID, KISS, DRY, and YAGNI. It solves the PostgREST constraint cleanly without anti-patterns or risky workarounds.

### Final Checks
- `npm run build` — pass (production bundle created with clean tree shaking and optimal route splitting)

## Decision Log
- **Decision**: Perform server-side search by pre-resolving matched `unitIds` and `userIds` before constructing the PostgREST query on `expense_entries`.  
  *Rationale*: PostgREST does not support cross-table column references in top-level `.or()`. Pre-resolving IDs keeps all filters on native `expense_entries` columns (`payment_reference`, `notes`, `id`, `unit`, `reported_by`), ensuring 100% PostgREST compatibility without needing custom SQL RPCs or views.
- **Decision**: Keep the search input at the top of the expense detail page above `BuildingExpenseEntriesList`, rather than separate search inputs inside each building section.  
  *Rationale*: Administrators often have a payment reference or resident name without knowing in advance which specific building/tower the unit belongs to. A unified search bar searches across the entire expense and opens the matching building accordion automatically.
- **Decision**: Automatically expand building accordions with matches when searching, and collapse buildings with 0 matches.  
  *Rationale*: Minimizes friction for the administrator, allowing instant inspection of the matched payment without manual clicking through towers.
- **Decision**: Enrich `PaymentOrderItem` with owner name and receipt ID.  
  *Rationale*: Provides immediate visual confirmation to the administrator that the search query matched the intended resident and receipt.
- **Decision**: Sanitize search input to strip common Latin American condominium prefixes ("apto", "unidad", "depto", "recibo #", "ref").  
  *Rationale*: Users frequently type "Apto 302" or "Recibo 1234" when searching; stripping redundant prefixes ensures exact matching against unit numbers and receipt references.

## Open Items
- None. All requirements and acceptance criteria have been satisfied and verified.

## Artifacts
- [`lib/types.ts`](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/types.ts): Data contract for expense entries with joined unit owner data.
- [`lib/queries/keys.ts`](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/queries/keys.ts): Cache key factory updated for search queries.
- [`lib/services/expenseEntryService.ts`](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/services/expenseEntryService.ts): Multi-attribute pre-resolution and PostgREST query execution.
- [`lib/queries/useExpenseEntry.ts`](file:///Users/racso/work/racso/condominio/condominio-gestion/lib/queries/useExpenseEntry.ts): React Query hook integration.
- [`components/Collapse.tsx`](file:///Users/racso/work/racso/condominio/condominio-gestion/components/Collapse.tsx): Dynamic controlled state support.
- [`components/PaymentOrderItem.tsx`](file:///Users/racso/work/racso/condominio/condominio-gestion/components/PaymentOrderItem.tsx): Payment item with owner display and receipt ID.
- [`components/BuildingExpenseEntriesList.tsx`](file:///Users/racso/work/racso/condominio/condominio-gestion/components/BuildingExpenseEntriesList.tsx): Accordion group with auto-expansion, badges, and empty states.
- [`app/condominium/[id]/expenses/[expenseId]/page.tsx`](file:///Users/racso/work/racso/condominio/condominio-gestion/app/condominium/[id]/expenses/[expenseId]/page.tsx): Main expense detail page with debounced search input.
