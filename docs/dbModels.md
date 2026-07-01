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
- owner (FK → user.id)
- created_at
- updated_at

expense:

- id (PK)
- condominium (FK → condominium.id)
- title
- description
- amount
- due_date
- period_start
- period_end
- created_at
- updated_at

announcement:

- id (PK)
- condominium (FK → condominium.id)
- title
- content
- author (FK → user.id)
- created_at
- updated_at
