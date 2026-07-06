# AGENTS.md

## Cursor Cloud specific instructions

MERIDIAN is a single Next.js 16 (App Router, TypeScript, Turbopack, React Compiler) application — a
multi-tenant HR/timesheet SaaS. Its only backing service is **Supabase** (Postgres + Auth + PostgREST);
**Resend** is optional (only used to send invite emails). Standard scripts live in `package.json`
(`dev`, `build`, `start`, `lint`) and setup is documented in `README.md`.

### Services

| Service | Command | Port | Required |
|---|---|---|---|
| Next.js dev server | `pnpm dev` | 3000 | Yes |
| Supabase (local stack) | `supabase start` | 54321 (API), 54323 (Studio) | Yes for auth/data |

### Running the app (local Supabase backend)

The repo has **no committed production schema** — the real deployment points at an external Supabase
project. For local development this repo now includes a **reconstructed** Phase‑1 schema derived from the
app's queries in `supabase/migrations/` (tables `organizations`, `profiles`, `teams`, `invites` plus the
`create_organization` and `accept_invite` RPCs). It is a dev convenience, not the production source of truth.

Start order (Supabase must be up before the app can authenticate):
1. Ensure the Docker daemon is running. If `docker info` fails, start it: `sudo dockerd > /tmp/dockerd.log 2>&1 &` then `sudo chmod 666 /var/run/docker.sock`.
2. `supabase start` (applies migrations automatically; `supabase db reset` re-applies them).
3. `pnpm dev`.

`.env.local` is git-ignored (per `.gitignore` `.env*`). It must exist with the **local** Supabase values
(the local anon/service keys are deterministic and printed by `supabase start` / `supabase status`):
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (any non-empty string for dev), `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
To point at a real hosted Supabase instead, set these to the hosted project's URL/keys via Secrets.

### Non-obvious caveats

- **`RESEND_API_KEY` must be set for `pnpm build`.** `src/app/api/invites/route.ts` calls
  `new Resend(process.env.RESEND_API_KEY)` at module load, so `next build` fails during page-data
  collection if it is unset. Any non-empty placeholder works for dev/build.
- **`pnpm lint` reports ~20 pre-existing errors** (mostly `@typescript-eslint/no-explicit-any` and
  `react/no-unescaped-entities`). These are existing code issues, not environment problems.
- **`/people` and `/teams` embedded queries error against the reconstructed schema.** The app issues
  hint-free PostgREST embeds (`profiles?select=*,teams(name)` and `teams?select=*,manager:profiles(...)`)
  while `profiles.team_id → teams` and `teams.manager_id → profiles` form a circular FK pair — PostgREST
  returns `PGRST201` (ambiguous). The pages still render (data falls back to empty) but lists are empty.
  Do not "fix" this by editing app queries. Fully working flows: signup → create org → dashboard, and
  Settings (profile/org rename).
- Opening the top-right **account dropdown menu triggers a pre-existing Base UI runtime error**
  (`MenuGroupContent is missing ...` in `src/components/ui/dropdown-menu.tsx`). Unrelated to setup.
- Next.js prints a harmless deprecation warning that the `middleware` convention is renamed to `proxy`.
- On save, Settings calls `router.refresh()`; in dev this briefly shows the Next.js recompile loader
  before the success state — the write itself succeeds.
