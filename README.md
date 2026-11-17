# FreelanceFlow

FreelanceFlow is a role-based freelance operations workspace built for solo freelancers and client-facing teams. It combines client management, project planning, time tracking, invoice generation, subscription gating, and client collaboration into a single Supabase-backed app.

The current codebase is a working full-stack SaaS-style project using React, TanStack Start, Supabase, Tailwind, and a set of custom business components. It includes separate experiences for freelancers and clients and uses typed database access plus row-level security patterns to keep access scoped to the signed-in user.

## What this project does

FreelanceFlow is designed to help a freelancer manage the operational side of client work without switching between spreadsheets, messaging tools, billing systems, and project trackers.

The app currently supports:

- client CRM and account records
- project planning and project status tracking
- task management and deadlines
- project-level budget tracking
- time logging with a persistent timer and manual time entries
- invoice generation and payment tracking
- reports and dashboard analytics
- freelancer and client role-based workspaces
- client project orders that become shared projects when a freelancer accepts them
- project notifications and client collaboration data
- Free / Pro plan gating

## Core product structure

### Freelancer workspace

The freelancer side is the primary operational dashboard. It includes:

- dashboard overview with KPIs and charts
- client list with search and management tools
- open client-order marketplace; accepting an order creates an active project and client record
- project creation and project detail views
- task management with lifecycle status tracking
- tabbed time tracker and reports & analytics workspace
- invoice management and PDF generation (Pro)
- tabbed billing workspace for invoices, payments, and subscription
- payment and finance reporting
- profile, settings, and subscription management

### Client workspace

The client side provides a more restricted portal designed for access to only the information shared with that client. It includes:

- client dashboard
- project overview and status
- accepted project orders and shared project deadlines
- tasks and milestones visible to the client
- tabbed invoice and payment history
- project and billing notifications
- account settings

The app routes users according to role and prevents cross-role access by redirecting to the correct workspace. This behavior is enforced in the app routing and role helper logic.

## Important implementation details

### Role-based access

The project is intentionally split by role:

- `freelancer` accounts get the operations workspace
- `client` accounts get the customer-facing portal

Role checks are handled through a helper in `src/lib/roles.ts` and protected routes are wrapped in route-level guards under `src/routes/_authenticated`.

### Supabase-first architecture

Supabase remains the primary backend and data layer. The project uses:

- Supabase Auth for user authentication
- PostgreSQL tables for app data
- RLS-aware patterns for user scoping
- typed database access generated in `src/integrations/supabase/types.ts`
- query functions centered around `src/lib/data.ts`

This is not a MongoDB application and the database pattern is aligned with the project’s existing Supabase-first design.

### Timer and time data

The app has a stopwatch system that persists state using browser localStorage while the freelancer is using the app. Timer state includes the project selection, start time, accumulated duration, and running/paused state. The app also supports manual time entry and stores resulting records in `time_logs`.

### Invoice and finance logic

The finance layer includes monthly revenue tracking, outstanding invoice totals, overdue calculations, and derived project budget usage. The dashboard uses actual database-backed values rather than hardcoded numbers.

### Plan restrictions

The app includes a Free / Pro model:

- Free users are limited to two clients
- Pro users unlock expanded functionality such as PDF invoice generation
- the app shows upgrade messaging when limits are reached

These checks are surfaced in client UI and are aligned with the existing server/data-layer patterns in the codebase.

## Tech stack

This project is built with modern web tooling and a Supabase backend:

- React 19
- TypeScript
- Vite
- TanStack Start
- TanStack Router
- Tailwind CSS
- Radix UI primitives
- Supabase Auth + PostgreSQL
- Drizzle and SQL migration files
- Recharts for dashboard visualizations
- `pdf-lib` for invoice PDF generation
- Vitest for tests

## Repository layout

```text
.
├── AGENTS.md
├── README.md
├── bun.lock
├── bunfig.toml
├── components.json
├── drizzle/
│   ├── schema.ts
│   └── migrations/
├── patches/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── integrations/
│   │   ├── lovable/
│   │   └── supabase/
│   ├── lib/
│   ├── routes/
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   ├── styles.css
│   └── test/
├── supabase/
│   └── config.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── roadmap.md
└── .env
```

## Main application areas

### `src/routes/`

This directory contains the file-based TanStack routes for both freelancer and client flows.

Examples:

- `/auth`
- `/freelancer/dashboard`
- `/freelancer/clients` (clients, projects, and open orders)
- `/freelancer/finance` (time tracking and reports)
- `/freelancer/invoices` (billing sections)
- `/client/dashboard`
- `/client/projects`
- `/client/invoices` (invoices and payments)
- `/client/notifications`

### `src/components/`

UI and domain-specific widgets live here, including:

- dashboard cards and overview pages
- forms for clients, projects, tasks, and time entries
- invoice and payment displays
- workspace shell and shared layout navigation
- client portal components
- subscription and billing views

### `src/lib/`

This is the functional core of the app. It contains helpers for:

- analytics calculations
- formatting and date helpers
- auth and role checks
- timer logic
- invoice PDF generation
- Supabase data access utilities

### `src/integrations/supabase/`

This folder provides the Supabase integration layer and generated database types. It is the foundation for most of the app's database access patterns.

## Current features implemented in the codebase

The current project already contains these functional areas:

- client CRM with create/edit/delete workflows
- client project tracking and budget usage
- task lists tied to projects
- freelancer dashboard with revenue and outstanding calculations
- client dashboard with shared project visibility
- persistent stopwatch timer in the sidebar
- manual time entry and time log management
- invoice views and status handling
- payment reporting and overdue tracking
- finance charts and KPI cards
- project collaboration data (not currently exposed in the workspaces)
- subscription and plan management sections
- role-based navigation and route guards

## Environment setup

### Requirements

- Node.js 20+
- npm or Bun
- a configured Supabase project

### Install dependencies

Using npm:

```bash
npm install
```

Using Bun:

```bash
bun install
```

### Run locally

```bash
npm run dev
```

or:

```bash
bun run dev
```

### Run tests

```bash
npm test
```

or:

```bash
bun run test
```

### Build the app

```bash
npm run build
```

or:

```bash
bun run build
```

## Environment variables

The app expects a Supabase configuration. Typical values are similar to:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
SUPABASE_PROJECT_ID="<project-ref>"
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
VITE_SUPABASE_PROJECT_ID="<project-ref>"
```

The actual values must match your Supabase project and auth setup.

## Database and security model

The application is designed around a secure, multi-role SaaS data model. Key entities in the code and schema include:

- `profiles`
- `clients`
- `projects`
- `project_orders`
- `tasks`
- `time_logs`
- `invoices`
- `invoice_items`
- `subscriptions`
- `user_roles`
- `deliverables`
- `notifications`
- `messages`

The app is built to keep freelancer-owned data private while allowing client access only to shared records. This is enforced through Supabase access patterns, route guards, and role-based UI flows.

### Applying database migrations

SQL files under `drizzle/migrations` must be applied to the connected Supabase database; adding a migration file to the repository does not apply it to the hosted database automatically. To enable project orders and turn accepted orders into active, client-shared projects, run `0005_project_orders_marketplace.sql`, `0006_activate_accepted_project_orders.sql`, and `0007_repair_accepted_project_orders.sql` in order in the Supabase SQL Editor. If `0005` and `0006` have already been applied, run `0007` only; it repairs the acceptance function and converts previously assigned orders that are missing a project/client record. New acceptances create the freelancer's project and client record transactionally and carry over the deadline. The database and storage support for messages and deliverables remains, but those features are currently hidden from both workspaces. If a migration succeeds but its new schema does not appear, run `NOTIFY pgrst, 'reload schema';` in the SQL Editor and retry.

## Notes on current status

This repository is a working prototype and product-focused app rather than a fully commercial billing platform. It already includes the main freelancer + client workflow, but some product areas are best understood as staged functionality rather than complete external integrations.

Notable examples:

- billing is conceptually implemented but not fully connected to a live payment gateway
- some subscription details are product/stub patterns rather than real payment-processing flows

## Roadmap

The project includes a roadmap file for planned improvements. The current codebase already demonstrates the main functional structure, with ongoing improvements centered around deeper validation, production hardening, and billing integration.

## Summary

FreelanceFlow is a practical freelancer operations system that keeps client work organized, project budgets visible, time tracked accurately, and invoicing connected to the actual work. The codebase already reflects a real multi-role SaaS workflow with both freelancer and client experiences, and it remains strongly aligned to a Supabase-backed implementation.
