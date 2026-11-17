import { describe, it, expect } from "vitest";
import { effectiveStatus } from "@/lib/format";
import { outstanding, paidInMonth } from "@/lib/analytics";

const inv = (
  o: Partial<{ status: string; due_date: string; total: number; paid_at: string | null }>,
) => ({
  status: "SENT",
  due_date: "2099-01-01",
  total: 0,
  paid_at: null,
  issue_date: "2026-01-01",
  client_id: "c",
  ...o,
});

describe("invoice rules", () => {
  it("sent invoice past its due date is overdue", () => {
    expect(effectiveStatus(inv({ status: "SENT", due_date: "2000-01-01" }))).toBe("OVERDUE");
  });
  it("paid invoice is never overdue", () => {
    expect(effectiveStatus(inv({ status: "PAID", due_date: "2000-01-01" }))).toBe("PAID");
  });
  it("drafts are excluded from outstanding", () => {
    expect(outstanding([inv({ status: "DRAFT", total: 500 }), inv({ total: 3000 })]).amount).toBe(
      3000,
    );
  });
  it("missing or invalid invoice values are treated as zero instead of NaN", () => {
    expect(
      outstanding([
        inv({ status: "SENT", total: undefined as unknown as number, due_date: "2099-01-01" }),
      ]).amount,
    ).toBe(0);
    expect(effectiveStatus(inv({ status: "SENT", due_date: "bad-date" }))).toBe("SENT");
  });
  it("revenue sums paid invoices without float drift", () => {
    const list = [
      inv({ status: "PAID", total: 0.1, paid_at: "2026-03-05" }),
      inv({ status: "PAID", total: 0.2, paid_at: "2026-03-20" }),
    ];
    expect(paidInMonth(list, "2026-03")).toBe(0.3);
  });
});
