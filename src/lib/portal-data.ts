import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap, type ProjectOrder } from "@/lib/data";
import { acceptedProjectId } from "@/lib/project-orders";

export const useClientProjects = () =>
  useQuery({
    queryKey: ["client_projects"],
    queryFn: () => unwrap(supabase.rpc("client_projects")),
  });
export const useClientProjectOrders = () =>
  useQuery<ProjectOrder[]>({
    queryKey: ["client_project_orders"],
    queryFn: () =>
      unwrap(
        supabase.from("project_orders").select("*").order("created_at", {
          ascending: false,
        }),
      ),
  });
export const useOpenProjectOrders = () =>
  useQuery<ProjectOrder[]>({
    queryKey: ["open_project_orders"],
    queryFn: () =>
      unwrap(
        supabase.from("project_orders").select("*").eq("status", "OPEN").order("created_at", {
          ascending: false,
        }),
      ),
  });
export async function acceptProjectOrder(orderId: string) {
  const { data, error } = await supabase.rpc("accept_project_order", {
    _order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return acceptedProjectId(data);
}
export const useClientTasks = () =>
  useQuery({ queryKey: ["client_tasks"], queryFn: () => unwrap(supabase.rpc("client_tasks")) });
export const useClientInvoices = () =>
  useQuery({
    queryKey: ["client_invoices"],
    queryFn: () => unwrap(supabase.rpc("client_invoices")),
  });
export const useDeliverables = () =>
  useQuery({
    queryKey: ["deliverables"],
    queryFn: () =>
      unwrap(supabase.from("deliverables").select("*").order("created_at", { ascending: false })),
  });
export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const notifications = await unwrap(
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      );
      return notifications.filter(
        (notification) => !["message", "deliverable", "approval"].includes(notification.kind),
      );
    },
  });
