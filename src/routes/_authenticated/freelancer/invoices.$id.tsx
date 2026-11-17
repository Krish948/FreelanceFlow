import { appHead } from "@/lib/route-head";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvoices, useProfile, unwrap } from "@/lib/data";
import { money, fmtDate, effectiveStatus, errMsg } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, ConfirmDelete, Empty } from "@/components/ui-kit";
import { PdfButton } from "@/components/PdfButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/freelancer/invoices/$id")({
  head: () => appHead("Invoice", "Manage your FreelanceFlow invoice."),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: me } = useProfile();
  const { data: items = [] } = useQuery({
    queryKey: ["invoice_items", id],
    queryFn: () => unwrap(supabase.from("invoice_items").select("*").eq("invoice_id", id)),
  });
  const { data: client } = useQuery({
    queryKey: ["invoice_client", id],
    enabled: !!invoices.find((i) => i.id === id),
    queryFn: () =>
      unwrap(
        supabase
          .from("clients")
          .select("*")
          .eq("id", invoices.find((i) => i.id === id)!.client_id)
          .single(),
      ),
  });
  const inv = invoices.find((i) => i.id === id);
  if (isLoading) return null;
  if (!inv) return <Empty>Invoice not found.</Empty>;
  const st = effectiveStatus(inv);

  async function setStatus(status: "SENT" | "PAID") {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success(status === "PAID" ? "Marked as paid" : "Marked as sent");
  }
  async function remove() {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries();
    navigate({ to: "/freelancer/invoices" });
  }

  return (
    <>
      <Link to="/freelancer/invoices" className="text-sm text-primary hover:underline">
        ← Invoices
      </Link>
      <PageHeader
        title={inv.invoice_number}
        subtitle={inv.clients?.name}
        actions={
          <>
            <PdfButton invoiceId={id} />
            {inv.status === "DRAFT" && (
              <Button variant="outline" onClick={() => setStatus("SENT")}>
                <Send className="h-4 w-4" />
                Mark sent
              </Button>
            )}
            {st !== "PAID" && (
              <Button onClick={() => setStatus("PAID")}>
                <CheckCircle2 className="h-4 w-4" />
                Mark paid
              </Button>
            )}
            {inv.status === "DRAFT" && (
              <ConfirmDelete
                title="Delete draft?"
                description="Its time entries will become unbilled again."
                onConfirm={remove}
                trigger={
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            )}
          </>
        }
      />
      <Panel className="p-8">
        <div className="flex flex-wrap justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">From</p>
            <p className="font-semibold">{me?.business_name || me?.name}</p>
            <p className="text-sm text-muted-foreground">{me?.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Bill to</p>
            <p className="font-semibold">{client?.name}</p>
            <p className="text-sm text-muted-foreground">
              {[client?.company, client?.email, client?.address].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-sm">
            <p>Issued {fmtDate(inv.issue_date)}</p>
            <p>Due {fmtDate(inv.due_date)}</p>
            <div className="mt-1">
              <StatusBadge value={st} />
            </div>
          </div>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2">Description</th>
              <th className="text-right">Hours</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.description}</td>
                <td className="text-right tabular">{Number(it.quantity).toFixed(2)}</td>
                <td className="text-right tabular">{money(it.rate)}</td>
                <td className="text-right tabular">{money(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-6 grid w-64 gap-1 text-sm tabular">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(inv.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({Number(inv.tax_rate)}%)</span>
            <span>{money(inv.tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-lg font-semibold">
            <span>Total</span>
            <span>{money(inv.total)}</span>
          </div>
        </div>
        {inv.notes && (
          <p className="mt-8 whitespace-pre-wrap text-sm text-muted-foreground">{inv.notes}</p>
        )}
      </Panel>
    </>
  );
}
