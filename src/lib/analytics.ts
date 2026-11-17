import { effectiveStatus } from "./format";

type Inv = {
  status: string;
  due_date: string;
  total: number | string;
  paid_at: string | null;
  issue_date: string;
  client_id: string;
};

const safeNumber = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const toCents = (value: number | string | null | undefined) => Math.round(safeNumber(value) * 100);

export const monthKey = (d: Date | string) => {
  const x = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
export function lastMonths(n: number, now = new Date()) {
  const safeN = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return Array.from({ length: safeN }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (safeN - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleDateString("en-IN", { month: "short" }) };
  });
}
/** Revenue = paid invoices, counted in the month they were paid. Uses paise integers to avoid float drift. */
export function revenueByMonth(invoices: Inv[], months = 6) {
  const m = lastMonths(months);
  const map = new Map(m.map((x) => [x.key, 0]));
  for (const i of invoices) {
    if (i.status !== "PAID" || !i.paid_at) continue;
    const k = monthKey(i.paid_at);
    if (map.has(k)) map.set(k, map.get(k)! + toCents(i.total));
  }
  return m.map((x) => ({ month: x.label, revenue: map.get(x.key)! / 100 }));
}
export function outstanding(invoices: Inv[]) {
  const open = invoices.filter((i) => i.status !== "DRAFT" && effectiveStatus(i) !== "PAID");
  const overdue = open.filter((i) => effectiveStatus(i) === "OVERDUE");
  const sum = (a: Inv[]) => a.reduce((s, i) => s + toCents(i.total), 0) / 100;
  return { open, overdue, amount: sum(open), overdueAmount: sum(overdue) };
}
export function paidInMonth(invoices: Inv[], key: string) {
  return (
    invoices
      .filter((i) => i.status === "PAID" && i.paid_at && monthKey(i.paid_at) === key)
      .reduce((s, i) => s + toCents(i.total), 0) / 100
  );
}
