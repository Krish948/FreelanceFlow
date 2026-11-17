import { createFileRoute } from "@tanstack/react-router";
import { ClientTasks } from "@/components/ClientTasks";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/client/tasks")({
  head: () => appHead("Tasks | Client", "Your FreelanceFlow client tasks."),
  component: Page,
});
function Page() {
  return <ClientTasks />;
}
