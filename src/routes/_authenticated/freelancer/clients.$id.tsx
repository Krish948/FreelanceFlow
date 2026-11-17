import { appHead } from "@/lib/route-head";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useProjects, useTimeLogs, useInvoices } from "@/lib/data";
import { money, hours, fmtDate, effectiveStatus, errMsg } from "@/lib/format";
import { PageHeader, Panel, Stat, StatusBadge, ConfirmDelete, Empty } from "@/components/ui-kit";
import { ClientDialog, ProjectDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/freelancer/clients/$id")({
  head: () => appHead("Client", "Manage your FreelanceFlow client."),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: logs = [] } = useTimeLogs();
  const { data: invoices = [] } = useInvoices();
  const c = clients.find((x) => x.id === id);
  if (isLoading) return null;
  if (!c) return <Empty>Client not found.</Empty>;

  const ps = projects.filter((p) => p.client_id === id);
  const pids = new Set(ps.map((p) => p.id));
  const cl = logs.filter((l) => pids.has(l.project_id));
  const inv = invoices.filter((i) => i.client_id === id);
  const billed = inv.reduce((s, i) => s + Number(i.total), 0);
  const outstanding = inv.filter((i) => effectiveStatus(i) !== "PAID" && i.status !== "DRAFT");

  async function remove() {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error)
      return toast.error(
        error.message.includes("foreign key")
          ? "This client has invoices and can't be deleted."
          : errMsg(error),
      );
    qc.invalidateQueries();
    navigate({ to: "/freelancer/clients" });
  }

  return (
    <>
      <Link to="/freelancer/clients" className="text-sm text-primary hover:underline">
        ← Clients
      </Link>
      <PageHeader
        title={c.name}
        subtitle={c.company ?? undefined}
        actions={
          <>
            <ClientDialog
              client={c}
              trigger={
                <Button variant="outline">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              }
            />
            <ConfirmDelete
              title="Delete client?"
              description="This removes the client with all its projects, tasks and time entries."
              onConfirm={remove}
              trigger={
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              }
            />
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Hourly rate" value={money(c.default_hourly_rate)} />
        <Stat label="Total hours" value={hours(cl.reduce((s, l) => s + l.duration_minutes, 0))} />
        <Stat label="Total billed" value={money(billed)} />
        <Stat
          label="Outstanding"
          value={money(outstanding.reduce((s, i) => s + Number(i.total), 0))}
          hint={`${outstanding.length} invoices`}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Contact">
          <dl className="grid gap-3 text-sm">
            {[
              ["Email", c.email],
              ["Phone", c.phone],
              ["Address", c.address],
              ["Notes", c.notes],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd>{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel
          title="Projects"
          className="lg:col-span-2"
          action={
            <ProjectDialog
              clientId={id}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                  Project
                </Button>
              }
            />
          }
        >
          {ps.length === 0 ? (
            <Empty>No projects yet.</Empty>
          ) : (
            <ul className="divide-y">
              {ps.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <Link
                    to="/freelancer/projects/$id"
                    params={{ id: p.id }}
                    className="font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {fmtDate(p.deadline)}
                    <StatusBadge value={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activity" className="lg:col-span-3">
          {cl.length === 0 && inv.length === 0 ? (
            <Empty>No activity yet.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {[
                ...cl.slice(0, 5).map((l) => ({
                  at: l.start_time,
                  t: `Logged ${hours(l.duration_minutes)} on ${l.projects?.name}`,
                })),
                ...inv.slice(0, 5).map((i) => ({
                  at: i.created_at,
                  t: `Invoice ${i.invoice_number} · ${money(i.total)}`,
                })),
              ]
                .sort((a, b) => b.at.localeCompare(a.at))
                .slice(0, 8)
                .map((a, n) => (
                  <li key={n} className="flex justify-between py-2">
                    <span>{a.t}</span>
                    <span className="text-muted-foreground">{fmtDate(a.at)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
