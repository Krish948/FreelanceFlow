<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture rules

- Business data is read/written from the browser via the Cloud client; owner RLS and restrictive role policies isolate freelancer data, while client RPC projections expose only verified-email-linked shared information without private financial columns.
- Persist roles in the protected user_roles table; role-specific layouts under the existing authentication gate determine navigation and URL access from the database role, never frontend state.
- Deliverables use a private Storage bucket with project-path authorization; client reviews use a narrow authenticated database RPC, never direct client updates to owner rows.
- Project messages and notifications are database-backed; scoped subscriptions mount in effects with cleanup to avoid cross-project event leaks.
- Money and plan rules live in the database: triggers compute time-log duration/amount, enforce the Free client limit, and guard invoice totals; `create_invoice` RPC is the only way to create invoices (transactional, marks logs billed).
- Plan is stored in subscriptions and is read-only to users; the legacy plan-change RPC is restricted to service_role until real billing is connected, preventing simulated self-upgrades.
- PDF generation runs in an authenticated server function (`src/lib/invoice-pdf.functions.ts`) that checks the plan server-side.
- Running timer state persists in localStorage (`src/lib/timer.ts`); saved duration comes from timestamps.
- tsconfig relaxes noImplicitReturns/noUncheckedIndexedAccess/exactOptionalPropertyTypes to keep UI code concise.
- AI calls go through the Lovable AI Gateway from server functions only (`src/lib/ai-planner.functions.ts`, helpers in `ai-gateway.server.ts`); Pro check + rate limit are done atomically by the `claim_ai_request` DB function before any model call.
- MCP agent integrations use OAuth sign-in (consent at /.lovable/oauth/consent); tools in src/lib/mcp, RLS via caller token.
