import { appHead } from "@/lib/route-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useInvoices } from "@/lib/data";
import { money, fmtDate, effectiveStatus } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Empty } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FreelancerPayments } from "@/components/FreelancerPayments";
import { SubscriptionPage } from "@/components/SubscriptionPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/freelancer/invoices/")({
  head: () => appHead("Billing", "Manage invoices, payments, and your subscription."),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { data: invoices = [] } = useInvoices();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const list = invoices.filter(
    (i) =>
      (status === "ALL" || effectiveStatus(i) === status) &&
      [i.invoice_number, i.clients?.name, i.clients?.company].some((v) =>
        v?.toLowerCase().includes(q.toLowerCase()),
      ),
  );
  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Manage invoices, payments, and your subscription."
        actions={
          <Button asChild>
            <Link to="/freelancer/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        }
      />
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList aria-label="Billing sections" className="mb-6 h-auto flex-wrap justify-start">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-0">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Invoices</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search invoices"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="flex rounded-md border p-0.5 text-sm">
                {["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={
                      status === s
                        ? "rounded bg-primary px-3 py-1 text-primary-foreground"
                        : "px-3 py-1 text-muted-foreground"
                    }
                  >
                    {s === "ALL" ? "All" : s.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <Panel className="overflow-x-auto">
              {list.length === 0 ? (
                <Empty>No invoices yet. Create one from unbilled time.</Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <Link
                            to="/freelancer/invoices/$id"
                            params={{ id: i.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {i.invoice_number}
                          </Link>
                        </TableCell>
                        <TableCell>{i.clients?.name}</TableCell>
                        <TableCell>{fmtDate(i.issue_date)}</TableCell>
                        <TableCell>{fmtDate(i.due_date)}</TableCell>
                        <TableCell>
                          <StatusBadge value={effectiveStatus(i)} />
                        </TableCell>
                        <TableCell className="text-right tabular font-medium">
                          {money(i.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </section>
        </TabsContent>
        <TabsContent value="payments" className="mt-0">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Payments</h2>
            <FreelancerPayments showHeader={false} />
          </section>
        </TabsContent>
        <TabsContent value="subscription" className="mt-0">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Subscription</h2>
            <SubscriptionPage showHeader={false} />
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
