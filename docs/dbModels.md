# Database ID Rules & Standard

- **Strict Type**: All Primary Keys (`id`) and Foreign Keys (`FK`) across all PostgreSQL tables must be **`UUID v4`**.
- **Database Defaults**: All primary key columns must have `DEFAULT gen_random_uuid()`.
- **TypeScript & Application Code**: When generating IDs in client/server code, import and use `generateId()` from `@/lib/utils/id` (which wraps `crypto.randomUUID()`).
- **Embedded Sub-entities (JSONB)**: Line items (e.g. `expense.items[].id`) must also use standard UUID v4 strings.
- **Tokens/Codes (Exceptions)**: `token` in `condominium_roles` is a random UUID string; external payment references (`payment_reference`) are plain text strings.

---

user:

- id (PK, uuid)
- name
- email
- role: admin | user | administrator
- created_at
- updated_at

condominium:

- id (PK, uuid)
- name
- address
- creator (FK → user.id, uuid)
- status: "draft" | "complete"
- created_at
- updated_at

condominium_roles:

- id (PK, uuid)
- condominium (FK → condominium.id, uuid)
- user (FK → user.id, uuid)
- role: "administrator" | "resident"
- status: "pending" | "verified"
- invited_email        -- email the invite was sent to
- invited_by (FK → user.id, uuid)
- token                -- unique invite token
- expires_at
- created_at
- updated_at

building:

- id (PK, uuid)
- condominium (FK → condominium.id, uuid)
- name
- symbol
- address
- created_at
- updated_at

unit:

- id (PK, uuid)
- building (FK → building.id, uuid)
- num
- floor
- type: "residential" | "office"
- owner (FK → user.id, uuid)
- aliquot (numeric, nullable) -- percentage 0-100, null = equal split
- created_at
- updated_at

expense:

- id (PK, uuid)
- condominium (FK → condominium.id, uuid, nullable)
- building (FK → building.id, uuid, nullable)
- title
- description
- amount
- items (JSONB, optional) -- array of `{ id, description, amount }` line items (id is UUID)
- due_date
- period_start
- period_end
- status: "active" | "cancelled"
- deleted_at (timestamptz, optional)
- deleted_by (FK → user.id, uuid, optional)
- delete_reason (optional)
- created_at
- updated_at

> One of `condominium` or `building` must be set (mutually exclusive). If `building` is set, the expense is for that specific building within the condominium. If `condominium` is set, the expense is for the entire condominium.
> `amount` is the total of the expense. When `items` is provided, `amount` is calculated as the sum of the line items.
> When an expense with tenant payments is deleted or cancelled, it transitions to `status: "cancelled"` preserving payment records as evidence, and sets `deleted_at`, `deleted_by`, and `delete_reason`.

announcement:

- id (PK, uuid)
- condominium (FK → condominium.id, uuid)
- title
- content
- author (FK → user.id, uuid)
- created_at
- updated_at
