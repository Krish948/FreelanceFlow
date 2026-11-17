import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/components/AccountSettings";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/client/account")({
  head: () => appHead("Account | Client", "Your FreelanceFlow client account."),
  component: Page,
});
function Page() {
  return <AccountSettings />;
}
