const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
export const money = (v: number | string | null | undefined) => inr.format(Number(v ?? 0));
export const hours = (minutes: number) => `${(minutes / 60).toFixed(1)}h`;
export const fmtDate = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
};
/** Effective invoice status: SENT/DRAFT past due date become OVERDUE. */
export function effectiveStatus(inv: { status: string; due_date?: string | null }) {
  if (inv.status === "PAID") return "PAID";
  if (!inv.due_date || typeof inv.due_date !== "string")
    return inv.status === "OVERDUE" ? "SENT" : inv.status;

  const today = new Date();
  const due = new Date(`${inv.due_date}T00:00:00Z`);
  if (Number.isNaN(due.getTime())) {
    return inv.status === "OVERDUE" ? "SENT" : inv.status;
  }

  const isPastDue = due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if ((inv.status === "SENT" || inv.status === "OVERDUE") && isPastDue) return "OVERDUE";
  return inv.status === "OVERDUE" ? "SENT" : inv.status;
}
export function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e);
  return m.replace(/^PLAN_LIMIT:\s*/, "");
}
