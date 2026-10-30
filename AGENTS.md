# Agent Notes: Condominio Gestión

## Package manager

- Use `pnpm`, not `npm`. The repo has `pnpm-lock.yaml` and `pnpm-workspace.yaml`; `README.md` incorrectly says `npm install`.
- `pnpm-workspace.yaml` is **not** a monorepo config — it only lists `allowBuilds` / `ignoredBuiltDependencies` for native deps (`sharp`, `protobufjs`, etc.).

## Developer commands

- `pnpm dev` — Next.js dev server on http://localhost:3000
- `pnpm build` — production build
- `pnpm start` — production server
- `pnpm lint` — ESLint 9 flat config (`eslint.config.mjs`)
- There is **no test runner** configured (no Jest, Vitest, or Playwright).

## Stack & conventions

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4.
- Tailwind v4 config lives in `app/globals.css` (`@import "tailwindcss"`, `@theme inline`). There is no `tailwind.config.ts`.
- Path alias `@/*` resolves to the repo root (see `tsconfig.json`).
- `lib/supabase.ts` is the client-side Supabase initializer. All database access is from `lib/services/*.ts` using the Supabase JavaScript SDK.
- Auth is Google sign-in via OAuth, managed in `context/authContext.tsx`.

## Environment & Supabase

- `.env.local` is required and already gitignored. It must expose Supabase client keys as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Project structure

- `app/` — Next.js routes. `/` is the login page; `/home` is the resident/admin dashboard.
- `app/condominium/[id]/...` — condominium-scoped pages (buildings, units, expenses, payments, residents, announcements, complaints, invites, payment methods).
- `lib/services/` — Supabase data access functions.
- `lib/types.ts` — shared TypeScript interfaces aligned with `docs/dbModels.md`.
- `components/` — reusable UI components; `components/home/` — dashboard sections.
- `context/` — React context providers.
- `hooks/` — custom hooks (`useHomeData.ts`).

## Database & ID Standard

- **Strict UUID v4 Rule**: All Primary Keys (`id`) and Foreign Keys across all tables must be native `UUID v4` strings.
- **Generation**: PostgreSQL schemas set `DEFAULT gen_random_uuid()`. TypeScript code uses `generateId()` from `@/lib/utils/id`.
- **JSONB Sub-items**: Nested entity identifiers (such as line item IDs in `expenses.items`) must also use standard UUID v4.


- No enforced ordering. In practice: `pnpm lint` then `pnpm build` (build runs TypeScript checks with `noEmit`).
- `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` and `typescript`; it explicitly ignores `.next/`, `out/`, `build/`, and `next-env.d.ts`.

## Deployment notes

- Build output is a standard Next.js static/dynamic app. README mentions Vercel as a target, but no deployment scripts or CI are present.
