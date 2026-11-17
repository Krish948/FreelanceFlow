import { appHead } from "@/lib/route-head";
import { createFileRoute } from "@tanstack/react-router";
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
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { useInvoices, useProjects, useTimeLogs, useClients } from "@/lib/data";
import { money } from "@/lib/format";
import { revenueByMonth, outstanding, paidInMonth, monthKey, lastMonths } from "@/lib/analytics";
import { PageHeader, Panel, Stat, Empty } from "@/components/ui-kit";
import { TimeTrackerSection } from "@/components/TimeTrackerSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/freelancer/finance")({
  head: () => appHead("Finance", "Manage your FreelanceFlow finance."),
  component: Finance,
});

const axis = { fontSize: 12, fill: "var(--muted-foreground)" };
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Finance() {
  const { data: invoices = [] } = useInvoices();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: logs = [] } = useTimeLogs();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const paid = invoices.filter((i) => i.status === "PAID");
  const total = paid.reduce((s, i) => s + Number(i.total), 0);
  const out = outstanding(invoices);

  const byClient = clients
    .map((c) => ({
      name: c.name,
      value: paid.filter((i) => i.client_id === c.id).reduce((s, i) => s + Number(i.total), 0),
    }))
    .filter((x) => x.value > 0);
  // Revenue by project = billed time from paid invoices.
  const paidIds = new Set(paid.map((i) => i.id));
  const byProject = projects
    .map((p) => ({
      name: p.name,
      value: logs
        .filter((l) => l.project_id === p.id && l.invoice_id && paidIds.has(l.invoice_id))
        .reduce((s, l) => s + Number(l.billable_amount), 0),
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const hoursSeries = lastMonths(12).map((m) => ({
    month: m.label,
    hours: +(
      logs
        .filter((l) => l.billable && monthKey(l.start_time) === m.key)
        .reduce((s, l) => s + l.duration_minutes, 0) / 60
    ).toFixed(1),
  }));

  return (
    <>
      <PageHeader
        title="Time & Reports"
        subtitle="Track your work and review your business performance."
      />
      <Tabs defaultValue="time-tracker" className="w-full">
        <TabsList
          aria-label="Time and reports sections"
          className="mb-6 h-auto flex-wrap justify-start"
        >
          <TabsTrigger value="time-tracker">Time tracker</TabsTrigger>
          <TabsTrigger value="reports">Reports & analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="time-tracker" className="mt-0">
          <TimeTrackerSection />
        </TabsContent>
        <TabsContent value="reports" className="mt-0">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Reports & analytics</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Stat label="This month" value={money(paidInMonth(invoices, monthKey(now)))} />
              <Stat label="Last month" value={money(paidInMonth(invoices, monthKey(prev)))} />
              <Stat label="Total revenue" value={money(total)} />
              <Stat label="Unpaid invoices" value={out.open.length} />
              <Stat
                label="Overdue invoices"
                value={out.overdue.length}
                hint={money(out.overdueAmount)}
              />
              <Stat label="Outstanding" value={money(out.amount)} />
            </div>
            <section className="mt-8 overflow-x-auto">
              <h2 className="mb-4 text-xl font-semibold">Project profitability</h2>
              {!projects.length ? (
                <Empty>No projects yet.</Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3">Project</th>
                      <th className="text-right">Hours</th>
                      <th className="text-right">Earned</th>
                      <th className="text-right">Time value</th>
                      <th className="text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const entries = logs.filter((l) => l.project_id === p.id);
                      const earned = entries
                        .filter((l) => l.invoice_id && paidIds.has(l.invoice_id))
                        .reduce((s, l) => s + Number(l.billable_amount), 0);
                      const value = entries.reduce(
                        (s, l) => s + (l.duration_minutes / 60) * Number(l.hourly_rate),
                        0,
                      );
                      return (
                        <tr key={p.id} className="border-b">
                          <td className="py-3 pr-4">{p.name}</td>
                          <td className="text-right">
                            {(entries.reduce((s, l) => s + l.duration_minutes, 0) / 60).toFixed(1)}
                          </td>
                          <td className="text-right whitespace-nowrap">{money(earned)}</td>
                          <td className="text-right whitespace-nowrap">{money(value)}</td>
                          <td className="text-right whitespace-nowrap">{money(earned - value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Monthly revenue" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByMonth(invoices, 12)}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
                    <YAxis tick={axis} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Revenue by client">
                {byClient.length === 0 ? (
                  <Empty>No paid invoices yet.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={byClient}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {byClient.map((_, i) => (
                          <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Panel>
              <Panel title="Revenue by project">
                {byProject.length === 0 ? (
                  <Empty>No paid invoices yet.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={byProject} layout="vertical">
                      <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={axis}
                        width={100}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
              <Panel title="Billable hours over time" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={240}>
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
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
