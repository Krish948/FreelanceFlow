import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Client = Tables<"clients">;
export type Project = Tables<"projects">;
export type ProjectOrder = Tables<"project_orders">;
export type Task = Tables<"tasks">;
export type TimeLog = Tables<"time_logs">;
export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;

async function unwrap<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

// All reads are scoped to the signed-in user by row-level security in the database.
export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: () => unwrap(supabase.from("clients").select("*").order("name")),
  });
export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      unwrap(
        supabase
          .from("projects")
          .select("*, clients(name, default_hourly_rate)")
          .order("created_at", { ascending: false }),
      ),
  });
export const useTasks = () =>
  useQuery({
    queryKey: ["tasks"],
    queryFn: () => unwrap(supabase.from("tasks").select("*").order("created_at")),
  });
export const useTimeLogs = () =>
  useQuery({
    queryKey: ["time_logs"],
    queryFn: () =>
      unwrap(
        supabase
          .from("time_logs")
          .select("*, projects(name, client_id)")
          .order("start_time", { ascending: false }),
      ),
  });
export const useInvoices = () =>
  useQuery({
    queryKey: ["invoices"],
    queryFn: () =>
      unwrap(
        supabase
          .from("invoices")
          .select("*, clients(name, company)")
          .order("created_at", { ascending: false }),
      ),
  });
export const usePlan = () =>
  useQuery({
    queryKey: ["plan"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("plan").maybeSingle();
      return (data?.plan ?? "FREE") as "FREE" | "PRO";
    },
  });
export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export { unwrap };
