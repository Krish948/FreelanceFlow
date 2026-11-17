import { appHead } from "@/lib/route-head";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, startOfMonth, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useProjects, useTimeLogs } from "@/lib/data";
import { money, errMsg } from "@/lib/format";
import { PageHeader, Panel, Field, Empty, selectCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/freelancer/invoices/new")({
  head: () => appHead("New invoice", "Manage your FreelanceFlow new invoice."),
  component: Wizard,
});

const steps = ["Client", "Date range", "Review", "Tax & details"];

function Wizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: logs = [] } = useTimeLogs();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tax, setTax] = useState("18");
  const [due, setDue] = useState(format(addDays(new Date(), 15), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Preview only; the database recomputes and locks the exact entries when creating.
  const items = useMemo(() => {
    const pids = new Set(projects.filter((p) => p.client_id === clientId).map((p) => p.id));
    return logs.filter(
      (l) =>
        pids.has(l.project_id) &&
        !l.billed &&
        l.billable &&
        l.start_time.slice(0, 10) >= from &&
        l.start_time.slice(0, 10) <= to,
    );
  }, [logs, projects, clientId, from, to]);
  const subtotal = items.reduce((s, l) => s + Math.round(Number(l.billable_amount) * 100), 0) / 100;
  const taxAmt = Math.round(subtotal * Number(tax || 0)) / 100;

  async function create() {
    setBusy(true);
    const { data, error } = await supabase.rpc("create_invoice", {
      _client_id: clientId,
      _from: from,
      _to: to,
      _tax_rate: Number(tax) || 0,
      _due_date: due,
      _notes: notes || (undefined as unknown as string),
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["time_logs"] });
    toast.success("Invoice created");
    navigate({ to: "/freelancer/invoices/$id", params: { id: data as string } });
  }

  return (
    <>
      <PageHeader title="New invoice" subtitle="Turn unbilled time into an invoice." />
      <ol className="mb-6 flex flex-wrap gap-2 text-sm">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded-full px-3 py-1",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <Panel>
        {step === 0 && (
          <Field label="Client">
            <select
              className={selectCls}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
        )}
        {step === 2 &&
          (items.length === 0 ? (
            <Empty>No unbilled time for this client in that range.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {items.map((l) => (
                <li key={l.id} className="flex justify-between py-2">
                  <span>
                    {l.projects?.name}
                    {l.description ? ` — ${l.description}` : ""}{" "}
                    <span className="text-muted-foreground">· {l.start_time.slice(0, 10)}</span>
                  </span>
                  <span className="tabular">
                    {(l.duration_minutes / 60).toFixed(2)}h × {money(l.hourly_rate)} ={" "}
                    <b>{money(l.billable_amount)}</b>
                  </span>
                </li>
              ))}
              <li className="flex justify-between py-3 font-semibold">
                <span>Subtotal</span>
                <span className="tabular">{money(subtotal)}</span>
              </li>
            </ul>
          ))}
        {step === 3 && (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
              </Field>
              <Field label="Due date">
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                placeholder="Payment details, thank-you note…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <div className="ml-auto grid w-64 gap-1 text-sm tabular">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{money(taxAmt)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Total</span>
                <span>{money(subtotal + taxAmt)}</span>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          {step < 3 ? (
            <Button
              disabled={
                (step === 0 && !clientId) ||
                (step === 1 && from > to) ||
                (step === 2 && items.length === 0)
              }
              onClick={() => setStep(step + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button disabled={busy} onClick={create}>
              {busy ? "Creating…" : "Generate invoice"}
            </Button>
          )}
        </div>
      </Panel>
    </>
  );
}
