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
- `firebase.js` is a client-side Firebase initializer. All Firestore access is from `lib/services/*.ts` using the Firebase Web SDK.
- Auth is Google sign-in via popup, managed in `context/authContext.tsx`.

## Environment & Firebase

- `.env.local` is required and already gitignored. It must expose Firebase client keys as `NEXT_PUBLIC_FIREBASE_*`.
- `firebase.json` only configures Firestore (`firestore.rules`, `firestore.indexes.json`, `location: nam5`).
- `.firebaserc` default project: `condominio-gestion`.
- **Security rules are permissive** (`firestore.rules` allows all reads/writes until `2026-07-31`). Do not treat them as production-ready.

## Project structure

- `app/` — Next.js routes. `/` is the login page; `/home` is the resident/admin dashboard.
- `app/condominium/[id]/...` — condominium-scoped pages (buildings, units, expenses, payments, residents, announcements, complaints, invites, payment methods).
- `lib/services/` — Firestore data access functions.
- `lib/types.ts` — shared TypeScript interfaces aligned with `docs/dbModels.md`.
- `components/` — reusable UI components; `components/home/` — dashboard sections.
- `context/` — React context providers.
- `hooks/` — custom hooks (`useHomeData.ts`).

## Lint / type workflow

- No enforced ordering. In practice: `pnpm lint` then `pnpm build` (build runs TypeScript checks with `noEmit`).
- `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` and `typescript`; it explicitly ignores `.next/`, `out/`, `build/`, and `next-env.d.ts`.

## Deployment notes

- Build output is a standard Next.js static/dynamic app. README mentions Vercel or Firebase App Hosting as targets, but no deployment scripts or CI are present.
