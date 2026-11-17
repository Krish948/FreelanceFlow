import { createFileRoute } from "@tanstack/react-router";
import { ClientProjects } from "@/components/ClientProjects";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/client/projects")({
  head: () => appHead("Projects | Client", "Your FreelanceFlow client projects."),
  component: Page,
});
function Page() {
  return <ClientProjects />;
}
