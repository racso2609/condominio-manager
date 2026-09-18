user:

- id (PK)
- name
- email
- role: admin | user | administrator
- created_at
- updated_at

condominium:

- id (PK)
- name
- address
- creator (FK → user.id)
- status: "draft" | "complete"
- created_at
- updated_at

condominium_roles:

- id (PK)
- condominium (FK → condominium.id)
- user (FK → user.id)
- role: "administrator" | "resident"
- status: "pending" | "verified"
- invited_email        -- email the invite was sent to
- invited_by (FK → user.id)
- token                -- unique invite token
- expires_at
- created_at
- updated_at

building:

- id (PK)
- condominium (FK → condominium.id)
- name
- symbol
- address
- created_at
- updated_at

unit:

- id (PK)
- building (FK → building.id)
- num
- floor
- type: "residential" | "office"
- owner (FK → user.id)
- aliquot (numeric, nullable) -- percentage 0-100, null = equal split
- created_at
- updated_at

expense:

- id (PK)
- condominium (FK → condominium.id, nullable)
- building (FK → building.id, nullable)
- title
- description
- amount
- items (JSONB, optional) -- array of `{ id, description, amount }` line items
- due_date
- period_start
- period_end
- status: "active" | "cancelled"
- deleted_at (timestamptz, optional)
- deleted_by (FK → user.id, optional)
- delete_reason (optional)
- created_at
- updated_at

> One of `condominium` or `building` must be set (mutually exclusive). If `building` is set, the expense is for that specific building within the condominium. If `condominium` is set, the expense is for the entire condominium.
> `amount` is the total of the expense. When `items` is provided, `amount` is calculated as the sum of the line items.
> When an expense with tenant payments is deleted or cancelled, it transitions to `status: "cancelled"` preserving payment records as evidence, and sets `deleted_at`, `deleted_by`, and `delete_reason`.

announcement:

- id (PK)
- condominium (FK → condominium.id)
- title
- content
- author (FK → user.id)
- created_at
- updated_at
