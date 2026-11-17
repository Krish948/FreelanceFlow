import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyRole, roleHome } from "@/lib/roles";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export const Route = createFileRoute("/_authenticated/freelancer")({
  beforeLoad: async () => {
    const role = await getMyRole();
    if (role !== "freelancer") throw redirect({ to: roleHome(role) });
  },
  component: FreelancerLayout,
});
function FreelancerLayout() {
  return (
    <WorkspaceShell role="freelancer">
      <Outlet />
    </WorkspaceShell>
  );
}
