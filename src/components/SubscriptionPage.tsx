import { Link } from "@tanstack/react-router";
import { usePlan } from "@/lib/data";
import { PageHeader, Empty } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export function SubscriptionPage({ showHeader = true }: { showHeader?: boolean }) {
  const { data: plan } = usePlan();
  return (
    <>
      {showHeader && <PageHeader title="Subscription" />}
      <section className="border-y py-6">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <h2 className="mt-2 text-3xl font-semibold">{plan === "PRO" ? "Pro" : "Free"}</h2>
        <p className="mt-3 text-sm">
          {plan === "PRO"
            ? "Unlimited clients · PDF invoices · priority support"
            : "Up to 2 clients · Unlimited projects · Time tracking"}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/pricing">View plans</Link>
        </Button>
      </section>
      <h2 className="mb-4 mt-8 text-xl font-semibold">Billing history</h2>
      <Empty>No subscription transactions. Online billing is not connected.</Empty>
    </>
  );
}
