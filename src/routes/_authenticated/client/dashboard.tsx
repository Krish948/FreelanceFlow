import { createFileRoute } from "@tanstack/react-router";
import { ClientOverview } from "@/components/ClientOverview";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/client/dashboard")({
  head: () => appHead("Dashboard | Client", "Your FreelanceFlow client dashboard."),
  component: Page,
});
function Page() {
  return <ClientOverview />;
}
