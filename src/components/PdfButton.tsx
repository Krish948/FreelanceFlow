import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePdf } from "@/lib/invoice-pdf.functions";
import { Button } from "@/components/ui/button";

export function PdfButton({
  invoiceId,
  size,
  client = false,
}: {
  invoiceId: string;
  size?: "sm" | "default";
  client?: boolean;
}) {
  const gen = useServerFn(generateInvoicePdf);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await gen({ data: { invoiceId } });
      if (!r.ok) {
        toast.error(
          r.error,
          client
            ? undefined
            : { action: { label: "Upgrade", onClick: () => navigate({ to: "/pricing" }) } },
        );
        return;
      }
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.error("Couldn't create the PDF. Please try again.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size={size} variant="outline" onClick={go} disabled={busy}>
      <Download className="h-4 w-4" />
      {busy ? "Preparing…" : "PDF"}
    </Button>
  );
}
