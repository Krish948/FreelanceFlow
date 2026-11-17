import { appHead } from "@/lib/route-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderKanban, Users, Clock, FileText, Wallet, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { startOfMonth } from "date-fns";
import {
  useClients,
  useProjects,
  useTasks,
  useTimeLogs,
  useInvoices,
  useProfile,
} from "@/lib/data";
import { money, hours, fmtDate } from "@/lib/format";
import { revenueByMonth, outstanding, paidInMonth, monthKey, lastMonths } from "@/lib/analytics";
import { PageHeader, Panel, Stat, Empty } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/freelancer/dashboard")({
  head: () => appHead("Dashboard", "Manage your FreelanceFlow dashboard."),
  component: Dashboard,
});

const axis = { fontSize: 12, fill: "var(--muted-foreground)" };

function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: logs = [] } = useTimeLogs();
  const { data: invoices = [] } = useInvoices();
  const { data: me } = useProfile();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const out = outstanding(invoices);
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 14 * 864e5).toISOString().slice(0, 10);

  const deadlines = [
    ...projects.flatMap((p) =>
      p.deadline && p.status !== "COMPLETED" && p.deadline <= soon
        ? [{ id: p.id, kind: "Project", name: p.name, date: p.deadline, pid: p.id }]
        : [],
    ),
    ...tasks.flatMap((t) =>
      t.due_date && t.status !== "COMPLETED" && t.due_date <= soon
        ? [{ id: t.id, kind: "Task", name: t.title, date: t.due_date, pid: t.project_id }]
        : [],
    ),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const activity = [
    ...clients.map((c) => ({ at: c.created_at, t: `New client · ${c.name}` })),
    ...projects.map((p) => ({ at: p.created_at, t: `Project created · ${p.name}` })),
    ...logs.map((l) => ({
      at: l.created_at,
      t: `Logged ${hours(l.duration_minutes)} · ${l.projects?.name}`,
    })),
    ...invoices.map((i) => ({ at: i.created_at, t: `Invoice generated · ${i.invoice_number}` })),
    ...invoices.flatMap((i) =>
      i.paid_at
        ? [{ at: i.paid_at, t: `Invoice paid · ${i.invoice_number} · ${money(i.total)}` }]
        : [],
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const months = lastMonths(6);
  const hoursSeries = months.map((m) => ({
    month: m.label,
    hours: +(
      logs
        .filter((l) => l.billable && monthKey(l.start_time) === m.key)
        .reduce((s, l) => s + l.duration_minutes, 0) / 60
    ).toFixed(1),
  }));
  const outSeries = months.map((m) => ({
    month: m.label,
    amount: out.open
      .filter((i) => monthKey(i.issue_date) === m.key)
      .reduce((s, i) => s + Number(i.total), 0),
  }));
  const budgets = projects
    .filter((p) => p.status === "ACTIVE" && Number(p.budget) > 0)
    .slice(0, 5)
    .map((p) => {
      const used = logs
        .filter((l) => l.project_id === p.id)
        .reduce((s, l) => s + Number(l.billable_amount), 0);
      return { p, used, pct: (used / Number(p.budget)) * 100 };
    });

  return (
    <>
      <PageHeader
        title={`Hello${me?.name ? ", " + me.name.split(" ")[0] : ""}`}
        subtitle={now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Active projects"
          value={projects.filter((p) => p.status === "ACTIVE").length}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <Stat label="Clients" value={clients.length} icon={<Users className="h-4 w-4" />} />
        <Stat
          label="Hours this month"
          value={hours(
            logs
              .filter((l) => new Date(l.start_time) >= monthStart)
              .reduce((s, l) => s + l.duration_minutes, 0),
          )}
          icon={<Clock className="h-4 w-4" />}
        />
        <Stat
          label="Pending invoices"
          value={out.open.length}
          icon={<FileText className="h-4 w-4" />}
        />
        <Stat label="Outstanding" value={money(out.amount)} icon={<Wallet className="h-4 w-4" />} />
        <Stat
          label="Revenue this month"
          value={money(paidInMonth(invoices, monthKey(now)))}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Total revenue / received"
          value={money(
            invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total), 0),
          )}
        />
        <Stat
          label="Total tracked hours"
          value={hours(logs.reduce((s, l) => s + l.duration_minutes, 0))}
        />
        <Stat label="Pending tasks" value={tasks.filter((t) => t.status !== "COMPLETED").length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly revenue">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByMonth(invoices)}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Outstanding payments (by issue month)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={outSeries}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="amount" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Billable hours">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hoursSeries}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={40} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="var(--chart-3)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Project budget usage">
          {budgets.length === 0 ? (
            <Empty>No active projects with a budget.</Empty>
          ) : (
            <div className="grid gap-4">
              {budgets.map(({ p, used, pct }) => (
                <div key={p.id}>
                  <div className="flex justify-between text-sm">
                    <Link
                      to="/freelancer/projects/$id"
                      params={{ id: p.id }}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="tabular text-muted-foreground">
                      {money(used)} / {money(p.budget)}
                    </span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="mt-1.5 h-2" />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Active projects">
          {projects.filter((project) => project.status === "ACTIVE").length === 0 ? (
            <Empty>No active projects yet.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {projects
                .filter((project) => project.status === "ACTIVE")
                .slice(0, 5)
                .map((project) => (
                  <li key={project.id} className="py-3">
                    <Link
                      to="/freelancer/projects/$id"
                      params={{ id: project.id }}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {project.clients?.name || "Client"} · Due {fmtDate(project.deadline)}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming deadlines">
          {deadlines.length === 0 ? (
            <Empty>Nothing due in the next two weeks.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {deadlines.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <Link
                    to="/freelancer/projects/$id"
                    params={{ id: d.pid }}
                    className="hover:underline"
                  >
                    <span className="mr-2 text-xs text-muted-foreground">{d.kind}</span>
                    {d.name}
                  </Link>
                  <span
                    className={
                      d.date < today ? "font-semibold text-destructive" : "text-muted-foreground"
                    }
                  >
                    {fmtDate(d.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent activity">
          {activity.length === 0 ? (
            <Empty>Add a client to get started.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {activity.map((a, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{a.t}</span>
                  <span className="shrink-0 text-muted-foreground">{fmtDate(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
