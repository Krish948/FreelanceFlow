import { createFileRoute } from "@tanstack/react-router";
import { ClientInvoices } from "@/components/ClientInvoices";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/client/invoices")({
  head: () => appHead("Billing | Client", "Your FreelanceFlow invoices and payment history."),
  component: Page,
});
function Page() {
  return <ClientInvoices />;
}
