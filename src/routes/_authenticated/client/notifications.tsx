import { createFileRoute } from "@tanstack/react-router";
import { NotificationsList } from "@/components/NotificationsList";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/client/notifications")({
  head: () => appHead("Notifications | Client", "Your FreelanceFlow client notifications."),
  component: Page,
});
function Page() {
  return <NotificationsList />;
}
