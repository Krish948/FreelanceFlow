import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyRole, roleHome } from "@/lib/roles";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export const Route = createFileRoute("/_authenticated/client")({
  beforeLoad: async () => {
    const role = await getMyRole();
    if (role !== "client") throw redirect({ to: roleHome(role) });
  },
  component: ClientLayout,
});
function ClientLayout() {
  return (
    <WorkspaceShell role="client">
      <Outlet />
    </WorkspaceShell>
  );
}
