import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/client/payments")({
  beforeLoad: () => {
    throw redirect({ to: "/client/invoices" });
  },
});
