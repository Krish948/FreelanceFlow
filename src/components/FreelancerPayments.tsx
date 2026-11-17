import { Link } from "@tanstack/react-router";
import { useInvoices } from "@/lib/data";
import { PageHeader, Stat, Empty, StatusBadge } from "@/components/ui-kit";
import { money, fmtDate, effectiveStatus } from "@/lib/format";

export function FreelancerPayments({ showHeader = true }: { showHeader?: boolean }) {
  const { data: invoices = [] } = useInvoices();
  const sent = invoices.filter((i) => i.status !== "DRAFT");
  return (
    <>
      {showHeader && <PageHeader title="Payments" />}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Received"
          value={money(
            sent.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total), 0),
          )}
        />
        <Stat
          label="Pending"
          value={money(
            sent
              .filter((i) => effectiveStatus(i) === "SENT")
              .reduce((s, i) => s + Number(i.total), 0),
          )}
        />
        <Stat
          label="Outstanding"
          value={money(
            sent.filter((i) => i.status !== "PAID").reduce((s, i) => s + Number(i.total), 0),
          )}
        />
      </div>
      <h2 className="mb-4 text-xl font-semibold">Invoice payment history</h2>
      {!sent.length ? (
        <Empty>No sent invoices yet.</Empty>
      ) : (
        <ul className="divide-y">
          {sent.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <Link
                  to="/freelancer/invoices/$id"
                  params={{ id: i.id }}
                  className="font-medium text-primary"
                >
                  {i.invoice_number}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {i.clients?.name} ·{" "}
                  {i.paid_at ? "Paid " + fmtDate(i.paid_at) : "Due " + fmtDate(i.due_date)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge value={effectiveStatus(i)} />
                <span className="font-semibold">{money(i.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
