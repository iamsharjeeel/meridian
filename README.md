# MERIDIAN — Phase 1 (Foundation)

MERIDIAN is a high-performance, multi-tenant timesheet, HR & payroll SaaS. Designed as a "Precision Instrument" — clean, calm, structured, and dense.

## Stack
- **Framework**: Next.js 15 App Router (TypeScript strict mode)
- **Styling**: Tailwind CSS v4 & custom HSL variables
- **Component Library**: shadcn/ui & Base UI primitives
- **Database / Auth**: Supabase (@supabase/ssr browser, server, and middleware clients)
- **Email Delivery**: Resend
- **State / Cache**: TanStack Query (React Query)
- **Themes**: next-themes (default dark mode, animated)
- **Motion**: Framer Motion spring animations

## Environment Variables
Create a `.env.local` file in the root directory and define the following:

```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous public key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (never expose to client)
RESEND_API_KEY=                    # Resend API key
NEXT_PUBLIC_APP_URL=               # http://localhost:3000 (local) or production Vercel URL
```

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Second, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application locally.

## Features Built in Phase 1
- **Auth Flow**: Completed `/login`, `/signup`, and `/invite/[token]` endpoints with pre-filled emails and secure accept-invitation actions.
- **Routing & Middleware**: Built-in JWT custom claims parser in Next.js middleware checking for user roles and organizational boundaries before routing.
- **App Shell**: Responsive desktop and mobile drawer sidebar layout with org headers, theme toggling, and account drop-downs.
- **Directory**: Dense, tabular numeric `/people` table with invite modal (Resend integration) and revocation controls.
- **Teams CRUD**: Core `/people/teams` component with manager assignment and CRUD actions.
- **Settings**: Workspace Settings (organization name change for owners/admins, profile name modification, and appearance selectors).
