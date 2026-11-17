import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Standard PDF fonts can't render the ₹ glyph, so amounts use "Rs.".
const rs = (n: number | string) =>
  "Rs. " +
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const d = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const generateInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: role, error: roleError } = await sb.rpc("my_role");
    if (roleError || (role !== "client" && role !== "freelancer"))
      return { ok: false as const, error: "Access denied" };
    const isClient = role === "client";
    let allowed = false;
    if (isClient) {
      const result = await sb.rpc("client_invoice_pdf_allowed", { _invoice_id: data.invoiceId });
      allowed = !result.error && result.data === true;
    } else {
      const { data: sub } = await sb.from("subscriptions").select("plan").maybeSingle();
      allowed = sub?.plan === "PRO";
    }
    if (!allowed)
      return {
        ok: false as const,
        error: isClient
          ? "PDF unavailable. Ask your freelancer for a copy."
          : "PDF invoices are a Pro feature. Upgrade to Pro to download PDFs.",
      };
    const ownerInvoice = isClient
      ? null
      : (
          await sb
            .from("invoices")
            .select("*, clients(*)")
            .eq("id", data.invoiceId)
            .eq("user_id", context.userId)
            .maybeSingle()
        ).data;
    const clientInvoice = isClient
      ? (await sb.rpc("client_invoices")).data?.find((i) => i.id === data.invoiceId)
      : null;
    const inv = ownerInvoice ?? clientInvoice;
    if (!inv) return { ok: false as const, error: "Invoice not found" };
    const items = isClient
      ? (await sb.rpc("client_invoice_items", { _invoice_id: inv.id })).data
      : (await sb.from("invoice_items").select("*").eq("invoice_id", inv.id)).data;
    const me = isClient ? null : (await sb.from("profiles").select("*").maybeSingle()).data;

    const today = new Date().toISOString().slice(0, 10);
    const status =
      inv.status === "PAID"
        ? "PAID"
        : inv.status !== "DRAFT" && inv.due_date < today
          ? "OVERDUE"
          : inv.status;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.12, 0.22, 0.18),
      mute = rgb(0.45, 0.48, 0.46),
      gold = rgb(0.85, 0.62, 0.2);
    const text = (
      t: string,
      x: number,
      y: number,
      o: { size?: number; f?: typeof font; c?: typeof ink } = {},
    ) => page.drawText(t ?? "", { x, y, size: o.size ?? 10, font: o.f ?? font, color: o.c ?? ink });
    const right = (
      t: string,
      xr: number,
      y: number,
      o: { size?: number; f?: typeof font; c?: typeof ink } = {},
    ) => text(t, xr - (o.f ?? font).widthOfTextAtSize(t, o.size ?? 10), y, o);

    page.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: ink });
    text("FreelanceFlow", 40, 798, { size: 20, f: bold, c: rgb(0.97, 0.96, 0.92) });
    right("INVOICE", 555, 806, { size: 18, f: bold, c: gold });
    right(inv.invoice_number, 555, 788, { size: 10, c: rgb(0.9, 0.9, 0.85) });

    let y = 735;
    text("FROM", 40, y, { size: 8, f: bold, c: mute });
    text("BILL TO", 300, y, { size: 8, f: bold, c: mute });
    y -= 16;
    const from = clientInvoice
      ? [
          clientInvoice.freelancer_business || clientInvoice.freelancer_name,
          clientInvoice.freelancer_email,
          clientInvoice.freelancer_address,
        ].filter((v): v is string => !!v)
      : [
          me?.business_name || me?.name || "",
          me?.email ?? "",
          me?.phone ?? "",
          me?.address ?? "",
        ].filter(Boolean);
    const c = ownerInvoice?.clients;
    const to = clientInvoice
      ? [clientInvoice.client_name]
      : [c?.name ?? "", c?.company ?? "", c?.email ?? "", c?.phone ?? "", c?.address ?? ""].filter(
          Boolean,
        );
    from.forEach((l, i) => text(l, 40, y - i * 14, { f: i === 0 ? bold : font }));
    to.forEach((l, i) => text(l, 300, y - i * 14, { f: i === 0 ? bold : font }));
    y -= Math.max(from.length, to.length) * 14 + 20;

    [
      ["Issue date", d(inv.issue_date)],
      ["Due date", d(inv.due_date)],
      ["Status", status],
    ].forEach(([k, v], i) => {
      text(k.toUpperCase(), 40 + i * 140, y, { size: 8, f: bold, c: mute });
      text(v, 40 + i * 140, y - 14, {
        f: bold,
        c: k === "Status" && v === "OVERDUE" ? rgb(0.75, 0.2, 0.15) : ink,
      });
    });
    y -= 45;

    page.drawRectangle({ x: 40, y: y - 6, width: 515, height: 22, color: rgb(0.95, 0.94, 0.9) });
    text("DESCRIPTION", 48, y, { size: 8, f: bold });
    right("HOURS", 380, y, { size: 8, f: bold });
    right("RATE", 465, y, { size: 8, f: bold });
    right("AMOUNT", 548, y, { size: 8, f: bold });
    y -= 24;
    for (const it of items ?? []) {
      if (y < 160) break;
      const desc =
        it.description.length > 60 ? it.description.slice(0, 57) + "..." : it.description;
      text(desc, 48, y);
      right(Number(it.quantity).toFixed(2), 380, y);
      right(rs(it.rate), 465, y);
      right(rs(it.amount), 548, y);
      page.drawLine({
        start: { x: 40, y: y - 8 },
        end: { x: 555, y: y - 8 },
        thickness: 0.5,
        color: rgb(0.88, 0.87, 0.83),
      });
      y -= 22;
    }
    y -= 10;
    const tot = (k: string, v: string, b = false) => {
      right(k, 465, y, { f: b ? bold : font });
      right(v, 548, y, { f: b ? bold : font, size: b ? 12 : 10 });
      y -= 18;
    };
    tot("Subtotal", rs(inv.subtotal));
    tot(`Tax (${Number(inv.tax_rate)}%)`, rs(inv.tax));
    page.drawLine({
      start: { x: 360, y: y + 10 },
      end: { x: 555, y: y + 10 },
      thickness: 1,
      color: ink,
    });
    tot("Total", rs(inv.total), true);

    if (inv.notes) {
      y -= 20;
      text("NOTES", 40, y, { size: 8, f: bold, c: mute });
      inv.notes
        .split("\n")
        .slice(0, 6)
        .forEach((l, i) => text(l.slice(0, 95), 40, y - 14 - i * 13));
    }
    text("Thank you for your business.", 40, 40, { size: 9, c: mute });

    const bytes = await pdf.save();
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return { ok: true as const, filename: `${inv.invoice_number}.pdf`, base64: btoa(bin) };
  });
