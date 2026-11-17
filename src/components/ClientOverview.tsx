import { Link } from "@tanstack/react-router";
import {
  useClientProjects,
  useClientTasks,
  useClientInvoices,
  useNotifications,
} from "@/lib/portal-data";
import { useProfile } from "@/lib/data";
import { PageHeader, Stat, Empty } from "@/components/ui-kit";
import { money, fmtDate } from "@/lib/format";
import { FolderKanban, FileText, Wallet } from "lucide-react";

export function ClientOverview() {
  const { data: projects = [] } = useClientProjects();
  const { data: tasks = [] } = useClientTasks();
  const { data: invoices = [] } = useClientInvoices();
  const { data: notifications = [] } = useNotifications();
  const { data: profile } = useProfile();
  const deadlines = [
    ...projects
      .filter((p) => p.deadline && p.status !== "COMPLETED")
      .map((p) => ({ title: p.name, date: p.deadline })),
    ...tasks
      .filter((t) => t.due_date && t.status !== "COMPLETED")
      .map((t) => ({ title: t.title, date: t.due_date })),
  ]
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .slice(0, 6);
  return (
    <>
      <PageHeader
        title={`Hello${profile?.name ? ", " + profile.name.split(" ")[0] : ""}`}
        subtitle="Your client workspace"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label="Total projects"
          value={projects.length}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <Stat
          label="Active projects"
          value={projects.filter((p) => p.status === "ACTIVE").length}
        />
        <Stat
          label="Completed projects"
          value={projects.filter((p) => p.status === "COMPLETED").length}
        />
        <Stat
          label="Pending invoices"
          value={invoices.filter((i) => i.status !== "PAID").length}
          icon={<FileText className="h-4 w-4" />}
        />
        <Stat
          label="Payments made"
          value={money(
            invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total), 0),
          )}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Upcoming deadlines</h2>
          {!deadlines.length ? (
            <Empty>Nothing due yet.</Empty>
          ) : (
            <ul className="divide-y">
              {deadlines.map((d, i) => (
                <li key={i} className="flex justify-between gap-3 py-3 text-sm">
                  <span>{d.title}</span>
                  <span className="shrink-0 text-muted-foreground">{fmtDate(d.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="mb-4 flex justify-between">
            <h2 className="text-xl font-semibold">Recent activity</h2>
            <Link to="/client/notifications" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {!notifications.length ? (
            <Empty>No updates yet.</Empty>
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="py-3 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
