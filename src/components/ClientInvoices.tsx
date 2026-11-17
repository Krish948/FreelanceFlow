import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientInvoices } from "@/lib/portal-data";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/data";
import { PageHeader, Empty, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfButton } from "@/components/PdfButton";
import { money, fmtDate, effectiveStatus } from "@/lib/format";

export function ClientInvoices() {
  const { data: invoices = [], error } = useClientInvoices();
  const [selected, setSelected] = useState("");
  const { data: items = [] } = useQuery({
    queryKey: ["client_invoice_items", selected],
    enabled: !!selected,
    queryFn: () => unwrap(supabase.rpc("client_invoice_items", { _invoice_id: selected })),
  });
  const paidTotal = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const outstandingTotal = invoices
    .filter((invoice) => invoice.status !== "PAID")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);

  return (
    <>
      <PageHeader title="Billing" />
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList aria-label="Billing sections" className="mb-6 h-auto flex-wrap justify-start">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-0">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Invoices</h2>
            {error ? (
              <p className="text-destructive">{error.message}</p>
            ) : !invoices.length ? (
              <Empty>No invoices have been sent to you.</Empty>
            ) : (
              <div className="divide-y">
                {invoices.map((i) => (
                  <article key={i.id} className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{i.invoice_number}</h2>
                        <p className="text-sm text-muted-foreground">
                          {i.freelancer_business || i.freelancer_name} · Due {fmtDate(i.due_date)}
                        </p>
                        {i.paid_at && (
                          <p className="text-xs text-muted-foreground">Paid {fmtDate(i.paid_at)}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge value={effectiveStatus(i)} />
                        <span className="font-semibold tabular">{money(i.total)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(selected === i.id ? "" : i.id)}
                        >
                          {selected === i.id ? "Close" : "View invoice"}
                        </Button>
                        <PdfButton invoiceId={i.id} size="sm" client />
                      </div>
                    </div>
                    {selected === i.id && (
                      <div className="mt-4 overflow-x-auto border-t pt-4">
                        <div className="mb-4 text-sm">
                          <p>
                            {i.freelancer_business || i.freelancer_name} · {i.freelancer_email}
                          </p>
                          <p className="text-muted-foreground">{i.freelancer_address}</p>
                          <p className="mt-3">
                            Bill to: {i.client_name} · Issued {fmtDate(i.issue_date)}
                          </p>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-2">Description</th>
                              <th className="text-right">Quantity</th>
                              <th className="text-right">Rate</th>
                              <th className="text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((it, n) => (
                              <tr key={n} className="border-b">
                                <td className="py-3 pr-4">{it.description}</td>
                                <td className="text-right tabular">
                                  {Number(it.quantity).toFixed(2)}
                                </td>
                                <td className="text-right whitespace-nowrap">{money(it.rate)}</td>
                                <td className="text-right whitespace-nowrap">{money(it.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-4 text-right text-sm">
                          <p>Subtotal {money(i.subtotal)}</p>
                          <p>
                            Tax ({i.tax_rate}%) {money(i.tax)}
                          </p>
                          <p className="mt-1 font-semibold">Total {money(i.total)}</p>
                        </div>
                        {i.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{i.notes}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </TabsContent>
        <TabsContent value="payments" className="mt-0">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Payments</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground">Payments made</p>
                <p className="mt-2 font-display text-3xl">{money(paidTotal)}</p>
              </div>
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="mt-2 font-display text-3xl">{money(outstandingTotal)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Online payments are not connected. Payment status is shown with each invoice above.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
