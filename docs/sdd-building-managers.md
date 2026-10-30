# SDD — Encargados por Torre (Building-Scoped Managers)

**Condominio Gestión** · Feature: building-scoped administrator role
**Status:** Design (ready for implementation)
**Prerequisite migrations:** `001`–`009`

---

## 1. Overview / Problem statement

A single condominium can contain multiple buildings (towers). Example: **Marapa Marina** has 3 towers (Torre A/B/D). Today, administration is all-or-nothing per condominium:

- `condominium_roles.role = 'administrator'` + `status = 'verified'` grants the condominium authorizer (`is_condominium_admin`) access to the **entire** condominium.
- There is no way to delegate authority over **one** tower.

We want: the condominium admin keeps full access to all 3 buildings, while a **building manager** ("encargado de torre") can only operate within their assigned building (e.g. Torre D).

### Confirmed decisions

| Decision | Value |
|---|---|
| Building manager powers | Manage units, building-scoped expenses, payment verification/marking paid, view & manage residents of their building, publish announcements |
| Data model | Extend `condominium_roles` with nullable `building` column **+ separate `building_manager_assignments` table for multi-building managers** |
| Condominium admin | Full access to **all** buildings, unrestricted |
| Buildings per manager | **Many** — a manager can be scoped to 1..N towers (generic) |
| Announcements | Condo-wide (no per-building announcements) |

---

## 2. Goals / Non-goals

### Goals
- A user can be an `administrator` scoped to **one or more buildings** within a condominium.
- RLS (DB layer) is the single source of truth for authorization.
- The condominium admin retains unrestricted access.
- Reuse the existing invite/verify flow, extended to target buildings.

### Non-goals
- Manager-of-manager delegation.
- Cross-condominium roles (a manager's buildings all belong to the same condominium).
- Per-building announcements (announcements stay condo-wide).
- Changing the global `users.role` semantics.

### Why a separate assignments table (not just a column)

A single `condominium_roles.building` column would force N role rows for N towers — which breaks `getUserCondominiumRole` (`.single()`, `condominiumService.ts:109`) and duplicates invite/verify rows. Instead:

- `condominium_roles.building` is kept as a **optional primary scope** only for the simple/legacy single-building case (and for the "which building did this invite target" hint). `NULL` = not building-scoped.
- A new **`building_manager_assignments`** join table holds the authoritative set of `(role, building)` pairs. **Many** rows per role → **many** towers per manager. Authorization reads this table.

This keeps one `condominium_roles` row per (user, condominium) — so `.single()` keeps working — while supporting N towers generically.

---

## 3. Data model changes

### 3.1 New migration `supabase/migrations/010_building_managers.sql`

```sql
-- (A) Lightweight single-scope hint on the role row (kept for invite context + legacy).
ALTER TABLE condominium_roles
  ADD COLUMN IF NOT EXISTS building text
  REFERENCES buildings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_condominium_roles_building
  ON condominium_roles(building);

-- (B) Authoritative per-building assignments. Many rows per role => many towers.
CREATE TABLE IF NOT EXISTS building_manager_assignments (
  id text PRIMARY KEY,
  role text NOT NULL REFERENCES condominium_roles(id) ON DELETE CASCADE,
  building text NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, building)
);

CREATE INDEX IF NOT EXISTS idx_bma_role ON building_manager_assignments(role);
CREATE INDEX IF NOT EXISTS idx_bma_building ON building_manager_assignments(building);

ALTER TABLE building_manager_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a verified administrator scoped to THIS building?
CREATE OR REPLACE FUNCTION is_building_manager(building_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM building_manager_assignments a
    JOIN condominium_roles r ON r.id = a.role
    WHERE a.building = building_id
      AND r."user" = auth.uid()::text
      AND r.role = 'administrator'
      AND r.status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: may the caller administer THIS building?
-- (either a whole-condominium admin, or a manager assigned to this building)
CREATE OR REPLACE FUNCTION is_building_staff(building_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM buildings b
    WHERE b.id = building_id
      AND is_condominium_admin(b.condominium)
  ) OR is_building_manager(building_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 3.2 Semantics

| Construct | Meaning |
|---|---|
| `condominium_roles.role='administrator' AND building IS NULL` | Condominium admin (whole condo) — existing behavior |
| A row in `building_manager_assignments` for a verified `administrator` role | Manager scoped to that building (0..N rows → 0..N towers) |
| `condominium_roles.role='resident'` | Normal resident (condo-wide) |
| `condominium_roles.building` | Optional hint of the invite's target tower; **not** the authorization source |

`is_condominium_admin(condominium_id)` **must remain unchanged** (a condo admin has no assignment rows and matches on role alone) so condo admins keep full access. `is_condominium_member` also stays unchanged — a building manager is a verified member of the condo (needed to view their building). Assignments only *narrow* admin capabilities via `is_building_staff`.

**Condo admin vs manager, definitively:**
- `is_condominium_admin` = `role='administrator' AND status='verified'` (ignores assignments) → full condo.
- `is_building_manager(b)` = has an assignment row for `b` on a verified administrator role → one/several towers.

### 3.3 Policy updates

All line refs refer to `001_schema.sql`; the migration drops+recreates them.

**buildings SELECT** (lines 285–296) → keep `is_condominium_member` for SELECT (a manager is a member), but to hide *other* towers in listings we filter client-side AND add a restrictive read for non-condo-admins:

```sql
DROP POLICY IF EXISTS buildings_select_member ON buildings;
CREATE POLICY buildings_select_staff_or_member ON buildings FOR SELECT
  USING (
    is_condominium_admin(condominium)
    OR is_building_manager(id)
    OR is_condominium_member(condominium)  -- regular residents still see all buildings
  );
```

> Note: regular residents must keep seeing the full building list (units/expenses reference buildings). The *management* restriction is enforced on write policies and on the building-manager's UI, not by hiding reads. Keep this policy effectively equal to the current one; the real gate is writes. (If product later wants residents to see only their tower, tighten here.)

**buildings INSERT/UPDATE/DELETE** (288–296): condo admin only, unchanged.

**units INSERT/UPDATE/DELETE** (307–341): replace `is_condominium_admin(buildings.condominium)` with `is_building_staff(units.building)` for INSERT and DELETE; for UPDATE keep `owner = auth.uid()` **OR** `is_building_staff(units.building)`.

**expenses INSERT/UPDATE/DELETE** (353–389): for the **building-scoped** branch, replace `is_condominium_admin(buildings.condominium)` with `is_building_staff(expenses.building)`. The condominium-scoped branch stays `is_condominium_admin(condominium)` — a building manager must NOT be able to create/edit whole-condo expenses. SELECT unchanged (`is_condominium_member`).

**expense_entries INSERT/UPDATE/DELETE** (401–439): replace `is_condominium_admin(buildings.condominium)` with `is_building_staff(units.building)`. Keep `reported_by = auth.uid()` for UPDATE. This is what lets a building manager verify/mark paid.

**announcements INSERT/UPDATE/DELETE** (441–452): the building manager needs to publish announcements. Announcements currently have only `condominium` (no building). Decision: allow building managers to create condo-wide announcements (simplest; matches "publish announcements") by treating them as condo admins for announcements:

```sql
DROP POLICY IF EXISTS announcements_insert_admin ON announcements;
CREATE POLICY announcements_insert_admin ON announcements FOR INSERT
  WITH CHECK (
    is_condominium_admin(condominium)
    OR EXISTS (
      SELECT 1 FROM condominium_roles
      WHERE condominium = announcements.condominium
        AND "user" = auth.uid()::text
        AND role = 'administrator' AND status = 'verified'
        AND building IS NOT NULL
    )
  );
```

(If announcements must later be building-scoped, add `announcements.building` — out of scope now.)

**condominium_roles INSERT/UPDATE/DELETE** (269–283): unchanged — only condo admins manage roles. This also means: **only a condo admin can appoint a building manager** (correct).

**units SELECT** (298–305): unchanged.

**New table `building_manager_assignments` policies:**

```sql
CREATE POLICY bma_select_member ON building_manager_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM condominium_roles r
      JOIN buildings b ON b.id = building_manager_assignments.building
      WHERE r.id = building_manager_assignments.role
        AND (r."user" = auth.uid()::text OR is_condominium_admin(b.condominium))
    )
  );

CREATE POLICY bma_write_condo_admin ON building_manager_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM condominium_roles r
      JOIN buildings b ON b.id = building_manager_assignments.building
      WHERE r.id = building_manager_assignments.role
        AND is_condominium_admin(b.condominium)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM condominium_roles r
      JOIN buildings b ON b.id = building_manager_assignments.building
      WHERE r.id = building_manager_assignments.role
        AND is_condominium_admin(b.condominium)
    )
  );
```

### 3.4 Invite flow for building managers

`createInvite` currently hardcodes `role='resident'` (`condominiumService.ts:140`). Extend to accept `{ role, buildings }`:

- Insert the `condominium_roles` row with `role='administrator'`, `status='pending'`, `building=NULL` (no single hint), token + 7-day expiry.
- The invite needs to remember **which buildings** were targeted. Store them in the invite's payload. Options:
  - **(i)** Add a `building_manager_assignments` row referencing the pending role (assignments tolerate a pending role). On accept+verify the assignments already exist → simplest, chosen approach.
  - (ii) A JSON column on the role — rejected (extra schema).

So `createInvite(..., { role:'administrator', buildings: string[] })` inserts the role row **and** one assignment row per building (each validated to belong to `condominiumId`).

`acceptInvite` (`condominiumService.ts:194-253`): the email-invite branch updates `user` and **leaves status as-is** (stays `pending`); the global-invite branch creates a new `resident` row. For a building-manager email invite the role row is `administrator` + assignments present, so accept is unchanged; the condo admin then `verifyRole`s it. **Global invite for managers is disallowed** (guard in the service) — a public link must not grant admin.

---

## 4. Service layer changes

### `lib/services/condominiumService.ts`
- `createInvite(condominiumId, invitedBy, email, opts?: { role?: 'administrator'|'resident'; buildings?: string[] })` — thread `role` into `roleData` (line 136–148) and, when `role === 'administrator'`, insert one `building_manager_assignments` row per id in `buildings` (each validated to belong to `condominiumId`).
- New `getBuildingManagers(condominiumId)` → fetch verified `administrator` roles that have ≥1 assignment, joined with assignments (returns `{ role, buildings: string[] }[]`).
- New `addBuildingManagerAssignment(roleId, building)` / `removeBuildingManagerAssignment(roleId, building)` — RLS-restricted to condo admins. Used to grant/revoke a tower after verification.
- `getUserCondominiumRole` returns the single row incl. `building` (already `select *`; `.single()` stays valid — one role row per condo).
- New `getManagedBuildingIds(userId, condominiumId)` → returns `string[]` of buildings from assignments for the caller's verified administrator role. This replaces the singular scope and satisfies multi-tower.
- No `updateCondominiumRoleBuilding` (single) — replaced by the add/remove assignment pair above.

### `lib/services/buildingService.ts`
- Optional `getBuildingsByManager(userId)` convenience (query roles where user & building not null, then buildings). Not strictly needed if the client derives from roles.

### `lib/services/unitService.ts`, `expenseService.ts`, `expenseEntryService.ts`, `announcementService.ts`
- No signature changes required — RLS enforces scope. Existing `get*ByBuilding` / `get*ByCondominium` queries already accept a building id; the UI passes the managed building.

---

## 5. Client / permission changes

### 5.1 Fix `hooks/useCondominiumPage.ts` (bug at lines 18–19)

Today `isAdminOrManager` uses only the **global** role, so a verified condo administrator with global `role='user'` cannot administer. Replace with per-condo permission:

```ts
const { data: userRole } = useUserCondominiumRole(appUser?.id, condominiumId);
const { data: managedBuildingIds = [] } = useManagedBuildingIds(appUser?.id, condominiumId);

const isCondoAdmin =
  appUser?.role === "admin" ||
  appUser?.role === "administrator" ||
  (userRole?.role === "administrator" && userRole?.status === "verified" && managedBuildingIds.length === 0);
const isBuildingManager =
  userRole?.role === "administrator" && userRole?.status === "verified" && managedBuildingIds.length > 0;
const isAdminOrManager = isCondoAdmin || isBuildingManager;
```

> Preserve the current global-admin shortcut (`admin`/`administrator`) for backward compatibility, but add the per-condo verified path. Note the distinction: a verified administrator with **zero** assignments is a condo admin; with **≥1** assignments is a scoped manager. A user cannot be both (assignments are only created for scoped managers).

### 5.2 New hook `hooks/useCondominiumPermissions.ts`

```ts
export function useCondominiumPermissions(condominiumId?: string) {
  // returns:
  // {
  //   isCondoAdmin: boolean,              // sees & manages all buildings
  //   isBuildingManager: boolean,
  //   managedBuildingIds: string[],       // [] when condo admin
  //   canManageBuilding: (buildingId: string) => boolean, // condoAdmin || managedBuildingIds.includes(id)
  //   canManageCondoLevel: boolean,       // condoAdmin only (delete condo, manage roles, whole-condo expense, payment methods)
  // }
}
```

Derive from `useAuthContext().appUser` + `useUserCondominiumRole` (single row) + a new `useManagedBuildingIds(userId, condominiumId)` query. Multi-tower is expressed as `managedBuildingIds.length >= 1`; `canManageBuilding` is a set-membership test (no singular field).

Add to `lib/queries/useCondominium.ts`:

```ts
export function useManagedBuildingIds(userId?: string, condominiumId?: string) {
  return useQuery({
    queryKey: queryKeys.condominiums.managedBuildings(condominiumId ?? "", userId ?? ""),
    queryFn: (userId && condominiumId)
      ? () => getManagedBuildingIds(userId, condominiumId)
      : skipToken,
    enabled: Boolean(userId && condominiumId),
  });
}
```

Plus a matching key in `lib/queries/keys.ts`.

### 5.3 Pages/guards to update

| File | Change |
|---|---|
| `hooks/useCondominiumPage.ts:18-19` | per-condo role (see 5.1) |
| `app/condominium/[id]/buildings/page.tsx` | filter visible buildings: condo admin sees all; manager sees only `managedBuildingIds` (or hides the list and deep-links to their towers) |
| `app/condominium/[id]/buildings/[buildingId]/*` (edit, units/new, aliquots, duplicate) | guard via `canManageBuilding(buildingId)` (set membership); block other towers with redirect |
| `app/condominium/[id]/expenses/new/page.tsx:92-93,178` | manager can only pick their building (no condominium-scoped expense) |
| `app/condominium/[id]/expenses/[expenseId]/page.tsx:92-93,142` | same |
| `app/condominium/[id]/pagos/page.tsx` (payment verification) | scope to managed building |
| `app/condominium/[id]/residents/page.tsx:56,305` | scope to managed building's units |
| `app/condominium/[id]/announcements/new/page.tsx:25-26,59` | allowed via permissions hook |
| `app/condominium/[id]/payment-methods/*` | condo admin only (keep `isAdminOrManager`→`isCondoAdmin`) |
| `app/condominium/[id]/invite/page.tsx:24,101` | condo admin only; add building-manager invite option |
| `app/condominium/[id]/page.tsx` | gate building-management sections by `canManageBuilding` |

> `app/condominium/new/page.tsx:20` and platform-level creation keep the global-role check.

---

## 6. UI / route changes

1. **Buildings list** (`buildings/page.tsx`): if `isBuildingManager`, render only buildings in `managedBuildingIds`; hide the "create building" CTA (condo-admin only).
2. **Building detail** pages: wrap with `canManageBuilding(buildingId)`; redirect to `/home` (or a managed tower) otherwise.
3. **Invite page**: add a role selector — "Residente" vs "Encargado de torre"; when the latter is chosen, show a **multi-select** of buildings (populated via `getBuildingsByCondominium`). Pass `{ role:'administrator', buildings: string[] }` to `createInvite`.
4. **Manager management (residents page)**: for a verified manager, allow the condo admin to add/remove towers via `addBuildingManagerAssignment` / `removeBuildingManagerAssignment`.
5. **Residents page**: filter the role/unit lists to the union of `managedBuildingIds` when `isBuildingManager`.
6. **Expenses**: for managers, restrict the building field to `managedBuildingIds` and disable condominium-scope options.
7. **Badge/labels**: `components/home/AccountSection.tsx` and condominium header — show "Encargado · Torre D, Torre E" (join building names of `managedBuildingIds`) when `isBuildingManager`.

---

## 7. Security analysis

- **RLS is the source of truth.** Client guards are UX only; a malicious client still hits DB policies. Therefore all authorization logic above must land in the migration's policies, not just the hooks.
- **Policies that MUST change (risk if missed):**
  - `units_*` → a building manager could edit/delete units of other towers.
  - `expenses_*` (building branch) → manager could create/edit expenses in other towers.
  - `expense_entries_*` → manager could verify/mark paid entries of other towers.
  - `announcements_insert_admin` → manager cannot publish (false-negative) if only `is_condominium_admin` is used.
- **Do NOT relax the condominium-scoped branch of `expenses`**: a building manager must never create a whole-condo expense. Keep `is_condominium_admin(condominium)` there.
- **`is_condominium_admin` must stay building-agnostic** so condo admins keep full access. Do not add `AND building IS NULL` there.
- **SECURITY DEFINER caveat:** `is_building_manager`/`is_building_staff` run as the definer, bypassing RLS. They must `SET search_path` or fully-qualify tables to avoid hijacking; use `SECURITY DEFINER` with a fixed `search_path` (`SET search_path = public`). Verify function ownership is the migration role.
- **Role management stays condo-admin-only** (`condominium_roles_insert_admin` uses `is_condominium_admin`), so a building manager cannot self-promote or appoint others. Same for the new `bma_write_condo_admin` policy on `building_manager_assignments` — a manager cannot grant themselves another tower.
- **Assignments are the only source of building scope.** Never derive scope from `condominium_roles.building` (it is a hint). If a write only checks the hint, a manager with an assignment to Torre D but `building=NULL` on the row would be wrongly denied, and a manager with a hint but no assignment could be wrongly allowed.
- **Global invites** cannot carry an admin role (service guard) — otherwise a leaked link grants admin.
- **`is_building_manager` must join through `condominium_roles` status** so an unverified/pending assignment grants nothing.

---

## 8. Task list

| # | Tier | Task | Files |
|---|---|---|---|
| T1 | 3 | Write migration `010_building_managers.sql`: add `condominium_roles.building` + index; create `building_manager_assignments` table + indexes + RLS policies (`bma_select_member`, `bma_write_condo_admin`); create `is_building_manager`/`is_building_staff` (with `SET search_path`); drop+recreate units/expenses/expense_entries/announcements policies | `supabase/migrations/010_building_managers.sql` |
| T2 | 1 | Add `building?: string \| null` to `CondominiumRole`; add `BuildingManagerAssignment` type | `lib/types.ts` (~25-37) |
| T3 | 2 | Extend `createInvite` with `{ role, buildings: string[] }`, validate each building∈condo, insert assignment rows | `lib/services/condominiumService.ts:115-154` |
| T4 | 2 | Add `getBuildingManagers`, `addBuildingManagerAssignment`, `removeBuildingManagerAssignment`, `getManagedBuildingIds`; guard global invite for admin role | `lib/services/condominiumService.ts` |
| T5 | 1 | Add query key + `useManagedBuildingIds` | `lib/queries/keys.ts`, `lib/queries/useCondominium.ts` |
| T6 | 2 | Fix `useCondominiumPage` per-condo permission logic | `hooks/useCondominiumPage.ts:18-25` |
| T7 | 2 | Add `useCondominiumPermissions` hook | `hooks/useCondominiumPermissions.ts` (new) |
| T8 | 2 | Invite UI: role selector + **multi-select** buildings | `app/condominium/[id]/invite/page.tsx` |
| T9 | 2 | Filter buildings list for managers; guard building detail pages | `app/condominium/[id]/buildings/**` |
| T10 | 2 | Manager add/remove tower UI for condo admin | `app/condominium/[id]/residents/page.tsx` |
| T11 | 2 | Scope residents page to `managedBuildingIds` | `app/condominium/[id]/residents/page.tsx` |
| T12 | 2 | Scope expenses (new/detail) to managed buildings; block condo-scope | `app/condominium/[id]/expenses/**` |
| T13 | 2 | Gate payment-methods/invite/announcements by `isCondoAdmin` vs permissions | `app/condominium/[id]/payment-methods/**`, `announcements/new`, `invite` |
| T14 | 1 | Show "Encargado · <Torres>" label | `components/home/AccountSection.tsx`, condominium header |
| T15 | 2 | Run `pnpm lint` and `pnpm build` | repo root |

---

## 9. Test / verification plan

The repo has **no test runner**. Verify at DB level and manually.

### SQL-level (simulate `auth.uid()`)
Run in Supabase SQL editor as `service_role`, then as each user's JWT:

1. **Setup:** create a role row `role='administrator', status='verified'` for manager U **+** assignment rows for Torre D **and** Torre E.
2. **Positive:** as U, `INSERT INTO units (building = TorreD) ...` → succeeds; `(building = TorreE)` → succeeds.
3. **Negative:** as U, `INSERT INTO units (building = TorreA) ...` → fails (`is_building_staff(TorreA)` false).
4. **Negative:** as U, `INSERT INTO expenses (condominium = <condo>) ...` → fails; `(building = TorreA)` fails; `(building = TorreD)` succeeds.
5. **Positive:** as U, update an `expense_entries` row for a TorreD or TorreE unit → succeeds; for TorreA → fails.
6. **Condo admin:** as a `building IS NULL` admin, all Torre A/B/D writes succeed.
7. **Self-promotion:** as U, `INSERT INTO condominium_roles ...` → fails; `INSERT INTO building_manager_assignments (... TorreB ...)` → fails (`bma_write_condo_admin`).
8. **Pending/unverified:** as U with an unverified role, `is_building_manager(TorreD)` → false (all writes blocked).
9. **Assignment-only scope:** with assignment to TorreD but `condominium_roles.building = NULL`, U can still manage TorreD (proves assignments are the source of truth).
10. Verify `is_condominium_admin` still true for condo admin regardless of assignments.

### UI manual
- Log in as manager → only Torre D visible; direct-nav to Torre A URLs redirects.
- Invite flow: condo admin invites "Encargado de torre" → select Torre D → user accepts → admin verifies → user gains scoped access.
- Announcement publishing works for the manager.

### Seed
Add an optional dev seed (do **not** modify `009_marapa_marina_condo.sql`) with one building manager for one Marapa tower.

---

## 10. Risks & open questions

- **Residents' building visibility:** currently all members can read all buildings. Leaving as-is is simplest; tightening resident reads is a product decision.
- **Announcements scope:** condo-wide by decision. If per-tower announcements are ever needed, add `announcements.building` (follow-up).
- **`expenses` mutually-exclusive constraint:** ensure the app never sets both `condominium` and `building`; consider a DB `CHECK ((condominium IS NULL) <> (building IS NULL))`.
- **Multi-tower moved to assignments table (resolved):** `condominium_roles` stays one row per (user, condo) with `.single()` intact; multi-tower scope lives in `building_manager_assignments`. `CondominiumRole` needs no array field.
- **`is_condominium_admin` search_path:** existing functions lack `SET search_path`; the new helpers set it. Consider hardening the old ones in the same migration.
- **Backfill:** existing condo admins have `building = NULL` and zero assignments after the migration (correct default = full condo).
- **Assignment lifecycle:** assignments are created at invite time (referencing a `pending` role) and only take effect once the role is `verified`. Deleting the role cascades assignments (`ON DELETE CASCADE`). Deleting a building cascades its assignments too.

---

## 11. Follow-up — scope enforcement + promotion (migration 011)

### 11.1 Security fix: `is_condominium_admin` did not respect building scope

Migration 010 redefined the write policies for `units`, building-scoped `expenses`, `expense_entries` and `announcements` to use `is_building_staff`, but **left `is_condominium_admin` unchanged**: it still returned true for *any* verified administrator, including building managers. Every policy that still calls `is_condominium_admin` (condominium_roles write, buildings insert/update/delete, condominium-scoped expenses, payment_methods, condominiums update/labels) therefore granted a building manager full condominium-admin power.

Migration `011_scope_condo_admin.sql` redefines:

```sql
is_condominium_admin(condominium_id) =
  verified administrator of the condominium WITH ZERO building assignments
```

Because every policy calls this one function, the fix propagates everywhere without rewriting each policy. A building manager now passes only `is_building_staff(b)` for assigned buildings.

Also added:
- `is_condominium_member` (re-declared with `SET search_path`).
- `is_condominium_administrator(condominium_id)` — verified administrator regardless of scope.
- Trigger `trg_enforce_role_change_authority` on `condominium_roles` — blocks a role-type change (`resident` ↔ `administrator`) unless the caller is a full condominium admin. Managers cannot promote/demote.

### 11.2 Existing condominium admins

Untouched by design: they are `administrator` + 0 assignments, which is exactly the "full condominium admin" definition. No assignment rows are created for them.

### 11.3 Promotion / demotion (no duplicate rows)

A member is promoted/demoted by **updating the same `condominium_roles` row** (keeps `getUserCondominiumRole().single()` valid and preserves ownership/debt state):

- `promoteToBuildingManager(roleId, condominiumId, buildings[])` — validates buildings ∈ condo, upserts `building_manager_assignments`, then sets `role='administrator'`. With assignments → building manager. With none → allowed but creates a full condo admin (only meaningful via seed).
- `demoteToResident(roleId)` — deletes the role's assignments, then sets `role='resident'`.

A managed owner keeps their units/payments/debt (the role change is additive to their property condition).

### 11.4 UI (residents page)

- Each verified resident row (condo admin only): **"🛡️ Hacer encargado"** → multi-select towers → `promoteToBuildingManager`.
- "Encargados de torre" section: **"Quitar rol"** → `demoteToResident` (confirm), plus the existing add/remove tower chips.

---

## 12. Follow-up — normalized role resolution (single source of truth)

### 12.1 Problem

Role resolution was scattered and inconsistent:

- `getUserCondominiumRole` used `.single()`, which throws (→ `null`) when a user has more than one `condominium_roles` row in the same condominium (e.g. invited as resident, later as administrator), silently dropping all permissions.
- Pages derived permissions ad hoc: `app/condominium/[id]/page.tsx` used `useUserCondominiumRole` directly; complaints pages used `userRole.role === "administrator"` (ignoring building scope); each page mixed the global `users.role` with the per-condominium role without a shared rule.
- The residents list dropped administrators without units and hid members when the caller was not a condo admin, so a condo admin could end up seeing only themselves.

### 12.2 Resolution model

New canonical resolver in `lib/services/condominiumService.ts`:

- `getUserCondominiumRole(userId, condominiumId)` → fetches **all** rows and returns the highest-ranked one via `pickPrimaryRole` (ranking lives in `lib/types.ts`: verified ≥ pending, administrator > resident). No `.single()`.
- `getCondominiumMembership(userId, condominiumId, globalRole)` → returns `{ role, userRole, managedBuildingIds }` with one access role:

| Precedence | Condition | `role` |
|---|---|---|
| 1 | `users.role ∈ {admin, administrator}` | `super_admin` |
| 2 | verified `administrator` + 0 assignments | `condo_admin` |
| 3 | verified `administrator` + ≥1 assignment | `building_manager` |
| 4 | verified `resident` | `resident` |
| 5 | `pending` | `pending` |
| 6 | no row | `none` |

A `super_admin` is **always** full condominium admin; assignments never degrade a global admin.

### 12.3 Hook contract

`useCondominiumPermissions(condominiumId)` is the **only** permission source. It consumes `useCondominiumMembership` and returns `{ role, userRole, isSuperAdmin, isCondoAdmin, isBuildingManager, isResident, isPending, isAdminOrManager, managedBuildingIds, canManageBuilding, canManageCondoLevel }`. `useCondominiumPage` re-exposes all of them.

All pages migrated: `[id]/page.tsx`, `residents`, `complaints`, `complaints/new`, plus the existing building/expense/payment-method pages. `useUserCondominiumRole` and `useManagedBuildingIds` remain for compatibility but are no longer used by pages.

### 12.4 Residents list

With `isCondoAdmin`, the list shows **every** member (all `condominium_roles` rows, one per user by highest rank), not only unit owners. Managers/residents only see unit owners. A promotable target is any `resident` row (any status, including pending) that has a linked `user`; already-administrator rows show no promote button.
