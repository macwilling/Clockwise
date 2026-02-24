# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Clockwise** is a web app for managing consulting timesheets and generating invoices. Core features: time tracking linked to clients, invoice creation from uninvoiced entries, PDF generation, and email delivery.

## Tech Stack

- **Frontend:** React 18, TypeScript (strict), Tailwind CSS 4, Radix UI, React Router 7, React Hook Form
- **Build:** Vite 6
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions via Deno/Hono)
- **PDF:** jsPDF + jspdf-autotable
- **Email:** Resend API (optional)
- **Testing:** Vitest + jsdom
- **Linting/Formatting:** ESLint 9, Prettier 3

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript type check (no emit)
npm run lint         # ESLint
npm run format       # Prettier (TS, TSX, CSS, JSON, MD)
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

## Project Structure

```
src/
  app/
    App.tsx                  # Router root
    contexts/DataContext.tsx  # Central state (clients, entries, invoices, settings)
    components/
      ui/                    # 69 Radix UI + Tailwind primitives
      clients/               # Client detail, form, time entry form, invoice form
      invoices/              # Invoice detail, list, new invoice flow, public view
      timesheet/             # Weekly calendar, time blocks, entry form
      settings/              # Settings page
    types/data.ts            # All TypeScript domain interfaces
    utils/
      supabaseClient.ts      # Supabase singleton
      supabaseMappers.ts     # DB rows → domain objects
      generateInvoicePDF.ts  # PDF generation
  config/supabase.ts         # Supabase config from env vars
supabase/
  functions/server/          # Deno/Hono edge function (auth, email, server logic)
  migrations/                # SQL migrations
docs/                        # Developer and user-facing documentation
guidelines/                  # Custom guidelines (Guidelines.md)
```

## Architecture

**State:** React Context (`DataContext`) holds all domain data. Components read from context and write directly to Supabase. No Redux.

**Data flow:** Supabase DB → mappers (`supabaseMappers.ts`) → typed domain objects → Context → components.

**Auth:** Supabase JWT + Row Level Security (RLS). Users access only their own data.

**Invoice workflow:**
1. Select client → system shows all uninvoiced entries
2. Filter by date, exclude entries with checkboxes
3. Review/override rates per line item
4. Create invoice → entries marked as `invoice_id` (prevents double-billing)

**Backend:** Edge Functions (Deno/Hono) handle email, auth flows, and server-side logic.

## Conventions

**Naming:**
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- DB columns/tables: `snake_case`

**TypeScript:** Strict mode. All domain interfaces live in `src/app/types/data.ts`.

**Styling:** Tailwind utility classes only. Use `clsx` for conditional classes. Theme variables in `src/app/styles/theme.css`.

**Components:** Function components with hooks. One main component per file.

**Tests:** Colocate with source as `*.test.ts` or `*.spec.ts`.

**Error handling:** Sonner toasts for user feedback. Try/catch for async Supabase calls.

## Environment Variables

Copy `.env.example` to `.env`:

```
VITE_SUPABASE_PROJECT_ID=   # Supabase Dashboard → Settings → API
VITE_SUPABASE_ANON_KEY=     # Public anon key
```

Edge Function secrets (set via `supabase secrets set`):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY              # Optional: email sending
GOOGLE_MAPS_API_KEY         # Optional: maps
```

## Database Schema

Key tables: `clients`, `time_entries` (with nullable `invoice_id`), `invoices`, `invoice_line_items` (with optional `time_entry_id`), `user_settings`, `email_history`.

Run migrations in `supabase/migrations/` in order when setting up a new project.

## Key Documentation

- `docs/developer-reference.md` — Invoice API reference and code examples
- `docs/invoice-workflow.md` — Invoice creation workflow
- `docs/implementation-summary.md` — Technical implementation details
