# MERIDIAN Handover — Phase 1 (Foundation)

This document outlines the foundation of MERIDIAN that has been successfully built, architectural decisions, and upcoming steps for Phase 2.

## What Exists & Architecture

1. **Supabase Client Architecture (`src/utils/supabase/`)**:
   - `client.ts`: Browser client for Client Components.
   - `server.ts`: Server client using async `cookies()` helper for Next.js 15 Server Components, Actions, and Route Handlers.
   - `admin.ts`: Server-only administrative client using `SUPABASE_SERVICE_ROLE_KEY` to query invites securely.
   - `middleware.ts`: Decodes user JWT session token to read custom JWT claims (`org_id`, `user_role`) to route quickly.

2. **Routes built**:
   - `/login`: Secure email/password login.
   - `/signup`: Multi-tenant creation. Unauthenticated users create accounts and organizations. Authenticated users without profiles complete onboarding.
   - `/invite/[token]`: Secure server-validated portal mapping to `{ org_name, email, role }`. Allows quick login, signup, and automatic joining.
   - `(app)/*`: Auth-restricted route group sharing `app-shell.tsx` layout.
   - `/dashboard`: Layout with metric cards and welcome widgets.
   - `/people`: Member lists with role and team mappings. Allows owners/admins to send invites and delete pending invite tokens.
   - `/people/teams`: Department management. Allows team creation, deletion, renaming, and manager assignment.
   - `/settings`: Global setting panel for theme changes, profile editing, and org renaming (owners/admins).

3. **API Endpoints**:
   - `/api/invites`: Handled with role verification.
     - `POST`: Adds new row, generates token UUID, and sends email via Resend.
     - `DELETE`: Revokes the invite.

## Design Decisions
- **Vanilla Tailwind v4 Style**: Pure variables mapped to CSS tokens inside `globals.css`. Uses no gradients and features precise 1px borders with radius `4px`.
- **Base UI Integration**: Leveraged Base UI's clean trigger mechanisms instead of Radix UI to match shadcn's latest presets.
- **Performance-focused Middleware**: Parses JWT locally to check user role/org claims instead of hitting the database on every route query. Fallback to SQL occurs only once on initial onboarding.

## What's Next: Phase 2 (Timesheets)
1. **Timesheet Schema Hookup**: Create the UI views for `/timesheets`.
2. **Weekly Calendar grid**: Build a grid for time tracking using the JetBrains Mono tabular numbers font.
3. **Approval Workflows**: Add submission controls for employees and approval controls for managers/admins.
4. **Integration**: Link timesheet submissions with payroll processing.
