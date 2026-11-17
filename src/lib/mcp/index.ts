import { auth, defineMcp } from "@lovable.dev/mcp-js";
import {
  listClients,
  listProjects,
  listTasks,
  listTimeLogs,
  listInvoices,
  createTask,
} from "./tools/reads";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "screenshot-match",
  title: "Screenshot Match",
  version: "0.1.0",
  instructions:
    "FreelanceFlow tools for the signed-in freelancer: read clients, projects, tasks, time logs and invoices (amounts in INR), and add tasks to a project.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClients, listProjects, listTasks, listTimeLogs, listInvoices, createTask],
});
