import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type Ctx = Parameters<typeof supabaseForUser>[0];

interface QueryResult {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
}

interface FilterableQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: string): FilterableQuery;
}

async function rows(
  ctx: Ctx,
  table: string,
  columns: string,
  order: string,
  filter?: (q: FilterableQuery) => FilterableQuery,
) {
  if (!ctx.isAuthenticated()) throw new ToolError("Not signed in");
  let q = supabaseForUser(ctx)
    .from(table)
    .select(columns)
    .order(order, { ascending: false })
    .limit(200) as unknown as FilterableQuery;
  if (filter) q = filter(q);
  const { data, error } = await q;
  if (error) throw new ToolError(error.message);
  const list = (data ?? []) as Record<string, string | number | boolean | null>[];
  return {
    content: [{ type: "text" as const, text: JSON.stringify(list) }],
    structuredContent: { rows: list },
  };
}

const ro = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

export const listClients = defineTool({
  name: "list_clients",
  title: "List clients",
  description: "List your clients with contact details and default hourly rate (INR).",
  inputSchema: {},
  annotations: ro,
  handler: (_a, ctx) =>
    rows(ctx, "clients", "id, name, company, email, phone, default_hourly_rate", "created_at"),
});

export const listProjects = defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List your projects, optionally for one client.",
  inputSchema: {
    clientId: z.string().uuid().optional().describe("Only projects for this client id."),
  },
  annotations: ro,
  handler: ({ clientId }, ctx) =>
    rows(
      ctx,
      "projects",
      "id, client_id, name, status, deadline, budget, hourly_rate",
      "created_at",
      (q) => (clientId ? q.eq("client_id", clientId) : q),
    ),
});

export const listTasks = defineTool({
  name: "list_tasks",
  title: "List tasks",
  description: "List tasks for a project with status, priority and estimated hours.",
  inputSchema: { projectId: z.string().uuid().describe("Project id.") },
  annotations: ro,
  handler: ({ projectId }, ctx) =>
    rows(
      ctx,
      "tasks",
      "id, title, status, priority, phase, estimated_hours, due_date",
      "created_at",
      (q) => q.eq("project_id", projectId),
    ),
});

export const listTimeLogs = defineTool({
  name: "list_time_logs",
  title: "List time logs",
  description: "List recent tracked time entries with duration and billable amount (INR).",
  inputSchema: {
    projectId: z.string().uuid().optional().describe("Only logs for this project id."),
  },
  annotations: ro,
  handler: ({ projectId }, ctx) =>
    rows(
      ctx,
      "time_logs",
      "id, project_id, description, start_time, end_time, duration_minutes, billable, billable_amount, billed",
      "start_time",
      (q) => (projectId ? q.eq("project_id", projectId) : q),
    ),
});

export const listInvoices = defineTool({
  name: "list_invoices",
  title: "List invoices",
  description: "List your invoices with status, dates and totals (INR).",
  inputSchema: {},
  annotations: ro,
  handler: (_a, ctx) =>
    rows(
      ctx,
      "invoices",
      "id, invoice_number, client_id, status, issue_date, due_date, total, paid_at",
      "created_at",
    ),
});

export const createTask = defineTool({
  name: "create_task",
  title: "Create task",
  description: "Add a task to one of your projects.",
  inputSchema: {
    projectId: z.string().uuid().describe("Project id."),
    title: z.string().min(1).max(200).describe("Task title."),
    description: z.string().max(2000).optional().describe("Task details."),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional().describe("Priority, default MEDIUM."),
    estimatedHours: z.number().min(0).max(1000).optional().describe("Estimated hours."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ projectId, title, description, priority, estimatedHours }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not signed in");
    const userId = ctx.getUserId();
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .insert({
        project_id: projectId,
        title,
        description: description ?? null,
        priority: priority ?? "MEDIUM",
        estimated_hours: estimatedHours ?? null,
        user_id: userId,
      })
      .select("id, title")
      .single();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Created task "${data.title}" (${data.id}).` }],
      structuredContent: { id: data.id, title: data.title },
    };
  },
});
